import { MpesaApiClient } from "../client/client.js";
import type { RatibaRequest, RatibaResponse } from "../types/index.js";

export class RatibaService {
  constructor(private readonly client: MpesaApiClient) {}

  async process(request: RatibaRequest): Promise<RatibaResponse> {
    return this.client.post<RatibaResponse>(
      this.client.getEndpoint("RATIBA"),
      request,
    );
  }
}
