import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  generateTimestamp,
  generatePassword,
  maskSensitiveData,
  isPhoneNumberValid,
  formatPhoneNumber,
  calculateBackoff,
} from "../../src/utils/index.js";
import {
  InMemorySharedTokenCache,
  RedisTokenCache,
  buildTokenCacheKey,
} from "../../src/utils/token-cache.js";
import { EncryptedTokenStore } from "../../src/utils/token-store.js";
import { createHealthCheck } from "../../src/utils/health.js";
import {
  NoopMetricsCollector,
  PrometheusMetricsCollector,
  createMpesaMetrics,
} from "../../src/utils/metrics.js";
import { executeBatch } from "../../src/utils/batch.js";
import { createAuditLogger, auditLog } from "../../src/utils/audit.js";
import {
  TokenBucketRateLimiter,
  NoopRateLimiter,
  EndpointRateLimiterRouter,
  normalizeEndpointKey,
} from "../../src/utils/rate-limiter.js";
import { StructuredLogger } from "../../src/utils/structured-logger.js";
import { getCertificate } from "../../src/utils/certificates.js";
import { CircuitBreaker } from "../../src/utils/circuit-breaker.js";
import {
  InMemoryIdempotencyStore,
  generateIdempotencyKey,
} from "../../src/utils/idempotency.js";
import {
  NoopTracer,
  NoopSpan,
  OpenTelemetryTracer,
  createTracer,
  withSpan,
  withSpanSync,
} from "../../src/utils/tracing.js";
import { MpesaApiClient } from "../../src/client/client.js";

describe("Utils", () => {
  describe("generateTimestamp", () => {
    it("should generate a 14-digit timestamp", () => {
      const ts = generateTimestamp();
      expect(ts).toMatch(/^\d{14}$/);
    });
  });

  describe("generatePassword", () => {
    it("should base64 encode shortcode+passkey+timestamp", () => {
      const password = generatePassword(174379, "passkey123", "20210628092408");
      const decoded = Buffer.from(password, "base64").toString();
      expect(decoded).toBe("174379passkey12320210628092408");
    });
  });

  describe("maskSensitiveData", () => {
    it("should mask sensitive fields", () => {
      const data = {
        consumerKey: "abc12345",
        Password: "secretpassword",
        otherField: "visible",
      };
      const masked = maskSensitiveData(data);
      expect(masked.consumerKey).toMatch(/^abc1/);
      expect(masked.consumerKey).toContain("****");
      expect(masked.otherField).toBe("visible");
    });
  });

  describe("isPhoneNumberValid", () => {
    it("should validate correct phone numbers", () => {
      expect(isPhoneNumberValid(254722000000)).toBe(true);
      expect(isPhoneNumberValid("254722111111")).toBe(true);
    });

    it("should reject invalid phone numbers", () => {
      expect(isPhoneNumberValid("0712345678")).toBe(false);
      expect(isPhoneNumberValid("123")).toBe(false);
    });
  });

  describe("formatPhoneNumber", () => {
    it("should format phone numbers correctly", () => {
      expect(formatPhoneNumber("0712345678")).toBe("254712345678");
      expect(formatPhoneNumber("254712345678")).toBe("254712345678");
      expect(formatPhoneNumber("712345678")).toBe("254712345678");
    });
  });

  describe("calculateBackoff", () => {
    it("should calculate exponential backoff", () => {
      const backoff = calculateBackoff(1, 1000, 30000);
      expect(backoff).toBeGreaterThanOrEqual(1000 * 2);
      expect(backoff).toBeLessThanOrEqual(30000);
    });
  });
});

describe("InMemorySharedTokenCache", () => {
  let cache: InMemorySharedTokenCache;

  beforeEach(() => {
    cache = new InMemorySharedTokenCache();
  });

  afterEach(() => {
    cache.dispose();
  });

  it("returns null for missing key", async () => {
    expect(await cache.get("missing")).toBeNull();
  });

  it("stores and retrieves tokens", async () => {
    await cache.set("key-1", "token-1", 60);
    expect(await cache.get("key-1")).toBe("token-1");
  });

  it("expires tokens after TTL", async () => {
    await cache.set("key-1", "token-1", 0);
    expect(await cache.get("key-1")).toBeNull();
  });

  it("dispose clears the cache", async () => {
    await cache.set("key-1", "token-1", 60);
    cache.dispose();
    expect(await cache.get("key-1")).toBeNull();
  });
});

describe("RedisTokenCache", () => {
  it("buildTokenCacheKey formats the key", () => {
    expect(buildTokenCacheKey("consumer-key")).toBe("mpesa:token:consumer-key");
  });

  it("returns null when redis is unavailable", async () => {
    const cache = new RedisTokenCache("redis://localhost:1");
    // Wait for init to fail
    await new Promise((r) => setTimeout(r, 50));
    expect(await cache.get("key")).toBeNull();
    await cache.set("key", "token", 60);
    await cache.disconnect();
  });
});

describe("EncryptedTokenStore", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "token-store-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("saves and loads a token round-trip", () => {
    const filePath = join(dir, "token.json");
    const store = new EncryptedTokenStore({ filePath, encryptionKey: "secret-key" });
    const expiresAt = new Date(Date.now() + 3600_000);
    store.save("my-token", expiresAt);
    const loaded = store.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.token).toBe("my-token");
    expect(loaded!.expiresAt.toISOString()).toBe(expiresAt.toISOString());
  });

  it("returns null when file does not exist", () => {
    const store = new EncryptedTokenStore({
      filePath: join(dir, "missing.json"),
      encryptionKey: "secret-key",
    });
    expect(store.load()).toBeNull();
  });

  it("returns null on corrupted data", () => {
    const filePath = join(dir, "corrupt.json");
    writeFileSync(filePath, "not-json");
    const store = new EncryptedTokenStore({ filePath, encryptionKey: "secret-key" });
    expect(store.load()).toBeNull();
  });

  it("clear empties the file", () => {
    const filePath = join(dir, "token.json");
    const store = new EncryptedTokenStore({ filePath, encryptionKey: "secret-key" });
    store.save("my-token", new Date(Date.now() + 3600_000));
    store.clear();
    expect(readFileSync(filePath, "utf8")).toBe("");
  });

  it("clear does not throw when file missing", () => {
    const store = new EncryptedTokenStore({
      filePath: join(dir, "missing.json"),
      encryptionKey: "secret-key",
    });
    expect(() => store.clear()).not.toThrow();
  });
});

describe("createHealthCheck", () => {
  it("returns healthy when token acquisition succeeds", async () => {
    const client = {
      getAccessToken: vi.fn().mockResolvedValue("token"),
    } as unknown as MpesaApiClient;
    const result = await createHealthCheck(client);
    expect(result.status).toBe("healthy");
    expect(result.tokenOk).toBe(true);
    expect(result.version).toBeDefined();
    expect(result.timestamp).toBeDefined();
  });

  it("returns degraded when token acquisition fails", async () => {
    const client = {
      getAccessToken: vi.fn().mockRejectedValue(new Error("auth failed")),
    } as unknown as MpesaApiClient;
    const result = await createHealthCheck(client);
    expect(result.status).toBe("degraded");
    expect(result.tokenOk).toBe(false);
  });
});

describe("MetricsCollectors", () => {
  it("NoopMetricsCollector does nothing without throwing", () => {
    const collector = new NoopMetricsCollector();
    expect(() => {
      collector.incrementCounter("x");
      collector.observeHistogram("x", 1);
      collector.setGauge("x", 1);
    }).not.toThrow();
  });

  it("PrometheusMetricsCollector increments counters", () => {
    const collector = new PrometheusMetricsCollector({ prefix: "test_" });
    collector.incrementCounter("requests_total", { operation: "stk", environment: "sandbox", status_code: "200" });
    collector.incrementCounter("requests_success_total", { operation: "stk", environment: "sandbox" });
    collector.incrementCounter("requests_failed_total", { operation: "stk", environment: "sandbox", error_code: "500" });
    collector.observeHistogram("request_duration_seconds", 0.5, { operation: "stk", environment: "sandbox" });
    collector.setGauge("circuit_breaker_state", 1, { service: "stk" });
    expect(collector.getContentType()).toContain("text/plain");
  });

  it("PrometheusMetricsCollector ignores unknown metric names", () => {
    const collector = new PrometheusMetricsCollector();
    expect(() => collector.incrementCounter("unknown_metric")).not.toThrow();
  });

  it("createMpesaMetrics wires the collector", () => {
    const collector = new NoopMetricsCollector();
    const metrics = createMpesaMetrics(collector);
    expect(metrics.requestsTotal).toBe(collector);
    expect(metrics.requestDuration).toBe(collector);
    expect(metrics.errorsTotal).toBe(collector);
    expect(metrics.tokenRefreshes).toBe(collector);
    expect(metrics.circuitBreakerState).toBe(collector);
  });

  it("createMpesaMetrics defaults to NoopMetricsCollector", () => {
    const metrics = createMpesaMetrics();
    expect(metrics.requestsTotal).toBeInstanceOf(NoopMetricsCollector);
  });
});

describe("executeBatch", () => {
  it("executes POST and GET requests in chunks", async () => {
    const post = vi.fn().mockResolvedValue({ ok: true });
    const get = vi.fn().mockResolvedValue({ ok: true });
    const client = { post, get } as unknown as MpesaApiClient;
    const results = await executeBatch(client, [
      { method: "POST", url: "/a", data: { x: 1 } },
      { method: "GET", url: "/b" },
      { method: "POST", url: "/c", data: { y: 2 } },
    ], 2);
    expect(results).toHaveLength(3);
    expect(post).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenCalledTimes(1);
  });
});

describe("AuditLogger", () => {
  it("createAuditLogger wraps a logger and adds audit method", () => {
    const info = vi.fn();
    const logger = { debug: vi.fn(), info, warn: vi.fn(), error: vi.fn() };
    const audit = createAuditLogger(logger);
    audit.audit("payment.created", { amount: 100 });
    expect(info).toHaveBeenCalledWith(
      "[AUDIT] payment.created",
      expect.objectContaining({ audit: true, audit_event: "payment.created" }),
    );
  });

  it("auditLog logs an audit event", () => {
    const info = vi.fn();
    const logger = { debug: vi.fn(), info, warn: vi.fn(), error: vi.fn() };
    auditLog(logger, "payment.created", { amount: 100 });
    expect(info).toHaveBeenCalledWith(
      "[AUDIT] payment.created",
      expect.objectContaining({ audit: true }),
    );
  });
});

describe("RateLimiters", () => {
  it("TokenBucketRateLimiter allows burst then blocks", () => {
    const limiter = new TokenBucketRateLimiter({ tokensPerSecond: 1, burstSize: 2 });
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
  });

  it("TokenBucketRateLimiter refills over time", async () => {
    // tokensPerSecond: 10 (a token refills every 100ms) so the two immediate
    // tryAcquire calls are deterministic regardless of machine load — with
    // tokensPerSecond: 1000 the bucket refills after ~1ms, which races with
    // the second assertion on loaded CI runners.
    const limiter = new TokenBucketRateLimiter({ tokensPerSecond: 10, burstSize: 1 });
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
    await new Promise((r) => setTimeout(r, 1100));
    expect(limiter.tryAcquire()).toBe(true);
  });

  it("TokenBucketRateLimiter acquire waits for tokens", async () => {
    const limiter = new TokenBucketRateLimiter({ tokensPerSecond: 10, burstSize: 1 });
    limiter.tryAcquire();
    const start = Date.now();
    await limiter.acquire();
    expect(Date.now() - start).toBeGreaterThanOrEqual(90);
  });

  it("NoopRateLimiter always allows", async () => {
    const limiter = new NoopRateLimiter();
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.available()).toBe(Infinity);
    await expect(limiter.acquire()).resolves.toBeUndefined();
  });

  it("EndpointRateLimiterRouter routes by endpoint prefix", () => {
    const router = new EndpointRateLimiterRouter({
      tokensPerSecond: 1,
      burstSize: 1,
      endpointOverrides: {
        "/mpesa/stkpush": { tokensPerSecond: 10, burstSize: 10 },
      },
    });
    expect(router.tryAcquire("/mpesa/stkpush/v1/processrequest")).toBe(true);
    expect(router.tryAcquire("/mpesa/stkpush/v1/processrequest")).toBe(true);
    expect(router.tryAcquire("/other")).toBe(true);
    expect(router.tryAcquire("/other")).toBe(false);
  });

  it("normalizeEndpointKey normalizes URLs", () => {
    expect(normalizeEndpointKey("https://api.safaricom.co.ke/mpesa/")).toBe(
      "api.safaricom.co.ke/mpesa",
    );
  });
});

describe("StructuredLogger", () => {
  it("logs at or above min level", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new StructuredLogger({ minLevel: "INFO" });
    logger.info("hello");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("hello"));
    spy.mockRestore();
  });

  it("filters below min level", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new StructuredLogger({ minLevel: "WARN" });
    logger.info("should-not-log");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("logs errors to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = new StructuredLogger();
    logger.error("boom");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("boom"));
    spy.mockRestore();
  });

  it("logs warnings to console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logger = new StructuredLogger();
    logger.warn("careful");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("careful"));
    spy.mockRestore();
  });

  it("logs debug to console.debug", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const logger = new StructuredLogger({ minLevel: "DEBUG" });
    logger.debug("verbose");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("verbose"));
    spy.mockRestore();
  });

  it("child creates a namespaced logger", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new StructuredLogger({ service: "parent" });
    const child = logger.child("child");
    child.info("msg");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("parent.child"));
    spy.mockRestore();
  });

  it("prettyPrint formats with indentation", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new StructuredLogger({ prettyPrint: true });
    logger.info("pretty");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("\n"));
    spy.mockRestore();
  });
});

describe("getCertificate", () => {
  it("returns sandbox certificate", () => {
    const cert = getCertificate("sandbox");
    expect(cert).toContain("BEGIN CERTIFICATE");
  });

  it("returns production certificate", () => {
    const cert = getCertificate("production");
    expect(cert).toContain("BEGIN CERTIFICATE");
  });
});

describe("CircuitBreaker", () => {
  it("calls the function when closed", async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, successThreshold: 1, timeoutMs: 1000 });
    const result = await breaker.call(async () => "ok");
    expect(result).toBe("ok");
    expect(breaker.getState()).toBe("closed");
  });

  it("opens after failure threshold", async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, successThreshold: 1, timeoutMs: 1000 });
    await expect(breaker.call(async () => { throw new Error("fail"); })).rejects.toThrow("fail");
    await expect(breaker.call(async () => { throw new Error("fail"); })).rejects.toThrow("fail");
    expect(breaker.getState()).toBe("open");
    await expect(breaker.call(async () => "ok")).rejects.toThrow("Circuit breaker is open");
  });

  it("transitions to half-open after timeout", async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, successThreshold: 1, timeoutMs: 10 });
    await expect(breaker.call(async () => { throw new Error("fail"); })).rejects.toThrow();
    expect(breaker.getState()).toBe("open");
    await new Promise((r) => setTimeout(r, 20));
    expect(breaker.getState()).toBe("half-open");
  });

  it("resets to closed after success in half-open", async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1, successThreshold: 1, timeoutMs: 10 });
    await expect(breaker.call(async () => { throw new Error("fail"); })).rejects.toThrow();
    await new Promise((r) => setTimeout(r, 20));
    await breaker.call(async () => "ok");
    expect(breaker.getState()).toBe("closed");
  });
});

describe("Idempotency", () => {
  it("InMemoryIdempotencyStore stores and retrieves", async () => {
    const store = new InMemoryIdempotencyStore();
    await store.set("key-1", { data: 1 }, 60_000);
    expect(await store.get("key-1")).toEqual({ data: 1 });
    store.dispose();
  });

  it("InMemoryIdempotencyStore returns null for missing", async () => {
    const store = new InMemoryIdempotencyStore();
    expect(await store.get("missing")).toBeNull();
    store.dispose();
  });

  it("InMemoryIdempotencyStore expires entries", async () => {
    const store = new InMemoryIdempotencyStore();
    await store.set("key-1", { data: 1 }, -1);
    expect(await store.get("key-1")).toBeNull();
    store.dispose();
  });

  it("generateIdempotencyKey is deterministic", () => {
    const key1 = generateIdempotencyKey("POST", "/mpesa/stkpush", { amount: 100 });
    const key2 = generateIdempotencyKey("POST", "/mpesa/stkpush", { amount: 100 });
    expect(key1).toBe(key2);
    expect(key1).toMatch(/^mpesa-idem-/);
  });

  it("generateIdempotencyKey differs for different bodies", () => {
    const key1 = generateIdempotencyKey("POST", "/mpesa/stkpush", { amount: 100 });
    const key2 = generateIdempotencyKey("POST", "/mpesa/stkpush", { amount: 200 });
    expect(key1).not.toBe(key2);
  });
});

describe("Tracing", () => {
  it("NoopTracer returns NoopSpan", () => {
    const tracer = new NoopTracer();
    const span = tracer.startSpan("test");
    expect(span).toBeInstanceOf(NoopSpan);
    expect(() => {
      span.end();
      span.setAttribute("k", "v");
      span.addEvent("e");
      span.recordException(new Error("x"));
      span.setStatus("error", "msg");
    }).not.toThrow();
  });

  it("OpenTelemetryTracer starts spans", () => {
    const tracer = new OpenTelemetryTracer("test", "1.0.0");
    const span = tracer.startSpan("op");
    expect(span).toBeDefined();
    span.end();
  });

  it("createTracer returns an OpenTelemetryTracer", () => {
    expect(createTracer()).toBeInstanceOf(OpenTelemetryTracer);
  });

  it("withSpan returns the result", async () => {
    const tracer = new NoopTracer();
    expect(await withSpan(tracer, "op", async () => 42)).toBe(42);
  });

  it("withSpan rethrows errors", async () => {
    const tracer = new NoopTracer();
    await expect(
      withSpan(tracer, "op", async () => { throw new Error("boom"); }),
    ).rejects.toThrow("boom");
  });

  it("withSpanSync returns the result", async () => {
    const tracer = new NoopTracer();
    expect(await withSpanSync(tracer, "op", () => 42)).toBe(42);
  });

  it("withSpanSync rethrows errors", async () => {
    const tracer = new NoopTracer();
    await expect(
      withSpanSync(tracer, "op", () => { throw new Error("boom"); }),
    ).rejects.toThrow("boom");
  });
});