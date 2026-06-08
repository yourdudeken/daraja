import { trace, type Attributes, Span as OTelSpan, SpanStatusCode } from "@opentelemetry/api";
import type { Logger, TelemetrySpan, Tracer } from "../types/index.js";

export class NoopSpan implements TelemetrySpan {
  end(): void {}
  setAttribute(_key: string, _value: string | number | boolean): void {}
  addEvent(_name: string, _attributes?: Record<string, unknown>): void {}
  recordException(_error: unknown): void {}
  setStatus(_code: string, _message?: string): void {}
}

export class NoopTracer implements Tracer {
  startSpan(): TelemetrySpan {
    return new NoopSpan();
  }
}

class OTelTelemetrySpan implements TelemetrySpan {
  constructor(private readonly span: OTelSpan) {}

  end(): void {
    this.span.end();
  }

  setAttribute(key: string, value: string | number | boolean): void {
    this.span.setAttribute(key, value);
  }

  addEvent(name: string, attributes?: Record<string, unknown>): void {
    this.span.addEvent(name, attributes as Attributes);
  }

  recordException(error: unknown): void {
    this.span.recordException(error as { message: string });
  }

  setStatus(code: string, message?: string): void {
    if (code === "error") {
      this.span.setStatus({ code: SpanStatusCode.ERROR, message });
    } else {
      this.span.setStatus({ code: SpanStatusCode.OK });
    }
  }
}

export class OpenTelemetryTracer implements Tracer {
  private readonly tracer: ReturnType<typeof trace.getTracer>;

  constructor(name = "mpesa-sdk", version = "0.2.0") {
    this.tracer = trace.getTracer(name, version);
  }

  startSpan(name: string, attributes?: Record<string, string>): TelemetrySpan {
    const span = this.tracer.startSpan(name, {
      attributes: attributes as Record<string, string>,
    });
    return new OTelTelemetrySpan(span);
  }
}

export function createTracer(_logger?: Logger): Tracer {
  return new OpenTelemetryTracer();
}

export async function withSpan<T>(
  tracer: Tracer,
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string>,
): Promise<T> {
  const span = tracer.startSpan(name, attributes);
  try {
    const result = await fn();
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus("error", error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    span.end();
  }
}

export async function withSpanSync<T>(
  tracer: Tracer,
  name: string,
  fn: () => T,
  attributes?: Record<string, string>,
): Promise<T> {
  const span = tracer.startSpan(name, attributes);
  try {
    return fn();
  } catch (error) {
    span.recordException(error);
    span.setStatus("error", error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    span.end();
  }
}
