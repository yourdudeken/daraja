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
import { IdempotencyStore, InMemoryIdempotencyStore, generateIdempotencyKey } from "../utils/idempotency.js";
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
  private readonly sharedTokenCache: SharedTokenCache | null;

  constructor(config: MpesaConfig) {
    this.logger = config.logger ?? noopLogger;
    this.tracer = config.tracer ?? createTracer(this.logger);
    this.idempotencyStore = config.idempotencyStore ?? (config.enableIdempotency !== false ? new InMemoryIdempotencyStore() : null);

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

  async request<T>(config: AxiosRequestConfig, operationName?: string): Promise<T> {
    const spanName = `mpesa.http.${(config.method ?? "get").toLowerCase()}`;

    const idempotencyKey = this.idempotencyStore && config.method?.toUpperCase() === "POST"
      ? generateIdempotencyKey(config.method ?? "POST", config.url ?? "", config.data)
      : null;

    if (idempotencyKey) {
      const cached = await this.idempotencyStore!.get(idempotencyKey);
      if (cached !== null) {
        this.logger.debug("Idempotency cache hit", { key: idempotencyKey, url: config.url });
        return cached as T;
      }
    }

    return withSpan(this.tracer, spanName, async () => {
      await this.rateLimiter.acquire(config.url);

      return this.circuitBreaker.call<T>(async () => {
        const token = await this.getAccessToken();
        const headers: Record<string, string> = {
          ...(config.headers as Record<string, string>),
          Authorization: `Bearer ${token}`,
        };

        if (idempotencyKey) {
          headers["X-Idempotency-Key"] = idempotencyKey;
        }

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

        if (idempotencyKey) {
          await this.idempotencyStore!.set(idempotencyKey, data, 86400_000);
        }

        return data;
      });
    }, {
      "http.method": (config.method ?? "GET").toUpperCase(),
      "http.url": config.url ?? "",
      "mpesa.operation": operationName ?? "",
      "rpc.system": "mpesa",
    });
  }

  async post<T>(url: string, data?: unknown, operationName?: string): Promise<T> {
    return this.request<T>({ method: "POST", url, data }, operationName);
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
