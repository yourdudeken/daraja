import { MpesaApiClient } from "../client/client.js";
import type {
  LipaNaBongaCalculateRequest,
  LipaNaBongaCalculateResponse,
  LipaNaBongaRedeemRequest,
  LipaNaBongaRedeemResponse,
} from "../types/index.js";

export class LipaNaBongaService {
  constructor(private readonly client: MpesaApiClient) {}

  async calculate(request: LipaNaBongaCalculateRequest): Promise<LipaNaBongaCalculateResponse> {
    return this.client.post<LipaNaBongaCalculateResponse>(
      this.client.getEndpoint("LIPA_NA_BONGA_CALCULATE"),
      request,
    );
  }

  async redeem(request: LipaNaBongaRedeemRequest): Promise<LipaNaBongaRedeemResponse> {
    return this.client.post<LipaNaBongaRedeemResponse>(
      this.client.getEndpoint("LIPA_NA_BONGA_REDEEM"),
      request,
    );
  }
}
