# B2B Express CheckOut

By Safaricom

This API enables merchants to initiate USSD Push to till enabling their fellow merchants to pay from their own till numbers to the vendors paybill.

**Endpoint:** `POST https://sandbox.safaricom.co.ke/v1/ussdpush/get-msisdn`

---

## Overview

B2B (UssdPush to Till) is a product for enabling merchants to initiate USSD Push to Till enabling their fellow merchants to pay from their owned till numbers to the vendor's paybill.

### Authentication and Authorization

Authentication happens at the Daraja (Apigee) layer by adding the product to your apps as explained in Daraja documentation where one obtains the consumer appKey and consumer appSecret.

### Flow Overview

1. The vendor initiates the USSD push, and the request is sent via Daraja.
2. Daraja communicates to the internal systems that send an STK push to the Merchant prompting the Merchant to pay.
3. Merchant inserts Operator ID and M-Pesa PIN for authentication and authorization.
4. M-Pesa confirms details, credits the vendor, and debits the merchant.
5. Daraja sends a callback response to the sender.

## How It Works

The vendor initiates a USSD push request to the merchant's till number. The merchant receives an STK push prompt on their phone, enters their Operator ID and M-Pesa PIN to authorize the payment. Upon successful authorization, the merchant's account is debited and the vendor's paybill account is credited.

## Getting Started

### Prerequisites

- Daraja Account on Safaricom Developer Portal
- Sandbox app with API credentials (Consumer Key & Consumer Secret)
- Test data from simulator section
- Live B2B merchant/till number for production
- Business Admin/Manager operators setup

### Good to Know

- The nominated number (MSISDN) of the organization operator is used for the USSD push trigger.
- The operator will be prompted to enter a Merchant ID and Merchant PIN for operations involving Organizations.

## Request Body

```json
{
  "primaryShortCode": "000001",
  "receiverShortCode": "000002",
  "amount": "100",
  "paymentRef": "paymentRef",
  "callbackUrl": "http://..../result",
  "partnerName": "Vendor",
  "RequestRefID": "{{random Unique Identifier For Each Request}}"
}
```

### Request Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| primaryShortCode | This is the debit party, the merchant's till (organization sending money) shortCode/tillNumber. | Number | 000001 |
| receiverShortCode | This is the credit party, the vendor (payBill Account) receiving the amount from the merchant. | Number | 000001 |
| amount | Amount to be sent to vendor. | Number | 100 |
| paymentRef | Reference to the payment being made. This will appear in the text for easy reference by the merchant. | Alphanumeric | paymentRef |
| callbackUrl | The endpoint from the vendor system that will be used to send back the confirmation response once the transaction has taken place and the vendor is credited. | URL | http://..../result |
| partnerName | Organization friendly name used by the vendor as known by the Merchant. | String | Vendor |
| RequestRefId | Random Unique Identifier sent by the vendor System. The value will be used to track the process across the different components. Generated at the Apigee level and the result returned in the acknowledgment. | AlphaNumeric | 550e8400-e29b-41d4-a716-446655440000 |

## Response Body (Acknowledgment)

Once the request is sent the vendor gets an acknowledgement of the sent request.

```json
{
  "code": "0",
  "status": "USSD Initiated Successfully"
}
```

### Response Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| resultCode | Shows if the push was successful (0) or if it failed (Customer Cancelled). | Number | 4001, 0 |
| resultDescription | Describe why the push was not finalized to the payment level. | AlphaNumeric | "User cancelled transaction", "The service request is processed successfully." |
| amount | The amount the vendor initiated to the merchant for Payment. | Number | 71 |
| requestId | The unique identifier of the request sent by the vendor. | String | "404e1aec-19e0-4ce3-973d-bd92e94c8021" |
| status | Status of the Transaction (Success/Failed). Complements the resultCode. | String | "SUCCESS" |
| transactionId | M-Pesa Receipt No of the transaction. Only applicable if the transaction is successful. | AlphaNumeric | "RDQ01NFT1Q" |

## Merchant Input Details

On a successful USSD Push trigger to the merchant, the debit party gets a prompt as shown:

> You are about to send Ksh {{amount}} to {{Vendor Friendly Name}} for payment reference: {{AccountNumber/BillReference}}.

1. Merchants are prompted to enter their operator ID.
2. Next, they are prompted to enter their operator PIN.
3. Vendor is prompted to accept the amount.
4. The merchant gets an acknowledgment and will receive a text once done.

## USSD Fail Callback Response

In case the USSD Push Acknowledgement was a fail, the vendor gets a callback sent to the callback URL.

### Cancelled Transaction

```json
{
  "resultCode": "4001",
  "resultDesc": "User cancelled transaction",
  "requestId": "c2a9ba32-9e11-4b90-892c-7bc54944609a",
  "amount": "71.0",
  "paymentReference": "MAndbubry3hi"
}
```

### Successful Transaction (M-Pesa Callback Response)

If successful, the customer-inserted OperatorId, PIN, and Confirmation to Pay are processed. M-Pesa transactions go forward, and on success/failure, the vendor gets a callback.

```json
{
  "resultCode": "0",
  "resultDesc": "The service request is processed successfully.",
  "amount": "71.0",
  "requestId": "404e1aec-19e0-4ce3-973d-bd92e94c8021",
  "resultType": "0",
  "conversationID": "AG_20230426_2010434680d9f5a73766",
  "transactionId": "RDQ01NFT1Q",
  "status": "SUCCESS"
}
```

### Failed Result Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| Result | The root parameter encloses the entire result message. | JSON Object | "Result":{} |
| ConversationId | Global unique identifier for the transaction request returned by M-Pesa upon successful request submission. | String | 236543-276372-2 |
| OriginatorConversationId | Global unique identifier for the transaction request returned by the API proxy upon successful request submission. | String | AG_2376487236_126732989KJHJKH |
| ResultDesc | Message from the API that gives the status of the request processing and maps to a specific result code value. | String | The initiator information is invalid. |
| ResultType | Status code that indicates whether the transaction was already sent to your listener. Usual value is 0. | Number | 0 |
| ResultCode | Numeric status code that indicates the status of the transaction processing. 0 means success and any other code means an error occurred or the transaction failed. | Number | 2001 |
| ResultParameters | JSON object that holds more details for the transaction in a key-value format. | JSON Object | {"ResultParameter":{"Key":"BOCompletedTime","Value":20200120164825}} |
| TransactionID | Unique M-PESA transaction ID for the payment request. A generic value is passed for certain failure scenarios. | String | OAK0000000 |
| ReferenceData | JSON object that holds more details for the transaction reference data. | JSON Object | "ReferenceData": {"ReferenceItem": []} |
| ReferenceItem | JSON array that holds JSON Objects with additional transaction details. | JSON Array | [{"Key": "BillReferenceNumber", "Value": "19008"}] |

## Error Response Parameter Definition

| Error | Possible Cause | Mitigation |
|-------|---------------|------------|
| 4104 | Missing Nominated Number (Number used for trigger Push gotten from M-Pesa) | Provide Nominated Number |
| 4102 | Merchant KYC Fail | Provide Valid KYC |
| 4201 | USSD Network Error | Stable Network |
| 4203 | USSD Exception Error | Stable Network |

## Organization Operations

The M-Pesa platform accepts the creation of multiple operators on a registered Shortcode. The different operators have different roles and different rule profiles.

- An organization operator is linked to a phone number (preferred MSISDN) where they receive actions done on the shortcode/till.
- The preferred MSISDN used by the operator acts on behalf of the organization.
- The operator will be prompted to enter a Merchant ID and Merchant PIN for operations involving Organizations.
- Transactions carried out for the shortcode/till from the operator are deducted from the till.
- The solution is limited to the operator whose phone number is under the Nominated Number under the Organization Details as configured in the M-Pesa Web Portal.

> **Note:** Access to the M-Pesa Web Portal Platform is given upon successful registration of a shortcode.

## Testing

### Option 1: Daraja Simulator
Create a test app and use the simulator which provides test data.

### Option 2: Postman
Use credentials to generate access token, then initiate a USSD push request.

**Sandbox Token Endpoint:** `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`

**Production Token Endpoint:** `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`

## Go Live

When ready for production:
1. Use production Consumer Key & Consumer Secret.
2. Update callback URLs to HTTPS production endpoints.
3. Generate production access tokens.
4. Use production merchant/vendor shortcodes.
5. Test with small amounts first.

## Support

- **Chatbot:** Daraja Chatbot for instant responses.
- **Email:** apisupport@safaricom.co.ke
