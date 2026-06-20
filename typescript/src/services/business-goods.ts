import { MpesaApiClient } from "../client/client.js";
import type {
  BusinessBuyGoodsRequest,
  BusinessPayBillRequest,
  BusinessGoodsResponse,
} from "../types/index.js";

export class BusinessGoodsService {
  constructor(private readonly client: MpesaApiClient) {}

  async buyGoods(request: BusinessBuyGoodsRequest): Promise<BusinessGoodsResponse> {
    const config = this.client.getConfig();
    const payload: BusinessBuyGoodsRequest = {
      ...request,
      SecurityCredential: request.SecurityCredential || config.securityCredential,
      Initiator: request.Initiator || config.initiatorName,
    };
    return this.client.post<BusinessGoodsResponse>(
      this.client.getEndpoint("B2B"),
      payload,
    );
  }

  async payBill(request: BusinessPayBillRequest): Promise<BusinessGoodsResponse> {
    const config = this.client.getConfig();
    const payload: BusinessPayBillRequest = {
      ...request,
      SecurityCredential: request.SecurityCredential || config.securityCredential,
      Initiator: request.Initiator || config.initiatorName,
    };
    return this.client.post<BusinessGoodsResponse>(
      this.client.getEndpoint("B2B"),
      payload,
    );
  }
}
