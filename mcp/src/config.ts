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

  const environment = (process.env.MPESA_ENVIRONMENT as "sandbox" | "production") || "sandbox";

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

  return {
    port,
    host,
    authRequired,
    authToken,
    apiKey,
    tokens,
    rateLimit: rateMax > 0 ? { windowMs: rateWindow, max: rateMax } : undefined,
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
