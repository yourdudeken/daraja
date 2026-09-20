import { describe, it, expect, vi } from "vitest";
import { B2CHakikishaService } from "../../src/services/b2c-hakikisha.js";
import { MpesaApiClient } from "../../src/client/client.js";
import { ValidationError } from "../../src/errors/index.js";
import type { B2CHakikishaRequest } from "../../src/types/index.js";

function createFakeClient(): MpesaApiClient {
  const post = vi.fn().mockResolvedValue({
    header: {
      requestID: "8aeefeea-8713-4a4d-b1b4-7b8c143b7ec1",
      timestamp: "1748933384",
      status: "200",
      message: "Success",
    },
    body: { firstName: "john", middleName: "M******", lastName: "M******" },
  });
  const client = {
    post,
    getEndpoint: (name: string) => `/endpoint/${name}`,
  } as unknown as MpesaApiClient;
  return client;
}

function sampleRequest(): B2CHakikishaRequest {
  return {
    header: { requestID: "8aeefeea-8713-4a4d-b1b4-7b8c143b7ec1", timestamp: "1748933384" },
    body: { msisdn: "254722000000", shortcode: "123456" },
  };
}

describe("B2CHakikishaService", () => {
  it("posts the expected payload to B2C_HAKIKISHA", async () => {
    const client = createFakeClient();
    const service = new B2CHakikishaService(client);

    const result = await service.validate(sampleRequest());

    expect(client.post).toHaveBeenCalledWith("/endpoint/B2C_HAKIKISHA", sampleRequest());
    expect(result.header.status).toBe("200");
    expect(result.body.firstName).toBe("john");
  });

  it("auto-generates requestID and unix timestamp when empty", async () => {
    const client = createFakeClient();
    const service = new B2CHakikishaService(client);
    const request: B2CHakikishaRequest = {
      header: {},
      body: { msisdn: "254722000000", shortcode: "123456" },
    };

    await service.validate(request);

    expect(request.header.requestID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(request.header.timestamp).toMatch(/^\d{10}$/);
    expect(Math.abs(Number(request.header.timestamp) - Math.floor(Date.now() / 1000))).toBeLessThan(5);
  });

  it("keeps provided header values", async () => {
    const client = createFakeClient();
    const service = new B2CHakikishaService(client);
    const request = sampleRequest();

    await service.validate(request);

    expect(request.header.requestID).toBe("8aeefeea-8713-4a4d-b1b4-7b8c143b7ec1");
    expect(request.header.timestamp).toBe("1748933384");
  });

  it("rejects an invalid msisdn", async () => {
    const client = createFakeClient();
    const service = new B2CHakikishaService(client);
    const request: B2CHakikishaRequest = {
      header: {},
      body: { msisdn: "0722000000", shortcode: "123456" },
    };

    await expect(service.validate(request)).rejects.toThrow(ValidationError);
  });

  it("rejects an invalid shortcode", async () => {
    const client = createFakeClient();
    const service = new B2CHakikishaService(client);
    const request: B2CHakikishaRequest = {
      header: {},
      body: { msisdn: "254722000000", shortcode: "12" },
    };

    await expect(service.validate(request)).rejects.toThrow(ValidationError);
  });
});