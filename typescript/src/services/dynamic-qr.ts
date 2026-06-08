import { MpesaApiClient } from "../client/client.js";
import type { DynamicQRRequest, DynamicQRResponse } from "../types/index.js";

export class DynamicQRService {
  constructor(private readonly client: MpesaApiClient) {}

  async generate(request: DynamicQRRequest): Promise<DynamicQRResponse> {
    return this.client.post<DynamicQRResponse>(
      this.client.getEndpoint("DYNAMIC_QR"),
      request,
    );
  }

  getQRImageBase64(response: DynamicQRResponse): string {
    return response.QRCode;
  }

  getQRImageUrl(response: DynamicQRResponse): string {
    return `data:image/png;base64,${response.QRCode}`;
  }
}
