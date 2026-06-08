import { MpesaApiClient } from "../client/client.js";
import type { SwapRequest, SwapResponse } from "../types/index.js";

export class SwapService {
  constructor(private readonly client: MpesaApiClient) {}

  async transfer(request: SwapRequest): Promise<SwapResponse> {
    return this.client.post<SwapResponse>(
      this.client.getEndpoint("SWAP"),
      request,
    );
  }
}
