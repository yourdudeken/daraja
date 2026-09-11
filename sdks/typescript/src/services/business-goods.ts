import { MpesaApiClient } from "../client/client.js";
import { Validation } from "../utils/index.js";
import type {
  BusinessBuyGoodsRequest,
  BusinessPayBillRequest,
  BusinessGoodsResponse,
} from "../types/index.js";

export class BusinessGoodsService {
  constructor(private readonly client: MpesaApiClient) {}

  async buyGoods(request: BusinessBuyGoodsRequest): Promise<BusinessGoodsResponse> {
    Validation.amount(request.Amount, "Amount");
    const config = this.client.getConfig();
    const payload: BusinessBuyGoodsRequest = {
      ...request,
      SecurityCredential: request.SecurityCredential || config.securityCredential,
      Initiator: request.Initiator || config.initiatorName,
      SenderIdentifierType: request.SenderIdentifierType ?? "4",
      RecieverIdentifierType: request.RecieverIdentifierType ?? "4",
    };
    return this.client.post<BusinessGoodsResponse>(
      this.client.getEndpoint("B2B"),
      payload,
    );
  }

  async payBill(request: BusinessPayBillRequest): Promise<BusinessGoodsResponse> {
    Validation.amount(request.Amount, "Amount");
    const config = this.client.getConfig();
    const payload: BusinessPayBillRequest = {
      ...request,
      SecurityCredential: request.SecurityCredential || config.securityCredential,
      Initiator: request.Initiator || config.initiatorName,
      SenderIdentifierType: request.SenderIdentifierType ?? "4",
      RecieverIdentifierType: request.RecieverIdentifierType ?? "4",
    };
    return this.client.post<BusinessGoodsResponse>(
      this.client.getEndpoint("B2B"),
      payload,
    );
  }
}
