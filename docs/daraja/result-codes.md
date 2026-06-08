# Daraja API Result Codes — Comprehensive Reference

All result codes returned in callback payloads across all Safaricom Daraja APIs, grouped by API.

---

## B2C Result Codes

Returned in the callback `Result.ResultCode` field. These apply to **B2C**, **B2Pochi**, and related disbursement APIs.

| ResultCode | ResultDesc | Explanation | Affected APIs |
|------------|------------|-------------|---------------|
| `0` | The service request is processed successfully. | The transaction has been processed successfully on M-PESA. | B2C, B2Pochi |
| `1` | The balance is insufficient for the transaction. | The B2C Utility account does not have enough money. | B2C, B2Pochi |
| `2` | Declined due to limit rule | The amount is smaller than the allowed minimum transaction amount. | B2C, B2Pochi |
| `3` | Declined due to limit rule: greater than the maximum transaction amount. | The amount exceeds the maximum allowed transaction amount (KES 250,000). | B2C, B2Pochi |
| `4` | Declined due to limit rule: would exceed daily transfer limit | The transaction would exceed the daily transfer limit (KES 500,000). | B2C, B2Pochi |
| `8` | Declined due to limit rule: would exceed the maximum balance. | Would exceed maximum customer account balance (KES 500,000). | B2C, B2Pochi |
| `11` | The DebitParty is in an invalid state. | The B2C account is not active. | B2C, B2Pochi, Reversals |
| `21` | The initiator is not allowed to initiate this request | API user lacks the ORG B2C API initiator role. | B2C, B2Pochi, Reversals |
| `2001` | The initiator information is invalid. | Wrong API username, wrong encrypted password, or wrong algorithm/certificate. | B2C, B2Pochi, B2B, Business Pay Bill, Business Buy Goods, B2C Top Up, Tax Remittance, Reversals |
| `2006` | Declined due to account rule: The account status does not allow this transaction. | The B2C account is not active. | B2C, B2Pochi, Reversals |
| `2028` | The request is not permitted according to product assignment. | The PartyA shortcode has no B2C permission. | B2C, B2Pochi, Reversals |
| `2040` | Credit Party customer type can't be supported by the service. | The customer is not an M-PESA registered customer. | B2C, B2Pochi |
| `8006` | The security credential is locked | API user password locked due to multiple failed attempts. | B2C, B2Pochi, Reversals |
| `SFC_IC0003` | The operator does not exist. | The phone number is invalid or does not exist on M-PESA. | B2C, B2Pochi, Transaction Status |

---

## Reversal Result Codes

Returned in the callback `Result.ResultCode` field for reversal requests.

| ResultCode | ResultDesc | Explanation | Affected APIs |
|------------|------------|-------------|---------------|
| `0` | The service request is processed successfully | Reversal processed successfully. | Reversals |
| `R000002` | The OriginalTransactionID is invalid | The TransactionID provided does not exist on M-PESA. | Reversals |
| `R000001` | The transaction has already been reversed | The TransactionID has already been reversed. | Reversals |
| `1` | The balance is insufficient | Shortcode does not have enough money to complete the reversal. | Reversals |

---

## C2B Validation Result Codes

Used in the **validation response** sent back from the merchant's Validation URL to accept/reject a C2B transaction.

| ResultCode | ResultDesc | Explanation | Affected APIs |
|------------|------------|-------------|---------------|
| `0` | Accepted | Accept the transaction. | C2B |
| `C2B00011` | Invalid MSISDN | The customer phone number is invalid. | C2B |
| `C2B00012` | Invalid Account Number | The account reference is invalid. | C2B |
| `C2B00013` | Invalid Amount | The transaction amount is invalid. | C2B |
| `C2B00014` | Invalid KYC Details | Customer KYC details are invalid. | C2B |
| `C2B00015` | Invalid Short code | The shortcode is invalid. | C2B |
| `C2B00016` | Other Error | Any other reason for rejection. | C2B |

**Usage:** To accept, send `ResultCode: "0"` with `ResultDesc: "Accepted"`. To reject, send any non-zero ResultCode (e.g., `C2B00011`) with `ResultDesc: "Rejected"`.

---

## M-Pesa Express (STK Push) Callback Result Codes

Returned in the callback `Body.stkCallback.ResultCode` field.

| ResultCode | ResultDesc | Explanation | Affected APIs |
|------------|------------|-------------|---------------|
| `0` | The service request is processed successfully. | Transaction completed successfully. | M-Pesa Express |
| `1032` | Request cancelled by user | Customer cancelled the STK push or it timed out. | M-Pesa Express |
| `1031` | STK push timeout | Customer did not enter PIN in time. | M-Pesa Express, Lipa na Bonga |
| `2001` | Wrong PIN entered / Initiator information invalid | Customer entered wrong M-PESA PIN. | M-Pesa Express, Lipa na Bonga |

---

## M-Pesa Express Query Result Codes

Returned in the `ResultCode` field of the query response.

| ResultCode | ResultDesc | Explanation | Affected APIs |
|------------|------------|-------------|---------------|
| `0` | The service request is processed successfully. | Transaction completed successfully. | M-Pesa Express Query |
| `1032` | Request cancelled by user | Transaction was cancelled by the user. | M-Pesa Express Query |

---

## Lipa na Bonga Result Codes

Returned in the `header.responseCode` field.

| ResponseCode | ResponseDescription | Explanation |
|--------------|---------------------|-------------|
| `6000` | Success | Request processed successfully. |
| `6001` | Fail | General failure. |
| `6004` | Server error | Internal server error. |
| `6005` | Invalid credentials passed | Authentication failed. |
| `6006` | Missing parts in the request body | Required parameters missing. |
| `6007` | CBS unavailable / System busy | Core banking system unavailable. |
| `6008` | STK unavailable / System busy | STK service unavailable. |
| `6009` | Broker unavailable / System busy | Broker service unavailable. |
| `1037` | DS timeout (Customer doesn't have STK applet) | Customer needs SIM card update. |
| `6011` | Database unavailable | Database service unavailable. |
| `2001` | Wrong PIN entered / Initiator information invalid | Wrong M-PESA PIN or invalid initiator. |
| `1031` | STK push timeout | Customer did not enter PIN in time. |
| `17` | Reversal fails, due to account balance limit | Reversal fails due to account balance limit (KES 100,000). |

---

## Transaction Status Result Codes

Returned in the callback `Result.ResultCode` field.

| ResultCode | ResultDesc | Explanation | Affected APIs |
|------------|------------|-------------|---------------|
| `0` | Success | Transaction status retrieved successfully. | Transaction Status |
| `SFC_IC0003` | The operator does not exist. | The operator/phone number does not exist on M-PESA. | Transaction Status |

---

## Account Balance Internal Error Codes

Returned in the `ApiResponse` / `ApiResult` messages during account balance queries.

| Error Code | Description | Message Type | Explanation |
|------------|-------------|--------------|-------------|
| `15` | Duplicate Detected | ApiResult | OriginatorConversationID already seen before. |
| `17` | Internal Failure | ApiResult | Catch-all for unidentified failures. |
| `18` | Initiator Credential Check Failure | ApiResult | Wrong password or encryption/decryption error. |
| `19` | Message Sequencing Failure | ApiResult | Request message out of sequence. |
| `20` | Unresolved Initiator | ApiResult | Initiator username cannot be found. |
| `21` | Initiator to Primary Party Permission Failure | ApiResult | Initiator lacks permission for the specified primary party. |
| `22` | Initiator to Receiver Party Permission Failure | ApiResult | Initiator is not currently active. |
| `24` | Missing mandatory fields | ApiResponse | Required input parameters are missing. |
| `25` | InvalidRequestParameters | ApiResponse | Parameter validation failed (type conversion error). |
| `26` | Traffic blocking condition in place | ApiResponse | System too busy. |
| `29` | InvalidCommand | ApiResponse | The CommandID specified is not defined. |

---

## M-Pesa Ratiba Error Codes

Returned in the callback `responseHeader.responseCode` field.

| ResponseCode | Description | Explanation |
|--------------|-------------|-------------|
| `0` | The service request is processed successfully | Standing order created successfully. |
| `1037` | DS timeout - user cannot be reached | No updated SIM, old SIM, or phone offline. |
| `1025` | Error sending push request | System error on partner platform. |
| `1032` | Request cancelled by user | STK push timed out or cancelled by user. |
| `2001` | Invalid initiator information or wrong PIN | Invalid password or wrong M-PESA PIN entered. |
| `1001` | Unable to lock subscriber | Existing USSD session or duplicate MSISDN. |
| `1050` | User already has a standing order with the same name | Duplicate standing order name on the customer profile. |
| `1051` | Bad request | One or more fields in the request payload are invalid. |

**Additional HTTP Response Codes (Ratiba):**

| Code | Meaning |
|------|---------|
| `200` | Request successful |
| `401` | Unauthorized request |
| `500` | System failure |

---

## Pull Transaction Response Codes

Returned in the `ResponseStatus` (register) and `ResponseCode` (query) fields.

| Code | Description | Explanation |
|------|-------------|-------------|
| `1000` | Shortcode Registered Successfully / Success, transactions fetched successfully | Registration or query successful. |
| `1001` | ShortCode already Registered / Null, No transactions available | Already registered, or no transactions in the selected time period. |

---

## Query Org Info Response Codes

Returned in the `ResponseCode` field.

| Code | Description | Explanation |
|------|-------------|-------------|
| `0` | Success, details fetched successfully | Organization info retrieved successfully. |
| `1` or any other | Rejecting the request | Request could not be processed. |
| `500` | Invalid parameter input | One or more parameters are invalid. |

---

## IMSI / Swap HTTP Status Codes

These APIs return standard HTTP status codes as result indicators.

| HTTP Status Code | Description | Explanation |
|------------------|-------------|-------------|
| `200` | Success | Request processed successfully. |
| `400` | Bad Request | Invalid syntax or parameters. |
| `401` | Unauthorized | Authentication required. |
| `403` | Forbidden | No access rights. |
| `404` | Not Found | Resource not found. |
| `405` | Method Not Allowed | Wrong HTTP method. |
| `408` | Request Timeout | Server did not receive complete request in time. |
| `429` | Too Many Requests | Rate limit exceeded. |
| `500` | Internal Server Error | Server encountered an error. |
| `501` | Not Implemented | Request method not supported. |
| `502` | Bad Gateway | Invalid upstream response. |
| `503` | Service Unavailable | Server down or overloaded. |
| `504` | Gateway Timeout | Upstream did not respond in time. |

---

## IoT SIM Management Status Codes

Returned in `body.statusCode` (query lifecycle) or `header.responseCode`.

| Code | Description | Explanation | Affected APIs |
|------|-------------|-------------|---------------|
| `200` | Success | Request processed successfully. | All IoT APIs |
| `0` | Active (statusCode) | SIM card is active on the network. | Query Life Cycle Status |

---

## Response Codes (Synchronous Acknowledgement)

These are returned in the immediate synchronous response (before the callback) across most APIs.

| ResponseCode | ResponseDescription | Explanation |
|--------------|---------------------|-------------|
| `0` | Accept the service request successfully. | Request accepted and queued for processing. |
| `1` | (various) | Request submission failed. |

---

## Quick Reference Table

| Category | Code Range / Pattern | Where Returned |
|----------|---------------------|----------------|
| B2C / B2Pochi Result Codes | `0`, `1`-`8`, `11`, `21`, `2001`, `2006`, `2028`, `2040`, `8006` | Callback `Result.ResultCode` |
| Reversal Result Codes | `0`, `R000001`, `R000002`, `1`, `11`, `21`, `2001`, `2006`, `2028`, `8006` | Callback `Result.ResultCode` |
| C2B Validation Codes | `0`, `C2B00011` - `C2B00016` | Validation URL response |
| M-Pesa Express Callback | `0`, `1032`, `1031`, `2001` | Callback `Body.stkCallback.ResultCode` |
| Lipa na Bonga | `6000`-`6011`, `1037`, `2001`, `1031`, `17` | Header `responseCode` |
| M-Pesa Ratiba | `0`, `1001`, `1025`, `1032`, `1037`, `1050`, `1051`, `2001` | Callback `responseHeader.responseCode` |
| Pull Transactions | `1000`, `1001` | `ResponseStatus` / `ResponseCode` |
| Query Org Info | `0`, `1`, `500` | `ResponseCode` |
| IMSI / Swap | Standard HTTP: `200`, `400`, `401`, `403`, `404`, `405`, `408`, `429`, `500`-`504` | `responseCode` (HTTP) |
| IoT SIM Management | `200`, `0` | `header.responseCode` / `body.statusCode` |
| Account Balance Internal | `15`-`29`, `100000000`-`100000011` | ApiResponse / ApiResult messages |
