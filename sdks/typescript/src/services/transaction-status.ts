import { MpesaApiClient } from "../client/client.js";
import { ValidationError } from "../errors/index.js";
import type {
  TransactionStatusRequest,
  TransactionStatusResponse,
  MpesaResult,
} from "../types/index.js";

export class TransactionStatusService {
  constructor(private readonly client: MpesaApiClient) {}

  async query(request: TransactionStatusRequest): Promise<TransactionStatusResponse> {
    if (!request.TransactionID && !request.OriginalConversationID) {
      throw new ValidationError(
        "Either TransactionID or OriginalConversationID is required",
      );
    }
    const config = this.client.getConfig();
    const payload: TransactionStatusRequest = {
      ...request,
      SecurityCredential: request.SecurityCredential || config.securityCredential,
      Initiator: request.Initiator || config.initiatorName,
    };
    return this.client.post<TransactionStatusResponse>(
      this.client.getEndpoint("TRANSACTION_STATUS"),
      payload,
    );
  }

  static parseCallback(payload: MpesaResult): {
    success: boolean;
    resultCode: number;
    resultDescription: string;
    transactionStatus?: string;
    amount?: number;
    receiptNumber?: string;
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
      resultCode: result.ResultCode,
      resultDescription: result.ResultDesc,
      transactionStatus: details["TransactionStatus"] as string,
      amount: details["Amount"] as number,
      receiptNumber: details["ReceiptNo"] as string,
    };
  }
}
