import { AuthenticationError, MpesaError, ValidationError } from "../errors/index.js";

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeoutMs: 30000,
};

/**
 * Whether an error means the endpoint is unhealthy (retrying may help) rather
 * than the request being wrong. Only those count toward the failure threshold: a
 * burst of legitimate 4xx errors must not open the breaker for every operation.
 *
 * Counted: a response of 5xx or the transient 408/429, plus every error that
 * carries no HTTP status at all — connection failures, timeouts and errors we
 * cannot attribute, where counting beats silently ignoring an outage. Skipped:
 * authentication/validation errors and every other status.
 */
export function isTransientFailure(error: unknown): boolean {
  if (error instanceof AuthenticationError || error instanceof ValidationError) {
    // Wrong credentials / wrong request: failing fast changes nothing.
    return false;
  }
  if (error instanceof MpesaError && typeof error.statusCode === "number") {
    const status = error.statusCode;
    return status >= 500 || status === 408 || status === 429;
  }
  return true;
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getState(): CircuitState {
    if (this.state === "open" && Date.now() - this.lastFailureTime >= this.config.timeoutMs) {
      this.state = "half-open";
      // Probe afresh: successes counted before the breaker opened must not count
      // towards closing it again after a half-open failure.
      this.successes = 0;
    }
    return this.state;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.getState() === "open") {
      throw new Error("Circuit breaker is open");
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      if (isTransientFailure(error)) {
        this.onFailure();
      }
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === "half-open") {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.reset();
      }
    } else {
      this.reset();
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = "open";
    }
  }

  private reset(): void {
    this.state = "closed";
    this.failures = 0;
    this.successes = 0;
  }
}
