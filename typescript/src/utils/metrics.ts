import promClient from "prom-client";

export interface MetricsCollector {
  incrementCounter(name: string, labels?: Record<string, string>): void;
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void;
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
}

export class NoopMetricsCollector implements MetricsCollector {
  incrementCounter() {}
  observeHistogram() {}
  setGauge() {}
}

export class PrometheusMetricsCollector implements MetricsCollector {
  private counters = new Map<string, promClient.Counter<string>>();
  private histograms = new Map<string, promClient.Histogram<string>>();
  private gauges = new Map<string, promClient.Gauge<string>>();
  private defaultLabels: Record<string, string>;

  constructor(options?: { prefix?: string; defaultLabels?: Record<string, string> }) {
    const prefix = options?.prefix ?? "mpesa_";
    this.defaultLabels = options?.defaultLabels ?? {};
    promClient.register.setDefaultLabels(this.defaultLabels);

    this.counters.set("requests_total", new promClient.Counter({
      name: `${prefix}requests_total`,
      help: "Total number of API requests",
      labelNames: ["operation", "environment", "status_code"],
    }));
    this.counters.set("requests_success_total", new promClient.Counter({
      name: `${prefix}requests_success_total`,
      help: "Successful requests",
      labelNames: ["operation", "environment"],
    }));
    this.counters.set("requests_failed_total", new promClient.Counter({
      name: `${prefix}requests_failed_total`,
      help: "Failed requests",
      labelNames: ["operation", "environment", "error_code"],
    }));
    this.histograms.set("request_duration_seconds", new promClient.Histogram({
      name: `${prefix}request_duration_seconds`,
      help: "Request duration distribution",
      labelNames: ["operation", "environment"],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    }));
    this.counters.set("token_refreshes_total", new promClient.Counter({
      name: `${prefix}token_refreshes_total`,
      help: "Total OAuth token refreshes",
      labelNames: ["status"],
    }));
    this.gauges.set("circuit_breaker_state", new promClient.Gauge({
      name: `${prefix}circuit_breaker_state`,
      help: "Circuit breaker state (0=closed, 1=open, 2=half-open)",
      labelNames: ["service"],
    }));
    this.counters.set("circuit_breaker_failures_total", new promClient.Counter({
      name: `${prefix}circuit_breaker_failures_total`,
      help: "Total circuit breaker failures",
      labelNames: ["service"],
    }));
    this.counters.set("retry_attempts_total", new promClient.Counter({
      name: `${prefix}retry_attempts_total`,
      help: "Total retry attempts",
      labelNames: ["operation"],
    }));
    this.counters.set("retry_success_total", new promClient.Counter({
      name: `${prefix}retry_success_total`,
      help: "Successful retries",
      labelNames: ["operation"],
    }));
    this.counters.set("errors_total", new promClient.Counter({
      name: `${prefix}errors_total`,
      help: "Total errors",
      labelNames: ["error_type", "operation"],
    }));
    this.counters.set("api_errors_total", new promClient.Counter({
      name: `${prefix}api_errors_total`,
      help: "API-specific errors",
      labelNames: ["error_code", "operation"],
    }));
    this.counters.set("network_errors_total", new promClient.Counter({
      name: `${prefix}network_errors_total`,
      help: "Network errors",
      labelNames: ["operation"],
    }));
    this.counters.set("webhook_processed_total", new promClient.Counter({
      name: `${prefix}webhook_processed_total`,
      help: "Total webhooks processed",
      labelNames: ["webhook_type"],
    }));
    this.counters.set("webhook_success_total", new promClient.Counter({
      name: `${prefix}webhook_success_total`,
      help: "Successful webhooks",
      labelNames: ["webhook_type"],
    }));
    this.counters.set("webhook_failed_total", new promClient.Counter({
      name: `${prefix}webhook_failed_total`,
      help: "Failed webhooks",
      labelNames: ["webhook_type"],
    }));
    this.counters.set("webhook_retried_total", new promClient.Counter({
      name: `${prefix}webhook_retried_total`,
      help: "Webhooks that were retried",
      labelNames: ["webhook_type"],
    }));
    this.counters.set("webhook_dlq_total", new promClient.Counter({
      name: `${prefix}webhook_dlq_total`,
      help: "Webhooks moved to DLQ",
      labelNames: ["webhook_type"],
    }));
    this.gauges.set("webhook_dlq_items", new promClient.Gauge({
      name: `${prefix}webhook_dlq_items`,
      help: "Current DLQ item count",
      labelNames: [],
    }));
  }

  incrementCounter(name: string, labels?: Record<string, string>): void {
    const counter = this.counters.get(name);
    if (counter) {
      counter.inc(labels ?? {});
    }
  }

  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const histogram = this.histograms.get(name);
    if (histogram) {
      histogram.observe(labels ?? {}, value);
    }
  }

  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      gauge.set(labels ?? {}, value);
    }
  }

  getContentType(): string {
    return promClient.register.contentType;
  }

  async metrics(): Promise<string> {
    return promClient.register.metrics();
  }
}

export interface MpesaMetrics {
  requestsTotal: MetricsCollector;
  requestDuration: MetricsCollector;
  errorsTotal: MetricsCollector;
  tokenRefreshes: MetricsCollector;
  circuitBreakerState: MetricsCollector;
}

export function createMpesaMetrics(collector?: MetricsCollector): MpesaMetrics {
  const c = collector ?? new NoopMetricsCollector();
  return {
    requestsTotal: c,
    requestDuration: c,
    errorsTotal: c,
    tokenRefreshes: c,
    circuitBreakerState: c,
  };
}
