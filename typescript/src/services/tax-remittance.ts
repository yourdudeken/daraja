import { MpesaApiClient } from "../client/client.js";
import type { TaxRemittanceRequest, TaxRemittanceResponse } from "../types/index.js";

export class TaxRemittanceService {
  constructor(private readonly client: MpesaApiClient) {}

  async remit(request: TaxRemittanceRequest): Promise<TaxRemittanceResponse> {
    return this.client.post<TaxRemittanceResponse>(
      this.client.getEndpoint("TAX_REMITTANCE"),
      request,
    );
  }
}
