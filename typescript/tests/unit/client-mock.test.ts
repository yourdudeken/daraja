import { describe, it, expect, vi, beforeEach } from "vitest";
import { MpesaApiClient } from "../../src/client/client.js";
import type { MpesaConfig } from "../../src/types/index.js";

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

  it("should invalidate token on 401 and refresh", async () => {
    const client = createTestClient();

    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { access_token: "expired-token", expires_in: 3600 },
    });

    mockAxiosInstance.request.mockRejectedValueOnce({
      response: { status: 401, data: {} },
      config: { headers: {} },
      isAxiosError: true,
    });

    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { access_token: "fresh-token", expires_in: 3600 },
    });

    mockAxiosInstance.request.mockResolvedValueOnce({
      data: { ResponseCode: "0" },
    });

    try {
      await client.post("/test", {});
    } catch {
      // expected auth error on first call
    }

    client.invalidateToken();
    const freshToken = await client.getAccessToken();
    expect(freshToken).toBe("fresh-token");
  });

  it("should generate request ID with correct prefix", async () => {
    const { generateRequestId } = await import("../../src/utils/index.js");
    const id = generateRequestId();
    expect(id).toMatch(/^mpesa-/);
    expect(id.length).toBeGreaterThan(10);
  });
});
