import { MpesaApiClient } from "../client/client.js";
import type { IoTSIMRequest, IoTSIMResponse } from "../types/index.js";

export class IoTSIMService {
  constructor(private readonly client: MpesaApiClient) {}

  async manage(request: IoTSIMRequest): Promise<IoTSIMResponse> {
    return this.client.post<IoTSIMResponse>(
      this.client.getEndpoint("IOT_MANAGE"),
      request,
    );
  }
}
