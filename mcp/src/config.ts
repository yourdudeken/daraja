import type { MpesaConfig } from "daraja-sdk-ts";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * The permitted MPESA_ENVIRONMENT values.
 *
 * NFR-SEC-006: validated against an explicit allow-list, reusing the pattern
 * that already exists at gateway/src/gateway/config.py:15,74-76. A TypeScript
 * `as` cast is erased at compile time and checks nothing, which is how
 * `MPESA_ENVIRONMENT=Production` used to select the production base URL.
 */
export const VALID_ENVIRONMENTS = ["sandbox", "production"] as const;
export type EnvironmentName = (typeof VALID_ENVIRONMENTS)[number];

export function parseEnvironment(raw: string | undefined): EnvironmentName {
  if (raw === undefined || raw === "") {
    return "sandbox";
  }
  // Whitespace is REJECTED, not stripped, matching gateway/config.py:15,74-76.
  // A stray space in an env file is a configuration error; silently trimming
  // it would hide the mistake, and silently accepting it would be worse.
  if (!(VALID_ENVIRONMENTS as readonly string[]).includes(raw)) {
    throw new ConfigError(
      `MPESA_ENVIRONMENT must be one of ${VALID_ENVIRONMENTS.join(", ")}, ` +
        `got ${JSON.stringify(raw)}`,
    );
  }
  return raw as EnvironmentName;
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

  // Throws ConfigError on anything outside the allow-list. This runs BEFORE
  // the config is handed to the SDK, so a bad value aborts startup and makes
  // zero network calls (NFR-SEC-006).
  const environment = parseEnvironment(process.env.MPESA_ENVIRONMENT);

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
