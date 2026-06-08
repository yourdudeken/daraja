import { MpesaApiClient } from "../client/client.js";
import type { PullTransactionsRequest, PullTransactionsResponse } from "../types/index.js";

export class PullTransactionsService {
  constructor(private readonly client: MpesaApiClient) {}

  async query(request: PullTransactionsRequest): Promise<PullTransactionsResponse> {
    return this.client.post<PullTransactionsResponse>(
      this.client.getEndpoint("PULL_TRANSACTIONS"),
      request,
    );
  }
}
