import { MpesaApiClient } from "../client/client.js";
import type { B2CRequest, B2CResponse, B2CCallbackPayload } from "../types/index.js";

export class B2CService {
  constructor(private readonly client: MpesaApiClient) {}

  async send(request: B2CRequest): Promise<B2CResponse> {
    const config = this.client.getConfig();
    const payload: B2CRequest = {
      ...request,
      SecurityCredential: request.SecurityCredential || config.securityCredential,
      InitiatorName: request.InitiatorName || config.initiatorName,
    };
    return this.client.post<B2CResponse>(
      this.client.getEndpoint("B2C"),
      payload,
    );
  }

  static parseCallback(payload: B2CCallbackPayload): {
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
