import { randomUUID } from "node:crypto";
import { MpesaApiClient } from "../client/client.js";
import { ValidationError } from "../errors/index.js";
import { isPhoneNumberValid } from "../utils/index.js";
import type { B2CHakikishaRequest, B2CHakikishaResponse } from "../types/index.js";

const SHORTCODE_PATTERN = /^\d{5,7}$/;

export class B2CHakikishaService {
  constructor(private readonly client: MpesaApiClient) {}

  async validate(request: B2CHakikishaRequest): Promise<B2CHakikishaResponse> {
    if (!request.header.requestID) {
      request.header.requestID = randomUUID();
    }
    if (!request.header.timestamp) {
      request.header.timestamp = String(Math.floor(Date.now() / 1000));
    }

    if (!isPhoneNumberValid(request.body.msisdn)) {
      throw new ValidationError(
        `Invalid msisdn: must be in 254XXXXXXXXX format, got ${request.body.msisdn}`,
      );
    }
    if (!SHORTCODE_PATTERN.test(String(request.body.shortcode))) {
      throw new ValidationError(
        `Invalid shortcode: must be 5-7 digits, got ${request.body.shortcode}`,
      );
    }

    return this.client.post<B2CHakikishaResponse>(
      this.client.getEndpoint("B2C_HAKIKISHA"),
      request,
    );
  }
}