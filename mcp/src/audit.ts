/**
 * Structured audit trail for MCP tool calls.
 *
 * Every tool invocation is written as a single JSON line to stderr (the same
 * stream the server already uses for its own messages) so it can be captured
 * by the process supervisor / log collector.
 *
 * Redaction follows the shared policy, kept behaviourally equivalent to
 * the Python redactor (`sdks/python/src/daraja/utils/redaction.py`) and verified
 * by the shared fixture `sdks/python/tests/fixtures/redaction_cases.json`:
 *
 * - A **secret key** redacts its **entire subtree** (object, array, string or
 *   number) to `"[REDACTED]"` — nesting no longer leaks the value.
 * - A **PII key** redacts non-string values and non-MSISDN strings; MSISDN-shaped
 *   values are partially masked so they stay correlatable.
 * - Any other string is scrubbed of inline `key=value` / `key: value` secret
 *   pairs (including quoted JSON keys), `Bearer`/`Basic` credentials and
 *   embedded MSISDNs (error strings / free text).
 * - Recursion is depth-bounded so redaction is safe on hot paths.
 *
 * Residual gap: a bare high-entropy secret with no key label and no recognisable
 * prefix cannot be detected reliably; such values must not be logged at all.
 */

// Key names that denote a secret. Also used inside the free-text pair regex.
const SECRET_NAMES = "password|secret|credential|token|api[-_]?key|authorization|passkey|consumer";

/** Keys whose values are secrets and whose whole subtree must be removed. */
const SECRET_KEY_RE = new RegExp(SECRET_NAMES, "i");

/** Keys whose values are personal data (phone numbers, government IDs). */
const PII_KEY_RE =
  /(phone|msisdn|customer|receiver|idnumber|id_number|idtype|id_type|account|accountnumber|account_no|accountholder|email|emailaddress|nationalid|passport|transaction|transactionid|transid|mpesareceipt|receipt|referencenumber|referenceno|shortcode|businessshortcode|paybill|till|organization|orgname|merchant|party|partya|partyb)/i;

// JS `$` does not match before a trailing newline, and the Python side uses
// `\A...\Z`, so both agree on newline-terminated input. `[0-9]` (not `\d`) keeps
// the two implementations literally equivalent: JS `\d` is ASCII-only whereas
// Python's is Unicode-aware.
const MSISDN_RE = /^254[0-9]{9}$/;

// Inline `secretKey=value` / `secretKey: value` pairs, including quoted JSON keys
// and values (e.g. `"consumerSecret":"abc"`).
const SECRET_PAIR_RE = new RegExp(
  `(${SECRET_NAMES})\\s*["']?\\s*[:=]\\s*["']?([^\\s,;"'&]+)`,
  "gi",
);
// `Bearer <token>` / `Basic <token>` credentials inside free text.
const AUTH_SCHEME_RE = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/-]+/gi;
const MSISDN_INLINE_RE = /(?<![0-9])254[0-9]{9}(?![0-9])/g;

const MAX_DEPTH = 32;

function maskMsisdn(value: string): string {
  // Keep the country code + first digit and the last two digits, mask the middle.
  return value.slice(0, 4) + "*".repeat(value.length - 6) + value.slice(-2);
}

/** Remove inline secrets and mask embedded MSISDNs in free text. */
export function scrubSecrets(value: string): string {
  return value
    .replace(AUTH_SCHEME_RE, "$1 [REDACTED]")
    .replace(SECRET_PAIR_RE, "$1=[REDACTED]")
    .replace(MSISDN_INLINE_RE, (match) => maskMsisdn(match));
}

export function redact(value: unknown, key = "", depth = 0): unknown {
  if (SECRET_KEY_RE.test(key)) return "[REDACTED]";
  if (depth > MAX_DEPTH) return "[REDACTED]";

  if (typeof value === "string") {
    // Mask MSISDN-shaped values first so partially identifiable phone
    // numbers are still useful for correlation while staying unreadable.
    if (MSISDN_RE.test(value)) return maskMsisdn(value);
    if (PII_KEY_RE.test(key)) return "[REDACTED]";
    return scrubSecrets(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return PII_KEY_RE.test(key) ? "[REDACTED]" : value;
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, key, depth + 1));
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = redact(v, k, depth + 1);
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
    // Error strings are scrubbed for inline secrets / embedded MSISDNs.
    ...(audit.error !== undefined ? { error: scrubSecrets(audit.error) } : {}),
  };
  console.error(JSON.stringify(entry));
}