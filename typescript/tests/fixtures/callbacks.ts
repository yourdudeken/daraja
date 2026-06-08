import type { STKCallbackPayload, B2CCallbackPayload, MpesaResult } from "../../src/types/index.js";

export const stkCallbackSuccess: STKCallbackPayload = {
  Body: {
    stkCallback: {
      MerchantRequestID: "29115-34620561-1",
      CheckoutRequestID: "ws_CO_191220191020363925",
      ResultCode: 0,
      ResultDesc: "The service request is processed successfully.",
      CallbackMetadata: {
        Item: [
          { Name: "Amount", Value: 1.0 },
          { Name: "MpesaReceiptNumber", Value: "NLJ7RT61SV" },
          { Name: "TransactionDate", Value: 20191219102115 },
          { Name: "PhoneNumber", Value: 254708374149 },
        ],
      },
    },
  },
};

export const stkCallbackFailed: STKCallbackPayload = {
  Body: {
    stkCallback: {
      MerchantRequestID: "f1e2-4b95-a71d-b30d3cdbb7a7942864",
      CheckoutRequestID: "ws_CO_21072024125243250722943992",
      ResultCode: 1032,
      ResultDesc: "Request cancelled by user",
    },
  },
};

export const b2cCallbackSuccess: B2CCallbackPayload = {
  Result: {
    ResultType: 0,
    ResultCode: 0,
    ResultDesc: "The service request is processed successfully.",
    OriginatorConversationID: "53e3-4aa8-9fe0-8fb5e4092cdd3533373",
    ConversationID: "AG_20240706_2010364430d9bbdaf872",
    TransactionID: "SG632NMUAB",
    ResultParameters: {
      ResultParameter: [
        { Key: "TransactionAmount", Value: 10 },
        { Key: "TransactionReceipt", Value: "SG632NMUAB" },
        { Key: "ReceiverPartyPublicName", Value: "254705912645 - NICHOLAS JOHN SONGOK" },
        { Key: "TransactionCompletedDateTime", Value: "06.07.2024 22:48:52" },
        { Key: "B2CUtilityAccountAvailableFunds", Value: 8959269.6 },
        { Key: "B2CWorkingAccountAvailableFunds", Value: 1199371.0 },
        { Key: "B2CRecipientIsRegisteredCustomer", Value: "Y" },
        { Key: "B2CChargesPaidAccountAvailableFunds", Value: -1980.0 },
      ],
    },
    ReferenceData: {
      ReferenceItem: {
        Key: "QueueTimeoutURL",
        Value: "https://internalsandbox.safaricom.co.ke/mpesa/b2cresults/v1/submit",
      },
    },
  },
};

export const accountBalanceResult: MpesaResult = {
  Result: {
    ResultType: 0,
    ResultCode: 0,
    ResultDesc: "The service request is processed successfully",
    OriginatorConversationID: "16917-22577599-3",
    ConversationID: "AG_20200206_00005e091a8ec6b9eac5",
    TransactionID: "OA90000000",
    ResultParameters: {
      ResultParameter: [
        {
          Key: "AccountBalance",
          Value:
            "Working Account|KES|700000.00|700000.00|0.00|0.00&Float Account|KES|0.00|0.00|0.00|0.00&Utility Account|KES|228037.00|228037.00|0.00|0.00&Charges Paid Account|KES|-1540.00|-1540.00|0.00|0.00&Organization Settlement Account|KES|0.00|0.00|0.00|0.00",
        },
        { Key: "BOCompletedTime", Value: "20200109125710" },
      ],
    },
    ReferenceData: {
      ReferenceItem: {
        Key: "QueueTimeoutURL",
        Value: "https://internalsandbox.safaricom.co.ke/mpesa/abresults/v1/submit",
      },
    },
  },
};
