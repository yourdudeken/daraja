import http from "node:http";
import https from "node:https";
import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { getBaseUrl, getEndpoints } from "../environment.js";
import { generateSecurityCredential, getCertificate } from "../utils/index.js";
import type { MpesaConfig, ResolvedConfig, Logger, LoggingHook, AccessTokenResponse, TokenCache, Tracer, ConnectionPoolConfig } from "../types/index.js";
import { maskSensitiveData, noopLogger, generateRequestId, createTracer, withSpan } from "../utils/index.js";
import { setupRetryInterceptor, mapAxiosError } from "../interceptors/retry.js";
import { AuthenticationError } from "../errors/index.js";
import { CircuitBreaker } from "../utils/circuit-breaker.js";
import { TokenBucketRateLimiter, NoopRateLimiter, EndpointRateLimiterRouter } from "../utils/rate-limiter.js";
import {
  DEFAULT_TTL_MS as IDEMPOTENCY_TTL_MS,
  IdempotencyStore,
  InMemoryIdempotencyStore,
  callerIdempotencyKey,
  isQueryEndpointUrl,
  markIdempotencyCacheHit,
} from "../utils/idempotency.js";
import { SharedTokenCache, RedisTokenCache, buildTokenCacheKey } from "../utils/token-cache.js";

const DEFAULT_TIMEOUT = 30000;

export class MpesaApiClient {
  private readonly client: AxiosInstance;
  private readonly config: ResolvedConfig;
  private tokenCache: TokenCache | null = null;
  private readonly logging?: LoggingHook;
  private readonly logger: Logger;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly rateLimiter: TokenBucketRateLimiter | NoopRateLimiter;
  private readonly endpoints: Record<string, string>;
  private readonly tracer: Tracer;
  private readonly idempotencyStore: IdempotencyStore | null;
  private readonly idempotencyTtlMs: number;
  private readonly sharedTokenCache: SharedTokenCache | null;

  constructor(config: MpesaConfig) {
    this.logger = config.logger ?? noopLogger;
    this.tracer = config.tracer ?? createTracer(this.logger);
    // FR-001 / TRD-05 — opt IN only. The previous expression was
    // `config.enableIdempotency !== false`, which meant an *unset* flag turned
    // the cache ON: the local cache was default-on, keyed by request content.
    this.idempotencyStore =
      config.idempotencyStore ?? (config.enableIdempotency === true ? new InMemoryIdempotencyStore() : null);
    // FR-001 requires the store to be bounded; the cap lives in
    // InMemoryIdempotencyStore. A caller-supplied store owns its own policy.
    this.idempotencyTtlMs = IDEMPOTENCY_TTL_MS;

    if (config.sharedTokenCache) {
      this.sharedTokenCache = config.sharedTokenCache;
    } else if (config.redisUrl) {
      this.sharedTokenCache = new RedisTokenCache(config.redisUrl);
    } else {
      this.sharedTokenCache = null;
    }

    this.circuitBreaker = new CircuitBreaker(config.circuitBreakerConfig);

    if (config.rateLimiterConfig) {
      if (config.rateLimiterConfig.endpointOverrides) {
        this.rateLimiter = new EndpointRateLimiterRouter(config.rateLimiterConfig);
      } else {
        this.rateLimiter = new TokenBucketRateLimiter(config.rateLimiterConfig);
      }
    } else {
      this.rateLimiter = new NoopRateLimiter();
    }

    this.endpoints = getEndpoints(config.environment ?? "sandbox");

    const environment = config.environment ?? "sandbox";
    const resolvedSecurityCredential =
      config.securityCredential ??
      (config.initiatorPassword
        ? generateSecurityCredential(config.initiatorPassword, getCertificate(environment))
        : "");

    this.config = {
      consumerKey: config.consumerKey,
      consumerSecret: config.consumerSecret,
      environment,
      initiatorPassword: config.initiatorPassword ?? "",
      initiatorName: config.initiatorName ?? "",
      passkey: config.passkey ?? "",
      securityCredential: resolvedSecurityCredential,
      retryConfig: config.retryConfig ?? {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
      },
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      logging: config.logging ?? {},
      logger: this.logger,
    };
    this.logging = this.config.logging;

    const poolConfig: ConnectionPoolConfig = config.connectionPoolConfig ?? {};

    const axiosConfig: Record<string, unknown> = {
      baseURL: getBaseUrl(this.config.environment),
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip",
      },
    };

    if (poolConfig.keepAlive || poolConfig.maxConnectionsPerHost || poolConfig.idleTimeoutMs) {
      axiosConfig.httpAgent = new http.Agent({
        keepAlive: poolConfig.keepAlive ?? true,
        maxSockets: poolConfig.maxConnectionsPerHost ?? 50,
        timeout: poolConfig.idleTimeoutMs ?? 0,
      });
      axiosConfig.httpsAgent = new https.Agent({
        keepAlive: poolConfig.keepAlive ?? true,
        maxSockets: poolConfig.maxConnectionsPerHost ?? 50,
        timeout: poolConfig.idleTimeoutMs ?? 0,
      });
    }

    this.client = axios.create(axiosConfig as Parameters<typeof axios.create>[0]);

    setupRetryInterceptor(this.client, this.config.retryConfig, this.logger);

    this.logger.info("M-Pesa API client initialized", {
      environment: this.config.environment,
      timeout: this.config.timeout,
      retryMax: this.config.retryConfig.maxRetries,
    });

    this.client.interceptors.request.use((req) => {
      const requestId = generateRequestId();
      req.headers["X-Request-ID"] = requestId;
      this.logger.debug("Outgoing request", {
        method: req.method?.toUpperCase(),
        url: req.url,
        requestId,
      });
      this.logging?.onRequest?.({
        method: req.method?.toUpperCase() ?? "GET",
        url: req.url ?? "",
        headers: req.headers as Record<string, string>,
        body: req.data ? maskSensitiveData(req.data) : undefined,
        timestamp: new Date(),
        requestId,
      });
      return req;
    });

    this.client.interceptors.response.use(
      (res) => {
        const requestId = (res.config.headers?.["X-Request-ID"] as string) ?? "";
        this.logger.debug("Response received", {
          status: res.status,
          url: res.config.url,
          requestId,
        });
        this.logging?.onResponse?.({
          status: res.status,
          body: res.data,
          durationMs: 0,
          timestamp: new Date(),
          requestId,
        });
        return res;
      },
      (err) => {
        const requestId = (err.config?.headers?.["X-Request-ID"] as string) ?? "";
        this.logger.error("Request error", {
          message: err.message,
          status: err.response?.status,
          url: err.config?.url,
          requestId,
        });
        this.logging?.onError?.({
          error: err,
          timestamp: new Date(),
          requestId,
        });
        return Promise.reject(mapAxiosError(err));
      },
    );

  }

  getConfig(): Readonly<ResolvedConfig> {
    return this.config;
  }

  private isTokenExpired(): boolean {
    if (!this.tokenCache) return true;
    return new Date() >= this.tokenCache.expiresAt;
  }

  async getAccessToken(): Promise<string> {
    if (this.tokenCache && !this.isTokenExpired()) {
      return this.tokenCache.token;
    }

    if (this.sharedTokenCache) {
      const cacheKey = buildTokenCacheKey(this.config.consumerKey);
      const cached = await this.sharedTokenCache.get(cacheKey);
      if (cached) {
        this.tokenCache = { token: cached, expiresAt: new Date(Date.now() + 300000) };
        return cached;
      }
    }

    this.logger.debug("Fetching new access token");

    const response = await this.client.get<AccessTokenResponse>("/oauth/v1/generate", {
      params: { grant_type: "client_credentials" },
      auth: {
        username: this.config.consumerKey,
        password: this.config.consumerSecret,
      },
    });

    const data = response.data;
    this.tokenCache = {
      token: data.access_token,
      expiresAt: new Date(Date.now() + (data.expires_in - 60) * 1000),
    };

    if (this.sharedTokenCache) {
      const cacheKey = buildTokenCacheKey(this.config.consumerKey);
      await this.sharedTokenCache.set(cacheKey, data.access_token, data.expires_in - 60);
    }

    this.logger.debug("Access token acquired", {
      expiresIn: data.expires_in,
    });

    return data.access_token;
  }

  /**
   * Issue one request.
   *
   * `idempotencyKey` is an **explicit caller-supplied** key for the local
   * duplicate-suppression cache (FR-001). Pass `undefined` — the default — and the
   * key is taken from the caller's `OriginatorConversationID` when the payload has
   * one. Either way the key comes only from caller-supplied data; the request body
   * is never hashed. `null` on both paths means no dedup.
   *
   * The outbound request carries **no** `X-Idempotency-Key` (FR-002): Daraja
   * documents no such header — `grep -i idempotenc` over all 30 corpus documents
   * returns 0 hits — so emitting it advertised a guarantee the platform does not
   * make.
   */
  async request<T>(
    config: AxiosRequestConfig,
    operationName?: string,
    idempotencyKey?: string,
  ): Promise<T> {
    const spanName = `mpesa.http.${(config.method ?? "get").toLowerCase()}`;

    const store = this.idempotencyStore;
    let key: string | null = null;
    // A query endpoint's body legitimately never varies, so FR-001 forbids
    // holding a terminal response for one: it gets in-flight markers only.
    const cacheable = store !== null && !isQueryEndpointUrl(config.url);
    const queryEndpoint = store !== null && isQueryEndpointUrl(config.url);

    if (store && config.method?.toUpperCase() === "POST") {
      key = callerIdempotencyKey(idempotencyKey, config.data);
      if (key !== null) {
        if (cacheable) {
          const cached = await store.get(key);
          if (cached !== null && cached !== undefined) {
            // INFO, not debug: a replayed request must be visible at the level an
            // operator actually runs, and the caller must be able to tell it from
            // a fresh one (AC-002, TRD-05).
            this.logger.info("Idempotency cache hit", { key, url: config.url });
            // Shallow copy before marking. The cached object is shared by
            // reference, so marking it in place would retroactively turn an
            // *earlier, genuinely fresh* result into one that reads as cached —
            // and mutating the replay's fields would corrupt what the next
            // caller sees. The copy keeps each caller's result independent.
            return markIdempotencyCacheHit(
              { ...(cached as object) } as T,
              { key, url: config.url ?? "" },
            );
          }
        } else if (queryEndpoint) {
          await store.markInFlight(key, this.idempotencyTtlMs);
        }
      }
    }

    try {
      return await withSpan(this.tracer, spanName, async () => {
        await this.rateLimiter.acquire(config.url);

        return this.circuitBreaker.call<T>(async () => {
          const token = await this.getAccessToken();
          const headers: Record<string, string> = {
            ...(config.headers as Record<string, string>),
            Authorization: `Bearer ${token}`,
          };
          // FR-002: no X-Idempotency-Key. It was the only header the SDK added
          // that the corpus does not document, and it is removed outright — it is
          // an outbound protocol behaviour, not a public API, so there is nothing
          // to deprecate (TRD-04's exception).

          const mergedConfig: AxiosRequestConfig = {
            ...config,
            headers,
          };

          this.logger.debug("Sending request", {
            method: config.method?.toUpperCase(),
            url: config.url,
          });

          const response = await this.client.request<T>(mergedConfig);
          const data = response.data;

          if (key !== null && store) {
            if (cacheable) {
              // Shallow copy on the way in, for the same reason as the copy on the
              // way out: the caller holds this exact object, and any field it
              // mutates must not change what a later replay receives.
              await store.set(key, { ...(data as object) }, this.idempotencyTtlMs);
            } else {
              // Query endpoints hold markers only, never results.
              await store.clearInFlight(key);
            }
          }

          return data;
        });
      }, {
        "http.method": (config.method ?? "GET").toUpperCase(),
        "http.url": config.url ?? "",
        "mpesa.operation": operationName ?? "",
        "rpc.system": "mpesa",
      });
    } finally {
      // A query endpoint's in-flight marker must not outlive the request,
      // successful or not — otherwise one failed call would pin the key and every
      // later identical query would report itself as still in flight.
      if (queryEndpoint && key !== null && store) {
        await store.clearInFlight(key);
      }
    }
  }

  async post<T>(url: string, data?: unknown, operationName?: string, idempotencyKey?: string): Promise<T> {
    return this.request<T>({ method: "POST", url, data }, operationName, idempotencyKey);
  }

  async get<T>(url: string, params?: Record<string, unknown>, operationName?: string): Promise<T> {
    return this.request<T>({ method: "GET", url, params }, operationName);
  }

  rotateCredentials(consumerKey: string, consumerSecret: string): void {
    this.config.consumerKey = consumerKey;
    this.config.consumerSecret = consumerSecret;
    this.invalidateToken();
    this.logger.info("Credentials rotated");
  }

  getEndpoint(name: string): string {
    return this.endpoints[name] ?? "";
  }

  invalidateToken(): void {
    this.tokenCache = null;
  }

  async withTokenRefresh<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        this.invalidateToken();
        return await fn();
      }
      throw error;
    }
  }
}
