import { describe, it, expect, vi } from "vitest";
import { C2BHakikishaHandler } from "../../src/services/c2b-hakikisha.js";

function createHandler(): C2BHakikishaHandler {
  return new C2BHakikishaHandler({
    username: "partner-user",
    password: "partner-pass",
    resolveAccountName: (accountNumber) =>
      accountNumber === "66925336" ? "Money Market Account" : null,
  });
}

function basic(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function request(): Record<string, unknown> {
  return {
    requestId: "dcd1c2ab-7a26-4170-939d-9dc2e879b0e5",
    timestamp: "1728897681",
    accountNumber: "66925336",
    shortcode: "415010",
  };
}

describe("C2BHakikishaHandler", () => {
  describe("tokenEndpoint", () => {
    it("issues an access token for valid Basic credentials", () => {
      const handler = createHandler();

      const [payload, status] = handler.tokenEndpoint(basic("partner-user", "partner-pass"));

      expect(status).toBe(200);
      expect(payload.access_token).toBeTruthy();
      expect(payload.expires_in).toBe(3599);
    });

    it("rejects missing authorization with 401", () => {
      const handler = createHandler();

      const [payload, status] = handler.tokenEndpoint(null);

      expect(status).toBe(401);
      expect(payload.errorMessage).toBeTruthy();
    });

    it("rejects non-Basic authorization with 401", () => {
      const handler = createHandler();

      const [payload, status] = handler.tokenEndpoint("Bearer some-token");

      expect(status).toBe(401);
      expect(payload.errorMessage).toBeTruthy();
    });

    it("rejects wrong credentials with 401", () => {
      const handler = createHandler();

      const [payload, status] = handler.tokenEndpoint(basic("partner-user", "wrong-pass"));

      expect(status).toBe(401);
      expect(payload.errorMessage).toBeTruthy();
    });

    it("rejects an unsupported grant type with 400", () => {
      const handler = createHandler();

      const [, status] = handler.tokenEndpoint(
        basic("partner-user", "partner-pass"),
        "authorization_code",
      );

      expect(status).toBe(400);
    });

    it("issues a unique token each time", () => {
      const handler = createHandler();

      const [first] = handler.tokenEndpoint(basic("partner-user", "partner-pass"));
      const [second] = handler.tokenEndpoint(basic("partner-user", "partner-pass"));

      expect(first.access_token).not.toBe(second.access_token);
    });
  });

  describe("validationEndpoint", () => {
    function issueToken(handler: C2BHakikishaHandler): string {
      const [payload, status] = handler.tokenEndpoint(basic("partner-user", "partner-pass"));
      expect(status).toBe(200);
      return payload.access_token;
    }

    it("resolves the account name with a valid Bearer token", () => {
      const handler = createHandler();
      const token = issueToken(handler);

      const [payload, status] = handler.validationEndpoint(`Bearer ${token}`, request());

      expect(status).toBe(200);
      expect(payload).toEqual({
        requestId: "dcd1c2ab-7a26-4170-939d-9dc2e879b0e5",
        timestamp: "1728897681",
        accountName: "Money Market Account",
        accountNumber: "66925336",
        shortcode: "415010",
      });
    });

    it("rejects a missing Bearer token with 401", () => {
      const handler = createHandler();

      const [payload, status] = handler.validationEndpoint(null, request());

      expect(status).toBe(401);
      expect(payload.errorMessage).toBeTruthy();
    });

    it("rejects an invalid Bearer token with 401", () => {
      const handler = createHandler();

      const [payload, status] = handler.validationEndpoint("Bearer bogus-token", request());

      expect(status).toBe(401);
      expect(payload.errorMessage).toBeTruthy();
    });

    it("rejects an unknown account with 400", () => {
      const handler = createHandler();
      const token = issueToken(handler);

      const [payload, status] = handler.validationEndpoint(`Bearer ${token}`, {
        ...request(),
        accountNumber: "99999999",
      });

      expect(status).toBe(400);
      expect(payload.errorMessage).toBe("Invalid account number");
    });

    it("rejects a malformed body with 422", () => {
      const handler = createHandler();
      const token = issueToken(handler);

      const [payload, status] = handler.validationEndpoint(`Bearer ${token}`, {
        requestId: "abc",
      });

      expect(status).toBe(422);
      expect(payload.requestId).toBe("abc");
      expect(payload.errorMessage).toBeTruthy();
    });

    it("rejects non-object bodies with 422", () => {
      const handler = createHandler();
      const token = issueToken(handler);

      for (const bad of [null, undefined, "string", 42] as never[]) {
        const [payload, status] = handler.validationEndpoint(`Bearer ${token}`, bad);
        expect(status).toBe(422);
        expect(payload.errorMessage).toBeTruthy();
      }

      // Also without any authorization header — malformed body wins first.
      const [payload, status] = handler.validationEndpoint(null, null as never);
      expect(status).toBe(422);
      expect(payload.errorMessage).toBeTruthy();
    });

    it("rejects an expired token", () => {
      const handler = createHandler();
      const token = issueToken(handler);
      // Force the token to expire: manipulate private state via casting.
      (handler as unknown as { tokenExpiresAt: number }).tokenExpiresAt = Date.now() - 1;

      const [, status] = handler.validationEndpoint(`Bearer ${token}`, request());

      expect(status).toBe(401);
    });

    it("honours an explicit tokenTtl", () => {
      vi.useFakeTimers();
      try {
        const short = new C2BHakikishaHandler({ username: "u", password: "p", tokenTtl: 1 });
        const [payload, status] = short.tokenEndpoint(basic("u", "p"));
        expect(status).toBe(200);
        expect(short.isTokenValid(payload.access_token)).toBe(true);

        vi.advanceTimersByTime(1500);
        expect(short.isTokenValid(payload.access_token)).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("buildResponse", () => {
    it("builds a success payload with the echoed timestamp", () => {
      const response = C2BHakikishaHandler.buildResponse(
        "dcd1c2ab-7a26-4170-939d-9dc2e879b0e5",
        "Money Market Account",
        "66925336",
        "415010",
        "1728897681",
      );

      expect(response).toEqual({
        requestId: "dcd1c2ab-7a26-4170-939d-9dc2e879b0e5",
        timestamp: "1728897681",
        accountName: "Money Market Account",
        accountNumber: "66925336",
        shortcode: "415010",
      });
    });

    it("defaults the timestamp to now", () => {
      const response = C2BHakikishaHandler.buildResponse(
        "r1",
        "Account A",
        "1",
        "415010",
      );

      expect(typeof response.timestamp).toBe("number");
      expect(Math.abs(Number(response.timestamp) - Math.floor(Date.now() / 1000))).toBeLessThan(5);
    });
  });
});