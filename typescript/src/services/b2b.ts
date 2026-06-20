import { MpesaApiClient } from "../client/client.js";
import type { B2CAccountTopUpRequest, B2CAccountTopUpResponse, MpesaResult } from "../types/index.js";

export class B2BService {
  constructor(private readonly client: MpesaApiClient) {}

  async topUp(request: B2CAccountTopUpRequest): Promise<B2CAccountTopUpResponse> {
    const config = this.client.getConfig();
    const payload: B2CAccountTopUpRequest = {
      ...request,
      SecurityCredential: request.SecurityCredential || config.securityCredential,
      Initiator: request.Initiator || config.initiatorName,
    };
    return this.client.post<B2CAccountTopUpResponse>(
      this.client.getEndpoint("B2C_ACCOUNT_TOP_UP"),
      payload,
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
