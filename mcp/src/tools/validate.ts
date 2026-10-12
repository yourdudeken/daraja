/**
 * Minimal input validators for MCP tool handlers.
 *
 * Tools previously cast their inputs (`input.amount as number`) which let
 * missing/invalid values flow into the SDK. These helpers fail fast with a
 * clear, agent-readable message; the MCP server already converts thrown errors
 * into `isError` tool results.
 */

export function assertNumber(
  value: unknown,
  name: string,
  opts: { min?: number; max?: number } = {},
): number {
  let numeric: number;
  if (typeof value === "number") {
    numeric = value;
  } else if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    // MCP clients — notably LLMs — frequently send numbers as strings. Coerce a
    // well-formed numeric string rather than rejecting an otherwise valid call.
    numeric = Number(value.trim());
  } else {
    throw new Error(`${name} must be a number`);
  }
  if (!Number.isFinite(numeric)) {
    throw new Error(`${name} must be a number`);
  }
  if (opts.min !== undefined && numeric < opts.min) {
    throw new Error(`${name} must be >= ${opts.min}`);
  }
  if (opts.max !== undefined && numeric > opts.max) {
    throw new Error(`${name} must be <= ${opts.max}`);
  }
  return numeric;
}

export function assertNonEmptyString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value;
}

/** Kenyan MSISDN in the form 254XXXXXXXXX (e.g. 254712345678). */
export function assertMsisdn(value: unknown, name: string): string {
  const msisdn = assertNonEmptyString(value, name);
  if (!/^254\d{9}$/.test(msisdn)) {
    throw new Error(`${name} must be a Kenyan phone number in the form 254XXXXXXXXX`);
  }
  return msisdn;
}

export function assertHttpUrl(value: unknown, name: string): string {
  const url = assertNonEmptyString(value, name);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${name} must be a valid http(s) URL`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${name} must be a valid http(s) URL`);
  }
  return url;
}

export function assertEnum<T extends string>(
  value: unknown,
  name: string,
  allowed: readonly T[],
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

/** A non-null, non-array object (used for opaque operation payloads). */
export function assertRecord(value: unknown, name: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}