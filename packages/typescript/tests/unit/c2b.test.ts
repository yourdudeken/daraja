import { describe, it, expect, beforeEach, afterEach } from "vitest";
import nock from "nock";
import { MpesaApiClient } from "../../src/client/client.js";
import { C2BService } from "../../src/services/c2b.js";
import type { MpesaConfig } from "../../src/types/index.js";

const BASE = "https://sandbox.safaricom.co.ke";

function createClient(): MpesaApiClient {
  return new MpesaApiClient({
    consumerKey: "test-key",
    consumerSecret: "test-secret",
    environment: "sandbox",
    passkey: "test-passkey",
  } as MpesaConfig);
}

function mockAuth(token = "c2b-token") {
  nock(BASE)
    .get("/oauth/v1/generate")
    .query({ grant_type: "client_credentials" })
    .matchHeader("Authorization", /^Basic /)
    .reply(200, { access_token: token, expires_in: 3599 });
}

describe("C2B response doc key (OriginatorCoversationID)", () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("registerURL parses the documented OriginatorCoversationID wire key", async () => {
    mockAuth("c2b-register-token");
    nock(BASE)
      .post("/mpesa/c2b/v2/registerurl")
      .reply(200, {
        OriginatorCoversationID: "6e86-45dd-91ac-fd5d4178ab523408729",
        ResponseCode: "0",
        ResponseDescription: "Success",
      });

    const resp = await new C2BService(createClient()).registerURL({
      ShortCode: "600984",
      ResponseType: "Completed",
      ConfirmationURL: "https://example.com/confirm",
      ValidationURL: "https://example.com/validate",
    });

    expect(resp.OriginatorConversationID).toBe("6e86-45dd-91ac-fd5d4178ab523408729");
  });

  it("simulate parses the documented OriginatorCoversationID wire key", async () => {
    mockAuth("c2b-simulate-token");
    nock(BASE)
      .post("/mpesa/c2b/v2/simulate")
      .reply(200, {
        OriginatorCoversationID: "53e3-4aa8-9fe0-8fb5e4092cdd3405976",
        ResponseCode: "0",
        ResponseDescription: "Success",
      });

    const resp = await new C2BService(createClient()).simulate({
      ShortCode: 600984,
      CommandID: "CustomerPayBillOnline",
      Amount: 1,
      Msisdn: 254708374149,
      BillRefNumber: "Test Ref",
    });

    expect(resp.OriginatorConversationID).toBe("53e3-4aa8-9fe0-8fb5e4092cdd3405976");
  });
});