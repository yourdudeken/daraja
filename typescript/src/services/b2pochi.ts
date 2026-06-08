import { MpesaApiClient } from "../client/client.js";
import type { B2PochiRequest, B2PochiResponse } from "../types/index.js";

export class B2PochiService {
  constructor(private readonly client: MpesaApiClient) {}

  async send(request: B2PochiRequest): Promise<B2PochiResponse> {
    return this.client.post<B2PochiResponse>(
      this.client.getEndpoint("B2POCHI"),
      request,
    );
  }
}
