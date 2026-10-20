import type { MpesaConfig } from "daraja-sdk-ts";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export interface McpServerConfig {
  port: number;
  host: string;
  authRequired: boolean;
  authToken?: string;
  apiKey?: string;
  /** Every configured credential (deduplicated). Sent as `Authorization: Bearer` or `X-API-Key`. */
  tokens: string[];
  /** Per-IP request limiting; undefined disables rate limiting. */
  rateLimit?: { windowMs: number; max: number };
  /** Maximum number of concurrent MCP sessions; 0 disables the cap. */
  maxSessions: number;
  /** Idle time (ms) after which a session is evicted and its transport closed; 0 disables. */
  sessionIdleTimeoutMs: number;
  /** Express `trust proxy` setting; undefined leaves it unset. */
  trustProxy?: boolean | number | string;
  /** Allowlist of origins/hosts for CORS/origin checks; empty means allow all (only when safe). */
  allowedOrigins?: string[];
  /** Allowlist of hosts for Host header validation. */
  allowedHosts?: string[];
}

const TRUST_PROXY_KEYWORDS = new Set(["loopback", "linklocal", "uniquelocal"]);

/** An Express `trust proxy` entry: a keyword, or an IP/CIDR subnet. Loose but
 *  rejects obvious junk (e.g. "-1", "yes", "nope"). */
function isValidTrustProxyEntry(entry: string): boolean {
  if (TRUST_PROXY_KEYWORDS.has(entry)) return true;
  return /^[0-9a-fA-F:.]+(\/\d{1,3})?$/.test(entry);
}

/**
 * Parse `MCP_TRUST_PROXY`.
 *
 * Accepted: `"false"`, a non-negative integer hop count, or a comma-separated
 * list of Express keywords / IPs / CIDR subnets (e.g. `"loopback"`,
 * `"10.0.0.0/8"`). `"true"` is deliberately rejected: it makes Express trust
 * the left-most, client-supplied `X-Forwarded-For` value, so any caller can
 * rotate `req.ip` and defeat the per-IP rate limiter that fronts the
 * money-moving tool endpoints. Configure a hop count or the proxy address
 * instead.
 */
function parseTrustProxy(value: string | undefined): false | number | string | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const v = value.trim();
  if (v === "false") return false;
  if (v === "true") {
    throw new ConfigError(
      "MCP_TRUST_PROXY=true is unsafe: it trusts client-supplied X-Forwarded-For and " +
        "therefore defeats per-IP rate limiting. Set the number of proxy hops " +
        "(e.g. MCP_TRUST_PROXY=1) or a specific address/subnet instead.",
    );
  }
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  const entries = v.split(",").map((s) => s.trim()).filter(Boolean);
  if (entries.length > 0 && entries.every(isValidTrustProxyEntry)) return v;
  throw new ConfigError(
    `MCP_TRUST_PROXY value "${v}" is invalid. Use "false", a non-negative hop count, ` +
      `or an address/keyword such as "loopback" or "10.0.0.0/8".`,
  );
}

function parseStringList(value: string | undefined): string[] | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const entries = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return entries.length > 0 ? entries : undefined;
}

function parseNonNegativeInt(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export interface ToolPolicy {
  /** When true, only read-only tools are exposed to clients. */
  readOnly: boolean;
  /** When set, only the listed tools are exposed (intersected with readOnly). */
  allowedTools?: string[];
}

export function loadConfig(): MpesaConfig {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey) {
    throw new ConfigError("MPESA_CONSUMER_KEY environment variable is required");
  }
  if (!consumerSecret) {
    throw new ConfigError("MPESA_CONSUMER_SECRET environment variable is required");
  }

  // Normalize the way the SDK resolves its base URL: only "sandbox" (case- and
  // whitespace-insensitive) selects the sandbox host; an unset/empty value
  // defaults to sandbox, and every other value is production. Without this,
  // e.g. MPESA_ENVIRONMENT=Production would point the SDK at the live host
  // while the tool policy still believed it was sandbox.
  const rawEnvironment = (process.env.MPESA_ENVIRONMENT ?? "").trim().toLowerCase();
  const environment: "sandbox" | "production" =
    rawEnvironment === "" || rawEnvironment === "sandbox" ? "sandbox" : "production";

  const config: MpesaConfig = {
    consumerKey,
    consumerSecret,
    environment,
  };

  if (process.env.MPESA_PASSKEY) {
    config.passkey = process.env.MPESA_PASSKEY;
  }
  if (process.env.MPESA_INITIATOR_NAME) {
    config.initiatorName = process.env.MPESA_INITIATOR_NAME;
  }
  if (process.env.MPESA_INITIATOR_PASSWORD) {
    config.initiatorPassword = process.env.MPESA_INITIATOR_PASSWORD;
  }
  if (process.env.MPESA_SECURITY_CREDENTIAL) {
    config.securityCredential = process.env.MPESA_SECURITY_CREDENTIAL;
  }
  if (process.env.MPESA_TIMEOUT) {
    config.timeout = parseInt(process.env.MPESA_TIMEOUT, 10);
  }

  return config;
}

export function loadMcpServerConfig(): McpServerConfig {
  const port = parseInt(process.env.MCP_PORT || "3999", 10);
  const host = process.env.MCP_HOST || "127.0.0.1";
  const authRequired = process.env.MCP_AUTH_REQUIRED !== "false";
  const authToken = process.env.MCP_AUTH_TOKEN || process.env.MCP_API_KEY;
  const apiKey = process.env.MCP_API_KEY || process.env.MCP_AUTH_TOKEN;
  const extraTokens = (process.env.MCP_AUTH_TOKENS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const tokens = [...new Set([authToken, apiKey, ...extraTokens].filter((t): t is string => Boolean(t)))];

  // Fail fast instead of starting a server where every request returns 401.
  if (authRequired && tokens.length === 0) {
    throw new ConfigError(
      "MCP_AUTH_REQUIRED is true (the default) but no credential is configured. " +
        "Set MCP_AUTH_TOKEN, MCP_API_KEY, or MCP_AUTH_TOKENS — or set MCP_AUTH_REQUIRED=false " +
        "for local development only (not recommended).",
    );
  }

  const rateMax = parseInt(process.env.MCP_RATE_LIMIT_MAX || "300", 10);
  const rateWindow = parseInt(process.env.MCP_RATE_LIMIT_WINDOW_MS || "60000", 10);

  const maxSessions = parseNonNegativeInt(process.env.MCP_MAX_SESSIONS, 100);
  const sessionIdleTimeoutMs = parseNonNegativeInt(
    process.env.MCP_SESSION_IDLE_TIMEOUT_MS,
    30 * 60_000,
  );
  const trustProxy = parseTrustProxy(process.env.MCP_TRUST_PROXY);
  const allowedOrigins = parseStringList(process.env.MCP_ALLOWED_ORIGINS);
  const allowedHosts = parseStringList(process.env.MCP_ALLOWED_HOSTS);

  return {
    port,
    host,
    authRequired,
    authToken,
    apiKey,
    tokens,
    rateLimit: rateMax > 0 ? { windowMs: rateWindow, max: rateMax } : undefined,
    maxSessions,
    sessionIdleTimeoutMs,
    trustProxy,
    allowedOrigins,
    allowedHosts,
  };
}

export function loadToolPolicy(): ToolPolicy {
  const readOnly = process.env.MCP_READONLY_MODE === "true";
  const allowed = (process.env.MCP_ALLOWED_TOOLS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { readOnly, allowedTools: allowed.length > 0 ? allowed : undefined };
}
