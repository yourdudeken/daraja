> DEPRECATED: This B2B API is deprecated in favor of **B2B Express CheckOut**.
> Please use [B2B Express CheckOut](B2B%20Express%20CheckOut.md) for the latest integration.

# Business to Business (B2B) API

> DEPRECATION NOTICE:** This API (`POST /mpesa/b2b/v1/paymentrequest`) is deprecated and replaced by [B2B Express CheckOut](B2B%20Express%20CheckOut.md). It remains available for existing integrations but new implementations should use B2B Express CheckOut.

**Endpoint:** `POST https://sandbox.safaricom.co.ke/mpesa/b2b/v1/paymentrequest`

**Production:** `POST https://api.safaricom.co.ke/mpesa/b2b/v1/paymentrequest`

---

## Overview

The B2B API enables you to pay for goods and services directly from your business account to a till number, merchant store number, or Merchant Head Office. You can also use this API to pay a merchant on behalf of a consumer/requester.

The transaction moves money from your MMF/Working account to the recipient's merchant account.

### Supported Business Use Cases

| CommandID | Use Case | Money Flow |
|-----------|----------|------------|
| `BusinessBuyGoods` | Pay for goods/services to a till number | Working Account → Merchant Account |
| `BusinessPayBill` | Pay bills to a paybill number | Working Account → Utility Account |
| `BusinessPayToBulk` | Top-up a B2C shortcode for disbursement | Working Account → Recipient Utility Account |
| `PayTaxToKRA` | Remit taxes to KRA | Working Account → KRA Account |
| `BusinessTransferFromMMFToUtility` | Move funds between own accounts | MMF/Working → Utility |

---

## Prerequisites

- Daraja Account on Safaricom Developer Portal
- Sandbox app with API credentials (Consumer Key & Consumer Secret)
- M-PESA API operator username with appropriate role:
  - **BusinessBuyGoods:** Org Business Buy Goods API initiator
  - **BusinessPayBill:** Org Business Pay Bill API initiator
  - **BusinessPayToBulk:** Org Business Pay to Bulk API initiator
  - **PayTaxToKRA:** Tax Remittance to KRA API role
- API operator password (encrypted with Security Credential)
- Live M-PESA PayBill/Till number (for production)

---

## How It Works

1. The organization prepares the B2B request with all required parameters.
2. The request is sent to the Daraja API gateway.
3. Daraja validates, authenticates, and authorizes the request.
4. Daraja forwards the validated request to M-PESA.
5. M-PESA processes the transaction internally.
6. The result is sent back to the organization's `ResultURL` via callback.

> **Note:** This API is **asynchronous**. You receive an immediate acknowledgement, but the final result is delivered via callback to your `ResultURL`.

---

## Request Body

```json
{
  "Initiator": "API_Usename",
  "SecurityCredential": "FKXl/KPzT8hFOnozI+unz7mXDgTRbrlrZ+C1Vblxpbz7jliLAFa0E/...../uO4gzUkABQuCxAeq+0Hd0A==",
  "Command ID": "BusinessBuyGoods",
  "SenderIdentifierType": "4",
  "RecieverIdentifierType": "4",
  "Amount": "239",
  "PartyA": "123456",
  "PartyB": "000000",
  "AccountReference": "353353",
  "Requester": "254700000000",
  "Remarks": "OK",
  "QueueTimeOutURL": "https://mydomain.com/b2b/businessbuygoods/queue/",
  "ResultURL": "https://mydomain.com/b2b/businessbuygoods/result/"
}
```

---

## Request Parameter Definition

| Parameter | Description | Type | Required | Sample Value |
|-----------|-------------|------|----------|--------------|
| `CommandID` | Transaction type: `BusinessPayBill`, `BusinessBuyGoods`, `BusinessPayToBulk`, `PayTaxToKRA` | String | Yes | BusinessPayBill |
| `Initiator` | M-PESA API operator username (must have the appropriate API role) | String | Yes | API_Username |
| `SecurityCredential` | Encrypted API operator password (RSA with PKCS #1.5 padding, base64 encoded) | String | Yes | FKXl/KPzT8hFOno... |
| `PartyA` | Organization shortcode from which money will be deducted | Number | Yes | 123456 |
| `SenderIdentifierType` | Type of sender shortcode (only `4` supported) | Number | Yes | 4 |
| `PartyB` | Recipient shortcode to which money will be credited | Number | Yes | 000000 |
| `RecieverIdentifierType` | Type of receiver shortcode (only `4` supported) | Number | Yes | 4 |
| `Amount` | Transaction amount | Number | Yes | 300 |
| `AccountReference` | Account reference associated with the payment (up to 13 chars) | String | Yes | ACC#03929/4yu |
| `Requester` | Consumer's mobile number on whose behalf the payment is made | Mobile | No | 254700000000 |
| `Remarks` | Additional information (2-100 characters) | String | Yes | OK |
| `QueueTimeOutURL` | URL for timeout notification | URL | Yes | https://ip:port/path |
| `ResultURL` | URL for transaction result callback | URL | Yes | https://ip:port/path |
| `Occassion` | Additional optional information (1-100 characters) | String | No | Any string |

---

## Response Body (Synchronous Acknowledgement)

```json
{
  "OriginatorConversationID": "5118-111210482-1",
  "ConversationID": "AG_20230420_2010759fd5662ef6d054",
  "ResponseCode": "0",
  "ResponseDescription": "Accept the service request successfully."
}
```

| Parameter | Description | Type | Sample Value |
|-----------|-------------|------|--------------|
| `OriginatorConversationID` | Unique request identifier assigned by Daraja | String | 5118-111210482-1 |
| `ConversationID` | Unique request identifier assigned by M-PESA | String | AG_20230420_2010759fd5662ef6d054 |
| `ResponseCode` | Status code (`0` = successful submission) | String | 0 |
| `ResponseDescription` | Descriptive message of the request submission status | String | Accept the service request successfully. |

---

## Successful Result Callback

After processing, the result is sent to your `ResultURL`:

```json
{
  "Result": {
    "ResultType": "0",
    "ResultCode": "0",
    "ResultDesc": "The service request is processed successfully",
    "OriginatorConversationID": "626f6ddf-ab37-4650-b882-b1de92ec9aa4",
    "ConversationID": "12345677dfdf89099B3",
    "TransactionID": "QKA81LK5CY",
    "ResultParameters": {
      "ResultParameter": [
        { "Key": "DebitAccountBalance", "Value": "{Amount={CurrencyCode=KES, MinimumAmount=618683, BasicAmount=6186.83}}" },
        { "Key": "Amount", "Value": "190.00" },
        { "Key": "DebitPartyAffectedAccountBalance", "Value": "Working Account|KES|346568.83|6186.83|340382.00|0.00" },
        { "Key": "TransCompletedTime", "Value": "20221110110717" },
        { "Key": "DebitPartyCharges", "Value": "" },
        { "Key": "ReceiverPartyPublicName", "Value": "000000 - Biller Company" },
        { "Key": "Currency", "Value": "KES" },
        { "Key": "InitiatorAccountCurrentBalance", "Value": "{Amount={CurrencyCode=KES, MinimumAmount=618683, BasicAmount=6186.83}}" }
      ]
    },
    "ReferenceData": {
      "ReferenceItem": [
        { "Key": "BillReferenceNumber", "Value": "19008" },
        { "Key": "QueueTimeoutURL", "Value": "https://mydomain.com/b2b/businessbuygoods/queue/" }
      ]
    }
  }
}
```

### Successful Result Parameter Definition

| Parameter | Description | Type | Sample Value |
|-----------|-------------|------|--------------|
| `Result` | Root parameter enclosing the entire result message | JSON Object | `{"Result":{}}` |
| `ResultType` | Status code (`0` = sent to listener) | Number | 0 |
| `ResultCode` | Transaction result code (`0` = success) | Number | 0 |
| `ResultDesc` | Descriptive message for the transaction result | String | The service request is processed successfully. |
| `OriginatorConversationID` | Unique identifier from API proxy | String | AG_2376487236_126732989KJHJKH |
| `ConversationID` | Unique identifier from M-PESA | String | 236543-276372-2 |
| `TransactionID` | Unique M-PESA transaction ID / receipt number | String | LHG31AA5TX |
| `ResultParameters` | JSON object with additional transaction details | JSON Object | |
| `Amount` | The transaction amount that was transacted | Number | 190.00 |
| `TransCompletedTime` | 14-digit completion timestamp (YYYYMMDDHHmmss) | Number | 20221110110717 |
| `ReceiverPartyPublicName` | Public name of the credit party | String | 600000 - saf test org |
| `DebitPartyCharges` | Transaction fee deducted (empty if none) | Number | 1 |
| `Currency` | Currency code | String | KES |
| `DebitPartyAffectedAccountBalance` | Account balance after debit (pipe-delimited) | String | Working Account\|KES\|346568.83\|... |
| `DebitAccountCurrentBalance` | Current balance of the debited account | String | {Amount={...}} |
| `InitiatorAccountCurrentBalance` | Current balance of the initiator account | String | {Amount={...}} |
| `ReferenceData` | JSON object with reference data | JSON Object | |
| `ReferenceItem` | Array of key-value reference pairs | JSON Array | |

---

## Unsuccessful Result Callback

```json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": 2001,
    "ResultDesc": "The initiator information is invalid.",
    "OriginatorConversationID": "12337-23509183-5",
    "ConversationID": "AG_20200120_0000657265d5fa9ae5c0",
    "TransactionID": "OAK0000000",
    "ResultParameters": {
      "ResultParameter": { "Key": "BOCompletedTime", "Value": 20200120164825 }
    },
    "ReferenceData": {
      "ReferenceItem": { "Key": "QueueTimeoutURL", "Value": "https://internalapi.safaricom.co.ke/mpesa/abresults/v1/submit" }
    }
  }
}
```

### Failed Result Parameter Definition

| Parameter | Description | Type | Sample Value |
|-----------|-------------|------|--------------|
| `Result` | Root parameter enclosing the result message | JSON Object | `{"Result":{}}` |
| `ConversationID` | Global unique identifier from M-PESA | String | 236543-276372-2 |
| `OriginatorConversationID` | Global unique identifier from API proxy | String | AG_2376487236_126732989KJHJKH |
| `ResultDesc` | Message describing the request processing status | String | The initiator information is invalid. |
| `ResultType` | Status code (usually `0`) | Number | 0 |
| `ResultCode` | Numeric status code (`0` = success, others = failure) | Number | 2001 |
| `ResultParameters` | JSON object with additional transaction details | JSON Object | |
| `TransactionID` | Unique M-PESA transaction ID (generic for failures) | String | OAK0000000 |
| `ReferenceData` | JSON object with reference data | JSON Object | |

---

## Result Codes

| ResultCode | ResultDesc | Explanation |
|------------|------------|-------------|
| `0` | The service request is processed successfully. | Transaction processed successfully on M-PESA. |
| `1` | The balance is insufficient for the transaction. | The account does not have enough funds. |
| `2` | Declined due to limit rule | Amount is below minimum transaction limit. |
| `3` | Declined due to limit rule: greater than the maximum transaction amount. | Amount exceeds maximum transaction limit. |
| `11` | The DebitParty is in an invalid state. | The organization account is not active. |
| `21` | The initiator is not allowed to initiate this request | API user does not have the required role. |
| `2001` | The initiator information is invalid. | Wrong API user credentials or encryption. |
| `2006` | Declined due to account rule | The account is not active. |
| `2028` | The request is not permitted according to product assignment. | Shortcode lacks required permissions. |
| `8006` | The security credential is locked | API user password is locked. |

---

## Error Codes

| Error Code | Error Message | Possible Cause | Mitigation |
|------------|---------------|----------------|------------|
| `400.003.01` | Invalid Access Token | Expired or wrong access token | Regenerate access token |
| `400.002.02` | Bad Request - Invalid XXXX | Missing or wrong parameter | Verify request payload matches documentation |
| `400.002.05` | Invalid Request Payload | Malformed request body | Submit the correct payload structure |
| `404.001.03` | Invalid Access Token | Token expired | Regenerate before 1-hour expiry |
| `404.001.01` | Resource not found | Wrong API endpoint | Verify endpoint URL |
| `405.001` | Method Not Allowed | Wrong HTTP method | Use POST |
| `500.003.1001` | Internal Server Error | Server failure | Ensure correct setup, retry |
| `500.003.02` | Spike Arrest Violation | Exceeding TPS limit | Reduce request rate |
| `500.003.03` | Quota Violation | Exceeding API quota | Reduce request rate |

---

## Testing

### Option 1: Daraja Simulator

1. Log in to Daraja Portal
2. Create a test app with the B2B product
3. Use predefined test credentials and shortcodes
4. Click "Simulate" to test

### Option 2: Postman

1. Generate access token via Authorization API
2. Construct the B2B request body with test data
3. Set `Content-Type: application/json`
4. Set `Authorization: Bearer {access_token}`
5. POST to sandbox endpoint

**Sandbox:** `https://sandbox.safaricom.co.ke/mpesa/b2b/v1/paymentrequest`

---

## Go Live

### Requirements

- Live M-PESA Pay Bill or Till Number
- M-PESA Organization Portal access with Business Admin/Manager operators
- API operator with the correct role assigned
- Publicly accessible HTTPS callback URLs

### Steps

1. Navigate to "GO LIVE" tab on Daraja Portal
2. Enter your live shortcode, organization name, and M-PESA admin username
3. An OTP is sent to the phone number linked in the M-PESA portal
4. Upon successful go-live, production credentials and endpoints are emailed

**Production Endpoint:** `https://api.safaricom.co.ke/mpesa/b2b/v1/paymentrequest`

---

## Best Practices

- **Unique OriginatorConversationID:** Always generate a unique ID per request to prevent duplicate processing.
- **Security Credential:** Reuse the same encrypted credential for multiple requests. Regenerate only when the password changes.
- **Error Handling:** Implement retry logic with exponential backoff for transient errors.
- **Callback Robustness:** Ensure your `ResultURL` and `QueueTimeOutURL` are publicly accessible and always available.
- **Reconciliation:** Use Transaction Status API as a secondary reconciliation mechanism.
- **Logging:** Log all request and response payloads for audit trail.

---

## Support

- **Email:** apisupport@safaricom.co.ke
- **M-PESA Business Onboarding:** M-PESABusiness@Safaricom.co.ke
- **Chatbot:** Daraja Chatbot on the developer portal
- **Incident Management:** Self-service portal on Daraja
