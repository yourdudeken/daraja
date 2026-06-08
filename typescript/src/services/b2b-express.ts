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
    transactionId: string;
    resultCode: string;
    resultDescription: string;
    details?: Record<string, string | number>;
  } {
    const result = payload.Result;
    const details: Record<string, string | number> = {};

    if (result.ResultParameters?.ResultParameter) {
      for (const param of result.ResultParameters.ResultParameter) {
        details[param.Key] = param.Value;
      }
    }

    return {
      success: result.ResultCode === "0",
      transactionId: result.TransactionID,
      resultCode: result.ResultCode,
      resultDescription: result.ResultDesc,
      details: Object.keys(details).length > 0 ? details : undefined,
    };
  }
}
