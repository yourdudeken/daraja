import { MpesaApiClient } from "../client/client.js";
import { generatePassword, generateTimestamp, Validation } from "../utils/index.js";
import { ValidationError } from "../errors/index.js";
import type {
  STKPushRequest,
  STKPushResponse,
  STKQueryRequest,
  STKQueryResponse,
  STKCallbackPayload,
  STKCallbackResult,
  TransactionType,
} from "../types/index.js";

const VALID_TRANSACTION_TYPES: readonly TransactionType[] = [
  "CustomerPayBillOnline",
  "CustomerBuyGoodsOnline",
] as const;

export class STKPushService {
  constructor(private readonly client: MpesaApiClient) {}

  async initiate(request: STKPushRequest): Promise<STKPushResponse> {
    const passkey = this.client.getConfig().passkey;

    if (!passkey) {
      throw new ValidationError("Passkey is required for STK Push.");
    }

    Validation.positiveNumber(request.BusinessShortCode, "BusinessShortCode");
    Validation.oneOf(request.TransactionType, "TransactionType", VALID_TRANSACTION_TYPES);
    Validation.amount(request.Amount, "Amount");
    Validation.phoneNumber(request.PartyA, "PartyA");
    Validation.phoneNumber(request.PartyB, "PartyB");
    Validation.phoneNumber(request.PhoneNumber, "PhoneNumber");
    Validation.validUrl(request.CallBackURL, "CallBackURL");
    Validation.maxLength(request.AccountReference, "AccountReference", 12);
    Validation.maxLength(request.TransactionDesc, "TransactionDesc", 13);

    const timestamp = request.Timestamp || generateTimestamp();
    const password = request.Password || generatePassword(
      request.BusinessShortCode,
      passkey,
      timestamp,
    );

    const payload: STKPushRequest = {
      ...request,
      Password: password,
      Timestamp: timestamp,
    };

    return this.client.post<STKPushResponse>(
      this.client.getEndpoint("STK_PUSH"),
      payload,
    );
  }

  async query(request: STKQueryRequest): Promise<STKQueryResponse> {
    const passkey = this.client.getConfig().passkey;
    if (!passkey) {
      throw new ValidationError("Passkey is required for STK Query.");
    }

    const timestamp = request.Timestamp || generateTimestamp();
    const password = request.Password || generatePassword(
      request.BusinessShortCode,
      passkey,
      timestamp,
    );

    const payload: STKQueryRequest = {
      ...request,
      Password: password,
      Timestamp: timestamp,
    };

    return this.client.post<STKQueryResponse>(
      this.client.getEndpoint("STK_QUERY"),
      payload,
    );
  }

  static parseCallback(payload: STKCallbackPayload): STKCallbackResult {
    const callback = payload.Body.stkCallback;
    const result: STKCallbackResult = {
      success: callback.ResultCode === 0,
      merchantRequestId: callback.MerchantRequestID,
      checkoutRequestId: callback.CheckoutRequestID,
      resultCode: callback.ResultCode,
      resultDescription: callback.ResultDesc,
    };

    if (callback.CallbackMetadata?.Item) {
      for (const item of callback.CallbackMetadata.Item) {
        switch (item.Name) {
          case "Amount":
            result.amount = Number(item.Value);
            break;
          case "MpesaReceiptNumber":
            result.receiptNumber = String(item.Value);
            break;
          case "TransactionDate":
            result.transactionDate = String(item.Value);
            break;
          case "PhoneNumber":
            result.phoneNumber = String(item.Value);
            break;
        }
      }
    }

    return result;
  }
}
