export abstract class MpesaError extends Error {
  public readonly statusCode?: number;
  public readonly requestId?: string;
  public readonly rawResponse?: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      requestId?: string;
      rawResponse?: unknown;
      cause?: Error;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
    this.statusCode = options?.statusCode;
    this.requestId = options?.requestId;
    this.rawResponse = options?.rawResponse;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      requestId: this.requestId,
      rawResponse: this.rawResponse,
      stack: this.stack,
    };
  }
}

export class AuthenticationError extends MpesaError {
  constructor(
    message = "Authentication failed. Check your consumer key and secret.",
    options?: { statusCode?: number; requestId?: string; rawResponse?: unknown; cause?: Error },
  ) {
    super(message, options);
  }
}

export class ValidationError extends MpesaError {
  constructor(
    message = "Request validation failed.",
    options?: { statusCode?: number; requestId?: string; rawResponse?: unknown; cause?: Error },
  ) {
    super(message, options);
  }
}

export class TimeoutError extends MpesaError {
  constructor(
    message = "Request timed out.",
    options?: { statusCode?: number; requestId?: string; rawResponse?: unknown; cause?: Error },
  ) {
    super(message, options);
  }
}

export class APIConnectionError extends MpesaError {
  constructor(
    message = "Failed to connect to M-Pesa API.",
    options?: { statusCode?: number; requestId?: string; rawResponse?: unknown; cause?: Error },
  ) {
    super(message, options);
  }
}

export class RateLimitError extends MpesaError {
  public readonly retryAfter?: number;

  constructor(
    message = "Rate limit exceeded.",
    options?: {
      statusCode?: number;
      requestId?: string;
      rawResponse?: unknown;
      retryAfter?: number;
      cause?: Error;
    },
  ) {
    super(message, options);
    this.retryAfter = options?.retryAfter;
  }
}

export class MpesaAPIError extends MpesaError {
  public readonly errorCode?: string;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      errorCode?: string;
      requestId?: string;
      rawResponse?: unknown;
      cause?: Error;
    },
  ) {
    super(message, options);
    this.errorCode = options?.errorCode;
  }
}

export class WebhookVerificationError extends MpesaError {
  constructor(
    message = "Webhook signature verification failed.",
    options?: { statusCode?: number; requestId?: string; rawResponse?: unknown; cause?: Error },
  ) {
    super(message, options);
  }
}

export function isMpesaError(error: unknown): error is MpesaError {
  return error instanceof MpesaError;
}
