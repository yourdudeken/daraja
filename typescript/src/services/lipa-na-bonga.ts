import { MpesaApiClient } from "../client/client.js";
import type { LipaNaBongaRequest, LipaNaBongaResponse } from "../types/index.js";

export class LipaNaBongaService {
  constructor(private readonly client: MpesaApiClient) {}

  async redeem(request: LipaNaBongaRequest): Promise<LipaNaBongaResponse> {
    return this.client.post<LipaNaBongaResponse>(
      this.client.getEndpoint("LIPA_NA_BONGA"),
      request,
    );
  }
}
