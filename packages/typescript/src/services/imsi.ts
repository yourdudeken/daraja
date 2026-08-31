import { MpesaApiClient } from "../client/client.js";
import type { IMSIRequest, IMSIResponse } from "../types/index.js";

export class IMSIService {
  constructor(private readonly client: MpesaApiClient) {}

  async query(request: IMSIRequest): Promise<IMSIResponse> {
    return this.client.post<IMSIResponse>(
      this.client.getEndpoint("IMSI"),
      request,
    );
  }
}
