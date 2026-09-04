import { MpesaApiClient } from "../client/client.js";
import type { QueryOrgInfoRequest, QueryOrgInfoResponse } from "../types/index.js";

export class QueryOrgInfoService {
  constructor(private readonly client: MpesaApiClient) {}

  async query(request: QueryOrgInfoRequest): Promise<QueryOrgInfoResponse> {
    const payload = {
      IdentifierType: request.IdentifierType,
      Identifier: request.Identifier,
    };
    return this.client.post<QueryOrgInfoResponse>(
      this.client.getEndpoint("QUERY_ORG_INFO"),
      payload,
    );
  }
}
