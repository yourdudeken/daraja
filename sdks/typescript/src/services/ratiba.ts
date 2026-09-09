import { MpesaApiClient } from "../client/client.js";
import { RatibaRequest, RatibaResponse, RatibaCallbackResponse } from "../types/index.js";

export class RatibaService {
  constructor(private readonly client: MpesaApiClient) {}

  async createStandingOrder(request: RatibaRequest): Promise<RatibaResponse> {
    return this.client.post<RatibaResponse>(
      this.client.getEndpoint("RATIBA"),
      request,
    );
  }

  static parseCallback(payload: RatibaCallbackResponse): RatibaCallbackResponse {
    return payload;
  }
}
