import { MpesaApiClient } from "../client/client.js";
import type { B2BRequest, B2BResponse, MpesaResult } from "../types/index.js";

export class B2BService {
  constructor(private readonly client: MpesaApiClient) {}

  async send(request: B2BRequest): Promise<B2BResponse> {
    return this.client.post<B2BResponse>(
      this.client.getEndpoint("B2B"),
      request,
    );
  }

  static parseCallback(payload: MpesaResult): {
    success: boolean;
    transactionId: string;
    resultCode: number;
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
      success: result.ResultCode === 0,
      transactionId: result.TransactionID,
      resultCode: result.ResultCode,
      resultDescription: result.ResultDesc,
      details: Object.keys(details).length > 0 ? details : undefined,
    };
  }
}
