import { MpesaApiClient } from "../client/client.js";
import type {
  BusinessBuyGoodsRequest,
  BusinessPayBillRequest,
  BusinessGoodsResponse,
} from "../types/index.js";

export class BusinessGoodsService {
  constructor(private readonly client: MpesaApiClient) {}

  async buyGoods(request: BusinessBuyGoodsRequest): Promise<BusinessGoodsResponse> {
    return this.client.post<BusinessGoodsResponse>(
      this.client.getEndpoint("B2B"),
      request,
    );
  }

  async payBill(request: BusinessPayBillRequest): Promise<BusinessGoodsResponse> {
    return this.client.post<BusinessGoodsResponse>(
      this.client.getEndpoint("B2B"),
      request,
    );
  }
}
