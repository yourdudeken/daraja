import { MpesaApiClient } from "../client/client.js";
import type { AgeOnNetworkRequest, AgeOnNetworkResponse } from "../types/index.js";

export class AgeOnNetworkService {
  constructor(private readonly client: MpesaApiClient) {}

  async check(request: AgeOnNetworkRequest): Promise<AgeOnNetworkResponse> {
    return this.client.post<AgeOnNetworkResponse>(
      this.client.getEndpoint("AGE_ON_NETWORK"),
      request,
    );
  }
}
