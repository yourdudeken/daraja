import { MpesaApiClient } from "../client/client.js";
import type { ReversalRequest, ReversalResponse, MpesaResult } from "../types/index.js";

export class ReversalService {
  constructor(private readonly client: MpesaApiClient) {}

  async reverse(request: ReversalRequest): Promise<ReversalResponse> {
    const config = this.client.getConfig();
    const payload: ReversalRequest = {
      ...request,
      SecurityCredential: request.SecurityCredential || config.securityCredential,
      Initiator: request.Initiator || config.initiatorName,
    };
    return this.client.post<ReversalResponse>(
      this.client.getEndpoint("REVERSAL"),
      payload,
    );
  }

  static parseCallback(payload: MpesaResult): {
    success: boolean;
    transactionId: string;
    resultCode: number;
    resultDescription: string;
    originalTransactionId?: string;
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
      originalTransactionId: details["OriginalTransactionID"] as string,
    };
  }
}
