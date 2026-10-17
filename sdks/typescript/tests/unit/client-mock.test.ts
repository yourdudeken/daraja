import { describe, it, expect, vi, beforeEach } from "vitest";
import { MpesaApiClient } from "../../src/client/client.js";
import type { MpesaConfig } from "../../src/types/index.js";
import type { SharedTokenCache } from "../../src/utils/token-cache.js";

const mockAxiosInstance = {
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
  get: vi.fn(),
  post: vi.fn(),
  request: vi.fn(),
  defaults: { headers: {} },
  create: vi.fn(),
};

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

function createTestClient() {
  const config: MpesaConfig = {
    consumerKey: "test-key",
    consumerSecret: "test-secret",
    environment: "sandbox",
    passkey: "test-passkey",
  };
  return new MpesaApiClient(config);
}

describe("MpesaApiClient with mocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.request.mockReset();

    mockAxiosInstance.interceptors.request.use.mockReturnValue(undefined);
    mockAxiosInstance.interceptors.response.use.mockReturnValue(undefined);
  });

  it("should be created with default config", () => {
    const client = createTestClient();
    expect(client).toBeInstanceOf(MpesaApiClient);
    const cfg = client.getConfig();
    expect(cfg.environment).toBe("sandbox");
    expect(cfg.retryConfig.maxRetries).toBe(3);
  });

  it("should get access token from cache", async () => {
    const client = createTestClient();

    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { access_token: "cached-token", expires_in: 3600 },
    });

    const token1 = await client.getAccessToken();
    expect(token1).toBe("cached-token");
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);

    const token2 = await client.getAccessToken();
    expect(token2).toBe("cached-token");
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
  });

  it("should coalesce concurrent token requests into a single fetch", async () => {
    const client = createTestClient();

    // Keep the fetch open so every caller arrives while it is in flight.
    mockAxiosInstance.get.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () => resolve({ data: { access_token: "single-flight-token", expires_in: 3600 } }),
            20,
          );
        }),
    );

    const tokens = await Promise.all(
      Array.from({ length: 5 }, () => client.getAccessToken()),
    );

    expect(tokens).toEqual(Array(5).fill("single-flight-token"));
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
  });

  it("should clear the in-flight fetch after a failed token request", async () => {
    const client = createTestClient();

    mockAxiosInstance.get.mockRejectedValueOnce(new Error("token endpoint down"));
    await expect(client.getAccessToken()).rejects.toThrow("token endpoint down");

    // The failed flight must not be replayed to the next caller: the client
    // recovers with a fresh attempt instead of caching the rejection.
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { access_token: "recovered-token", expires_in: 3600 },
    });
    await expect(client.getAccessToken()).resolves.toBe("recovered-token");
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
  });

  it("should keep a newer in-flight fetch when an invalidated one settles", async () => {
    const client = createTestClient();

    const deferred: Array<{
      resolve: (value: unknown) => void;
      reject: (reason: unknown) => void;
    }> = [];
    mockAxiosInstance.get.mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          deferred.push({ resolve, reject });
        }),
    );

    const first = client.getAccessToken();
    await client.invalidateToken();
    const second = client.getAccessToken();
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);

    // The superseded flight settles while the newer one is still in flight; it
    // must not clear the newer flight's slot.
    deferred[0].reject(new Error("superseded"));
    await expect(first).rejects.toThrow("superseded");

    const third = client.getAccessToken();
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);

    deferred[1].resolve({ data: { access_token: "fresh-token", expires_in: 3600 } });
    await expect(second).resolves.toBe("fresh-token");
    await expect(third).resolves.toBe("fresh-token");
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
  });

  it("should remove a superseded token from the shared cache", async () => {
    const store = new Map<string, string>();
    let signalWriteStarted: () => void = () => {};
    const writeStarted = new Promise<void>((resolve) => {
      signalWriteStarted = resolve;
    });
    let releaseWrite: () => void = () => {};
    const writeGate = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });

    const sharedTokenCache = {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      set: vi.fn(async (key: string, token: string) => {
        signalWriteStarted();
        await writeGate;
        store.set(key, token);
      }),
      del: vi.fn(async (key: string) => {
        store.delete(key);
      }),
    };

    const client = new MpesaApiClient({
      consumerKey: "test-key",
      consumerSecret: "test-secret",
      environment: "sandbox",
      sharedTokenCache,
    });

    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { access_token: "stale-token", expires_in: 3600 },
    });

    const first = client.getAccessToken();
    await writeStarted;
    // Invalidate while the shared-cache write is still in flight: its delete
    // lands first, then the write lands and must be undone.
    await client.invalidateToken();
    releaseWrite();
    await expect(first).resolves.toBe("stale-token");

    expect(sharedTokenCache.del).toHaveBeenCalled();
    expect(store.size).toBe(0);

    // A later caller must therefore not be served the superseded token.
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { access_token: "fresh-token", expires_in: 3600 },
    });
    await expect(client.getAccessToken()).resolves.toBe("fresh-token");
  });

  it("should not install a token fetched before invalidateToken", async () => {
    const client = createTestClient();

    const deferred: Array<(value: unknown) => void> = [];
    mockAxiosInstance.get.mockImplementation(
      () =>
        new Promise((resolve) => {
          deferred.push(resolve);
        }),
    );

    const first = client.getAccessToken();
    await client.invalidateToken();

    deferred[0]({ data: { access_token: "stale-token", expires_in: 3600 } });
    await expect(first).resolves.toBe("stale-token");

    // The stale token must not be cached: the next caller fetches again.
    const second = client.getAccessToken();
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    deferred[1]({ data: { access_token: "fresh-token", expires_in: 3600 } });
    await expect(second).resolves.toBe("fresh-token");
  });

  it("should make a POST request with auth token", async () => {
    const client = createTestClient();

    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { access_token: "test-token", expires_in: 3600 },
    });

    mockAxiosInstance.request.mockResolvedValueOnce({
      data: {
        MerchantRequestID: "mri-1",
        CheckoutRequestID: "cri-1",
        ResponseCode: "0",
        ResponseDescription: "Success",
        CustomerMessage: "Success",
      },
    });

    const result = await client.post<Record<string, unknown>>(
      "/mpesa/stkpush/v1/processrequest",
      { Amount: 100, PhoneNumber: 254722111111 },
    );

    expect(result).toBeDefined();
    expect(result.ResponseCode).toBe("0");
    expect(mockAxiosInstance.request).toHaveBeenCalled();

    const callArgs = mockAxiosInstance.request.mock.calls[0][0];
    expect(callArgs.headers?.Authorization).toContain("Bearer test-token");
  });

  it("should generate and send X-Request-ID header", async () => {
    const client = createTestClient();

    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { access_token: "token-rid", expires_in: 3600 },
    });

    mockAxiosInstance.request.mockResolvedValueOnce({
      data: { ResponseCode: "0" },
    });

    let capturedRequestId = "";
    mockAxiosInstance.interceptors.request.use.mockImplementation(
      (fn: (req: Record<string, unknown>) => Record<string, unknown>) => {
        const req = { headers: {} };
        const result = fn(req);
        capturedRequestId = (result.headers as Record<string, string>)?.["X-Request-ID"] ?? "";
      },
    );

    await client.post("/test", { key: "value" });

    const requestInterceptorFn = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
    const mockReq = { headers: {} };
    requestInterceptorFn(mockReq);
    expect(mockReq.headers["X-Request-ID"]).toBeDefined();
    expect(mockReq.headers["X-Request-ID"]).toMatch(/^mpesa-/);
  });

  it("should report a 401 and refresh the token only after it is invalidated", async () => {
    const client = createTestClient();

    mockAxiosInstance.get
      .mockResolvedValueOnce({
        data: { access_token: "expired-token", expires_in: 3600 },
      })
      .mockResolvedValueOnce({
        data: { access_token: "fresh-token", expires_in: 3600 },
      });

    mockAxiosInstance.request
      .mockRejectedValueOnce({
        response: { status: 401, data: {} },
        config: { headers: {} },
        isAxiosError: true,
      })
      .mockResolvedValueOnce({ data: { ResponseCode: "0" } });

    // The failure reaches the caller — it is not swallowed — and the 401 does
    // not by itself fetch another token: only the call's own auth did.
    await expect(client.post("/test", {})).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);

    // What the client does own: once the token is invalidated, the next request
    // authenticates again and carries the new token.
    await client.invalidateToken();
    await expect(client.post("/test", {})).resolves.toEqual({ ResponseCode: "0" });
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    const retried = mockAxiosInstance.request.mock.calls[1][0] as {
      headers: Record<string, string>;
    };
    expect(retried.headers.Authorization).toBe("Bearer fresh-token");
  });

  it("should generate request ID with correct prefix", async () => {
    const { generateRequestId } = await import("../../src/utils/index.js");
    const id = generateRequestId();
    expect(id).toMatch(/^mpesa-/);
    expect(id.length).toBeGreaterThan(10);
  });

  it("should propagate the shared-cache entry's remaining lifetime", async () => {
    let sharedEntry: { token: string; expiresAt: number } | null = {
      token: "shared-token",
      expiresAt: Date.now() + 30,
    };
    const sharedTokenCache: SharedTokenCache = {
      get: async () => sharedEntry?.token ?? null,
      getEntry: async () => sharedEntry,
      set: async () => undefined,
    };
    const client = new MpesaApiClient({
      consumerKey: "test-key",
      consumerSecret: "test-secret",
      environment: "sandbox",
      passkey: "test-passkey",
      sharedTokenCache,
    });

    await expect(client.getAccessToken()).resolves.toBe("shared-token");
    expect(mockAxiosInstance.get).not.toHaveBeenCalled();

    // The entry is nearly spent, so the next acquisition must refetch instead of
    // serving it for another assumed five minutes.
    sharedEntry = null;
    await new Promise((r) => setTimeout(r, 40));
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { access_token: "fresh-token", expires_in: 3600 },
    });

    await expect(client.getAccessToken()).resolves.toBe("fresh-token");
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
  });

  it("should ignore an already-expired shared-cache entry", async () => {
    const sharedTokenCache: SharedTokenCache = {
      get: async () => "stale-token",
      getEntry: async () => ({ token: "stale-token", expiresAt: Date.now() - 1000 }),
      set: async () => undefined,
    };
    const client = new MpesaApiClient({
      consumerKey: "test-key",
      consumerSecret: "test-secret",
      environment: "sandbox",
      passkey: "test-passkey",
      sharedTokenCache,
    });

    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { access_token: "fresh-token", expires_in: 3600 },
    });

    await expect(client.getAccessToken()).resolves.toBe("fresh-token");
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
  });

  it("should trust a cache that can only get tokens for the guaranteed floor", async () => {
    vi.useFakeTimers();
    try {
      let sharedToken: string | null = "shared-token";
      const sharedTokenCache: SharedTokenCache = {
        get: async () => sharedToken,
        set: async () => undefined,
      };
      const client = new MpesaApiClient({
        consumerKey: "test-key",
        consumerSecret: "test-secret",
        environment: "sandbox",
        passkey: "test-passkey",
        sharedTokenCache,
      });

      await expect(client.getAccessToken()).resolves.toBe("shared-token");
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();

      // A cache that cannot report expiry is trusted for the 60 s floor only, so
      // past it the token is read (or refetched) again instead of being served
      // for another assumed five minutes.
      vi.setSystemTime(Date.now() + 61_000);
      sharedToken = null;
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { access_token: "fresh-token", expires_in: 3600 },
      });
      await expect(client.getAccessToken()).resolves.toBe("fresh-token");
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
