import { MpesaApiClient } from "../client/client.js";
import type { BillManagerRequest, BillManagerResponse } from "../types/index.js";

export class BillManagerService {
  constructor(private readonly client: MpesaApiClient) {}

  async updateBill(request: BillManagerRequest): Promise<BillManagerResponse> {
    return this.client.post<BillManagerResponse>(
      this.client.getEndpoint("BILL_MANAGER"),
      request,
    );
  }
}
