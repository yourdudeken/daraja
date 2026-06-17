import { MpesaApiClient } from "../client/client.js";
import type { B2BExpressRequest, B2BExpressResponse, B2BExpressCallbackPayload } from "../types/index.js";

export class B2BExpressService {
  constructor(private readonly client: MpesaApiClient) {}

  async send(request: B2BExpressRequest): Promise<B2BExpressResponse> {
    return this.client.post<B2BExpressResponse>(
      this.client.getEndpoint("B2B_EXPRESS"),
      request,
    );
  }

  static parseCallback(payload: B2BExpressCallbackPayload): {
    success: boolean;
    resultCode: string;
    resultDescription: string;
    requestId: string;
    transactionId?: string;
    amount?: string;
    status?: string;
  } {
    return {
      success: payload.resultCode === "0",
      resultCode: payload.resultCode,
      resultDescription: payload.resultDesc,
      requestId: payload.requestId,
      transactionId: payload.transactionId,
      amount: payload.amount,
      status: payload.status,
    };
  }
}
