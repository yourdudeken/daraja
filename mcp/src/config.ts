import type { MpesaConfig } from "@daraja-sdk/ts";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
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
