/**
 * Structured audit trail for MCP tool calls.
 *
 * Every tool invocation is written as a single JSON line to stderr (the same
 * stream the server already uses for its own messages) so it can be captured
 * by the process supervisor / log collector. Secrets and personal data are
 * redacted before anything is emitted: credentials are fully removed and
 * phone numbers / MSISDNs are partially masked.
 */

/** Keys whose values are secrets and must be fully removed. */
const SECRET_KEY_RE =
  /(password|secret|credential|token|apikey|api_key|authorization|passkey|consumer)/i;

/** Keys whose values are personal data (phone numbers, government IDs). */
const PII_KEY_RE = /(phone|msisdn|customer|receiver|idnumber|id_number|idtype|id_type)/i;

const MSISDN_RE = /^254\d{9}$/;

function maskMsisdn(value: string): string {
  // Keep the country code + first digit and the last two digits, mask the middle.
  return value.slice(0, 4) + "*".repeat(value.length - 6) + value.slice(-2);
}

export function redact(value: unknown, key = ""): unknown {
  if (typeof value === "string") {
    if (SECRET_KEY_RE.test(key)) return "[REDACTED]";
    // Mask MSISDN-shaped values first so partially identifiable phone
    // numbers are still useful for correlation while staying unreadable.
    if (MSISDN_RE.test(value)) return maskMsisdn(value);
    if (PII_KEY_RE.test(key)) return "[REDACTED]";
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, key));
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = redact(v, k);
    return out;
  }
  return value;
}

export interface ToolCallAudit {
  tool: string;
  args: Record<string, unknown>;
  status: "ok" | "error";
  durationMs: number;
  error?: string;
}

export function logToolCall(audit: ToolCallAudit): void {
  const entry = {
    timestamp: new Date().toISOString(),
    event: "tool.call",
    tool: audit.tool,
    status: audit.status,
    durationMs: audit.durationMs,
    args: redact(audit.args),
    ...(audit.error !== undefined ? { error: audit.error } : {}),
  };
  console.error(JSON.stringify(entry));
}