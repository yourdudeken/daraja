import { MpesaApiClient } from "../client/client.js";
import type {
  PullTransactionsRegisterRequest,
  PullTransactionsRegisterResponse,
  PullTransactionsQueryRequest,
  PullTransactionsQueryResponse,
} from "../types/index.js";

function normalizeRegisterResponse(
  raw: PullTransactionsRegisterResponse,
): PullTransactionsRegisterResponse {
  const source = raw as unknown as Record<string, unknown>;
  const status = source["ResponseStatus"] ?? source["Response Status"];
  const description =
    source["ResponseDescription"] ?? source["Response Description"];
  return {
    ...raw,
    ResponseStatus: typeof status === "string" ? status : "",
    ResponseDescription: typeof description === "string" ? description : "",
  };
}

export class PullTransactionsService {
  constructor(private readonly client: MpesaApiClient) {}

  async register(
    request: PullTransactionsRegisterRequest,
  ): Promise<PullTransactionsRegisterResponse> {
    const raw = await this.client.post<PullTransactionsRegisterResponse>(
      this.client.getEndpoint("PULL_TRANSACTIONS_REGISTER"),
      request,
    );
    return normalizeRegisterResponse(raw);
  }

  async query(
    request: PullTransactionsQueryRequest,
  ): Promise<PullTransactionsQueryResponse> {
    // The documented contract is POST for both pull-transactions endpoints
    // (`docs/apis/pull-transaction.md`); a GET carrying a body was neither
    // documented nor portable across HTTP clients.
    return this.client.post<PullTransactionsQueryResponse>(
      this.client.getEndpoint("PULL_TRANSACTIONS_QUERY"),
      request,
    );
  }
}
