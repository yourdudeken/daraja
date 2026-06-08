import { publicEncrypt } from "node:crypto";
import type { Logger } from "../types/index.js";
import { ValidationError } from "../errors/index.js";
export { StructuredLogger } from "./structured-logger.js";
export type { StructuredLoggerConfig, LogLevel } from "./structured-logger.js";

export function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export function generatePassword(
  shortcode: number | string,
  passkey: string,
  timestamp: string,
): string {
  const toEncode = `${shortcode}${passkey}${timestamp}`;
  return Buffer.from(toEncode).toString("base64");
}

export function generateSecurityCredential(
  password: string,
  certificate: string,
): string {
  const certBuffer = Buffer.from(certificate);
  const encrypted = publicEncrypt(certBuffer, Buffer.from(password));
  return encrypted.toString("base64");
}

export function maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    "consumerKey",
    "consumerSecret",
    "Password",
    "SecurityCredential",
    "InitiatorPassword",
    "passkey",
    "securityCredential",
    "initiatorPassword",
  ];
  const masked = { ...data };
  for (const key of sensitiveKeys) {
    if (key in masked) {
      const val = String(masked[key]);
      if (val.length > 4) {
        masked[key] = `${val.slice(0, 4)}****`;
      } else {
        masked[key] = "****";
      }
    }
  }
  return masked;
}

export function isPhoneNumberValid(phone: number | string): boolean {
  const str = String(phone);
  return /^2547\d{8}$/.test(str);
}

export function formatPhoneNumber(
  phone: number | string,
): string {
  let str = String(phone).replace(/^0+/, "");
  if (str.startsWith("7")) {
    str = `254${str}`;
  } else if (str.startsWith("+254")) {
    str = str.slice(1);
  }
  return str;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `mpesa-${timestamp}-${random}`;
}

export function calculateBackoff(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const exponential = baseDelayMs * 2 ** attempt;
  const jitter = Math.random() * 100;
  return Math.min(exponential + jitter, maxDelayMs);
}

export const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

export function createConsoleLogger(name = "mpesa-sdk"): Logger {
  return {
    debug: (msg, meta) => console.debug(`[${name}] DEBUG: ${msg}`, meta ?? ""),
    info: (msg, meta) => console.info(`[${name}] INFO: ${msg}`, meta ?? ""),
    warn: (msg, meta) => console.warn(`[${name}] WARN: ${msg}`, meta ?? ""),
    error: (msg, meta) => console.error(`[${name}] ERROR: ${msg}`, meta ?? ""),
  };
}

export class Validation {
  static requiredString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new ValidationError(`${field} is required and must be a non-empty string`);
    }
    return value.trim();
  }

  static requiredNumber(value: unknown, field: string): number {
    if (typeof value !== "number" || isNaN(value)) {
      throw new ValidationError(`${field} is required and must be a valid number`);
    }
    return value;
  }

  static positiveNumber(value: unknown, field: string): number {
    const num = Validation.requiredNumber(value, field);
    if (num <= 0) {
      throw new ValidationError(`${field} must be a positive number`);
    }
    return num;
  }

  static optionalString(value: unknown): string | undefined {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
    return undefined;
  }

  static validUrl(value: unknown, field: string): string {
    const str = Validation.requiredString(value, field);
    try {
      new URL(str);
    } catch {
      throw new ValidationError(`${field} must be a valid URL`);
    }
    return str;
  }

  static phoneNumber(value: unknown, field: string): number {
    const num = Validation.requiredNumber(value, field);
    if (!/^2547\d{8}$/.test(String(num))) {
      throw new ValidationError(`${field} must be a valid Safaricom phone number (2547XXXXXXXX)`);
    }
    return num;
  }

  static maxLength(value: unknown, field: string, max: number): string {
    const str = Validation.requiredString(value, field);
    if (str.length > max) {
      throw new ValidationError(`${field} exceeds maximum length of ${max}`);
    }
    return str;
  }

  static oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
    if (!allowed.includes(value as T)) {
      throw new ValidationError(`${field} must be one of: ${allowed.join(", ")}`);
    }
    return value as T;
  }

  static amount(value: unknown, field: string, min = 1, max = 250000): number {
    const num = Validation.positiveNumber(value, field);
    if (num < min || num > max) {
      throw new ValidationError(`${field} must be between ${min} and ${max}`);
    }
    return num;
  }
}

export type { MetricsCollector, MpesaMetrics } from "./metrics.js";
export {
  NoopMetricsCollector,
  PrometheusMetricsCollector,
  createMpesaMetrics,
} from "./metrics.js";
export type { Tracer, TelemetrySpan } from "../types/index.js";
export {
  NoopTracer,
  NoopSpan,
  OpenTelemetryTracer,
  createTracer,
  withSpan,
  withSpanSync,
} from "./tracing.js";
export type { IdempotencyStore } from "./idempotency.js";
export {
  InMemoryIdempotencyStore,
  generateIdempotencyKey,
} from "./idempotency.js";
export type { SharedTokenCache } from "./token-cache.js";
export {
  InMemorySharedTokenCache,
  RedisTokenCache,
  buildTokenCacheKey,
} from "./token-cache.js";
