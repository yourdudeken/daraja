import { MpesaApiClient } from "../client/client.js";
import type { TaxRemittanceRequest, TaxRemittanceResponse } from "../types/index.js";

export class TaxRemittanceService {
  constructor(private readonly client: MpesaApiClient) {}

  async remit(request: TaxRemittanceRequest): Promise<TaxRemittanceResponse> {
    const config = this.client.getConfig();
    const payload: TaxRemittanceRequest = {
      ...request,
      SecurityCredential: request.SecurityCredential || config.securityCredential,
      Initiator: request.Initiator || config.initiatorName,
    };
    return this.client.post<TaxRemittanceResponse>(
      this.client.getEndpoint("TAX_REMITTANCE"),
      payload,
    );
  }
}
