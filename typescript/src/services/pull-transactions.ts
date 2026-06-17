import { MpesaApiClient } from "../client/client.js";
import type {
  PullTransactionsRegisterRequest,
  PullTransactionsRegisterResponse,
  PullTransactionsQueryRequest,
  PullTransactionsQueryResponse,
} from "../types/index.js";

export class PullTransactionsService {
  constructor(private readonly client: MpesaApiClient) {}

  async register(
    request: PullTransactionsRegisterRequest,
  ): Promise<PullTransactionsRegisterResponse> {
    return this.client.post<PullTransactionsRegisterResponse>(
      this.client.getEndpoint("PULL_TRANSACTIONS_REGISTER"),
      request,
    );
  }

  async query(
    request: PullTransactionsQueryRequest,
  ): Promise<PullTransactionsQueryResponse> {
    return this.client.post<PullTransactionsQueryResponse>(
      this.client.getEndpoint("PULL_TRANSACTIONS_QUERY"),
      request,
    );
  }
}
