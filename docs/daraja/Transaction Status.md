# Transaction Status API

Check the status of an M-Pesa transaction.

**Endpoint:** `POST https://sandbox.safaricom.co.ke/mpesa/transactionstatus/v1/query`

## Overview

The Transaction Status API can be used as a secondary reconciliation mechanism when callbacks are not received. To check the status of a transaction, you are required to have either an M-Pesa Receipt number or an Originator Conversation ID of the transaction.

## How It Works

1. Organization sends the API request to check the status of an M-PESA transaction to Daraja.
2. Daraja authenticates the API call and pushes the request to the M-PESA system.
3. M-PESA checks the transaction status and responds to Daraja with the status.
4. Daraja pushes the response back to the organization.

> **Note:** This API is asynchronous and can be consumed over the internet, VPN, or Multiprotocol Switch.

## Getting Started

### Prerequisites

- Create a Daraja Account on the Safaricom Developer Portal.
- Create a sandbox app in the portal to get API credentials.
- Retrieve Consumer Key & Consumer Secret from your sandbox app on My Apps.

### Good to Know

This API is asynchronous. It is used to check the status of C2B, B2B, B2C, Reversal, and IMT transactions that happen on M-PESA.

### Authentication

You must first generate an access token to authenticate your API calls. See the generate access token API for details.

## Integration Steps

### Use Cases

Used to check the status of a transaction by an organization/merchant, especially for transactions that have a delayed callback. This helps them make an informed decision about whether the transaction was completed or not.

### Sequence Diagram

Refer to the transaction status sequence diagram on the Safaricom Developer Portal.

## Request Body

```json
{
  "Initiator": "testapiuser",
  "SecurityCredential": "ClONZiMYBpc65lmpJ7nvnrDmUe0WvHvA5QbOsPjEo92B6IGFwDdvdeJIFL0kgwsEKWu6SQKG4ZZUxjC",
  "CommandID": "TransactionStatusQuery",
  "TransactionID": "NEF61H8J60",
  "OriginalConversationID": "7071-4170-a0e5-8345632bad442144258",
  "PartyA": "600782",
  "IdentifierType": "4",
  "ResultURL": "http://myservice:8080/transactionstatus/result",
  "QueueTimeOutURL": "http://myservice:8080/timeout",
  "Remarks": "OK",
  "Occasion": "OK"
}
```

## Request Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| CommandID | Takes only the `TransactionStatusQuery` Command ID. | String | TransactionStatusQuery |
| PartyA | Organization/MSISDN receiving the transaction. | Numeric | Short code (6-9 digits) or MSISDN (12 Digits) |
| IdentifierType | Type of organization receiving the transaction. | Numeric | 4 – Organization shortcode |
| Remarks | Comments that are sent along with the transaction. | String | A sequence of characters up to 100 |
| Initiator | The name of the initiator initiating the request. | Alpha-Numeric | The credential/username used to authenticate the transaction request |
| SecurityCredential | Encrypted credential of the user getting transaction status. | String | Encrypted password for the initiator to authenticate the transaction request |
| QueueTimeOutURL | The path that stores information of a timeout transaction. | URL | https://ip:port or domain:port/path |
| TransactionID | Unique identifier to identify a transaction on M-Pesa. Also known as the M-Pesa Receipt Number. | Alpha-Numeric | LXXXXXX1234 |
| ResultURL | The path that stores information of a transaction. | URL | https://ip:port/path or domain:port/path |
| Occasion | Optional parameter. | String | A sequence of characters up to 100 |
| OriginalConversationID | The Originator Conversation ID of the transaction whose status is being checked. | String | 7071-4170-a0e5-8345632bad442144258 |

## Response Body

### Success Response

```json
{
  "OriginatorConversationID": "1236-7134259-1",
  "ConversationID": "AG_20210709_1234409f86436c583e3f",
  "ResponseCode": "0",
  "ResponseDescription": "Accept the service request successfully."
}
```

## Response Parameter Definition

| Name | Description | Parameter Type | Sample Value |
|------|-------------|----------------|--------------|
| OriginatorConversationID | The unique request ID for tracking a transaction. | Alpha-Numeric | 1236-7134259-1 |
| ConversationID | The unique request ID returned by M-PESA for each request made. | Alpha-Numeric | AG_20210709_1234409f86436c583e3f |
| ResponseCode | The numeric status code that indicates the status of transaction processing. 0 means success, any other code means an error occurred or the transaction failed. | Number | 0 |
| ResponseDescription | Response description message. | String | Accept the service request successfully |

## Callback Payload

After processing, feedback is sent to your specified ResultURL.

```json
{
  "Result": {
    "ConversationID": "AG_20180223_0000493344ae97d86f75",
    "OriginatorConversationID": "3213-416199-2",
    "ReferenceData": {
      "ReferenceItem": {
        "Key": "Occasion"
      }
    },
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "ResultParameters": {
      "ResultParameter": [
        {
          "Key": "DebitPartyName",
          "Value": "600310 - Safaricom333"
        },
        {
          "Key": "DebitPartyName",
          "Value": "254708374149 - John Doe"
        },
        {
          "Key": "OriginatorConversationID",
          "Value": "3211-416020-3"
        },
        {
          "Key": "InitiatedTime",
          "Value": "20180223054112"
        },
        {
          "Key": "DebitAccountType",
          "Value": "Utility Account"
        },
        {
          "Key": "DebitPartyCharges",
          "Value": "Fee For B2C Payment|KES|22.40"
        },
        {
          "Key": "ReasonType",
          "Value": "Business Payment to Customer via API"
        },
        {
          "Key": "TransactionStatus",
          "Value": "Completed"
        },
        {
          "Key": "FinalisedTime",
          "Value": "20180223054112"
        },
        {
          "Key": "Amount",
          "Value": "300"
        },
        {
          "Key": "ConversationID",
          "Value": "AG_20180223_000041b09c22e613d6c9"
        },
        {
          "Key": "ReceiptNo",
          "Value": "MBN31H462N"
        }
      ]
    },
    "ResultType": 0,
    "TransactionID": "MBN0000000"
  }
}
```

## Results Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| ConversationID | The unique identifier generated by M-PESA for a request. | String | AG_20180223_0000493344ae97d86f75 |
| OriginatorConversationID | The unique identifier of the request message. Auto-generated by M-PESA. Its value comes from the response message. Can be used to check the status of the transaction. | String | 3213-416199-2 |
| ReferenceData | Used to carry reference data that M-PESA need not analyze but needs to record into the transaction log. | ReferenceData | n/a |
| ReferenceItem | Used to carry reference data that M-PESA needs to record in the transaction log. | ParameterType | n/a |
| ResultCode | Indicates whether M-PESA processes the request successfully or not. Max length is 10. | String | 0 |
| ResultDesc | A description of the parameter Result Code. Max length is 1024. | String | The service request is processed successfully. |
| ResultParameters | Used to carry specific parameters for the transaction status query. | n/a | n/a |
| Key | Indicates a parameter name. | String | DebitPartyName |
| Value | Indicates a parameter value. | String | 600310 - Safaricom333 |
| ResultType | 0: completed, 1: waiting for further messages. | Integer | 0 |
| TransactionID | Unique identifier for the transaction. | String | MBN0000000 |

### Key Callback Parameters

| Key | Description |
|-----|-------------|
| DebitPartyName | Name of the debit party (organization or customer) |
| OriginatorConversationID | Original conversation ID of the transaction |
| InitiatedTime | When the transaction was initiated (YYYYMMDDHHmmss) |
| DebitAccountType | Type of account debited (e.g., Utility Account) |
| DebitPartyCharges | Fees charged for the transaction |
| ReasonType | Reason/type of transaction |
| TransactionStatus | Status of the transaction (Completed, Cancelled, Declined, Expired) |
| FinalisedTime | When the transaction was finalized (YYYYMMDDHHmmss) |
| Amount | Transaction amount |
| ReceiptNo | M-PESA receipt number |

## Error Codes

| Error | Possible Cause | Mitigation |
|-------|----------------|------------|
| 500.003.1001 Internal Server Error | Server failure | Make sure everything on your side is correctly set up as per the API and you are calling the correct endpoints |
| 400.003.01 Invalid Access Token | Wrong or expired access token | Regenerate a new token and use it before expiry |
| 400.003.02 Bad Request | Something is missing in the request | Make sure everything is set up as per API documentation |
| 500.003.03 Quota Violation | Sending multiple requests that violate TPS limit | Send a reasonable number of requests, ideally one at a time |
| 500.003.02 Spike Arrest Violation | Endpoints constantly generate many errors | Make sure your endpoint is running, responsive, and accessible over the internet |
| 404.003.01 Resource not found | The requested resource could not be found | Make sure you are calling the correct M-PESA API endpoint |
| 404.001.04 Invalid Authentication Header | Wrong HTTP method used | All M-PESA API requests are POST except Authorization API (GET) |
| 400.002.05 Invalid Request Payload | Request body is not properly drafted | Submit the correct request payload as shown in the sample, avoid typo errors |

### Response Codes

| Response Code | Response Description |
|---------------|---------------------|
| 0 | Success |

### Result Codes

| Result Code | Result Description |
|-------------|-------------------|
| 0 | Success |
| SFC_IC0003 | The operator does not exist |

## Transaction Statuses

All transactions have three statuses:

1. **Initiated** – Pending revalidation
2. **Authorized/Pending Authorized** – Depends on the validation requirements of the credit party
3. **Final status** (Cancelled, Declined, Completed, or Expired) – Dependent on failed pre-validation or validation, and/or delay of feedback from the credit party

## Testing

### Option 1: Daraja Simulator

Create a new test app under apps on the main nerve bar, select Transaction Status product. Once the app is successfully created, the simulator is automated to pick app credentials (Consumer key and Consumer Secret) and predefined test data. You can hit the simulate button.

> **Note:** The simulator can only be accessed when logged in. Please log in to your Daraja account to access the simulator.

### Option 2: Postman

Use the credentials to generate an access token using the below endpoint.

**Sandbox:** `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
**Production:** `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`

Initiate a transaction status query using the request body above. Key parameters: TransactionID or OriginalConversationID and PartyA.

> **Note:** The Postman collection can only be accessed when logged in. Please log in to your Daraja account to access the collection.

## Go Live

We've already tested and finished development. Now attach the integration to a live pay bill/till number.

Navigate to the GO LIVE tab. Fill in the below fields with live data. We require a short code of a live pay bill or till number, the organization name, and an M-PESA admin/manager username to successfully go live.

Upon successful go live, production endpoints will be sent to your developer email and the test sandbox app will be moved to production with production consumer key and secrets.

## Support

### Chatbot

Developers can get instant responses using the Daraja Chatbot for both development and production support.

### Production Issues & Incident Management

- **Incident Management Page:** Visit the Incident Management page on the Safaricom Developer Portal.
- **Email:** Reach out to API support at apisupport@safaricom.co.ke

## FAQs

**How can I test the Transaction Status API?**
Step 1: Access your app credentials (Consumer key and Consumer Secret) on Daraja.
Step 2: Generate an access token.
Step 3: Initiate a Transaction Status query using the payload with TransactionID or OriginalConversationID and PartyA.

**Can I query B2C and B2B transactions?**
Yes, Transaction Status can be used on C2B, B2B, B2C, IMT, or Reversal transactions.

**What are the different transaction statuses?**
All transactions have three statuses: Initiated, Authorized/Pending Authorized, and Final (Cancelled, Declined, Completed, or Expired).

**API reversal failing due to 'initiator information is invalid'?**
Use the correct API user (access channel-API) to initiate requests. Log in to the M-PESA portal and validate the correct username for the API operator. Also confirm the API User is in an Active state (not dormant).

**What is the process of creating an Initiator?**
Step 1: Create a Business Manager on the M-PESA portal.
Step 2: Create an API operator.
Step 3: Set the API user's password (valid for 90 days).

**How do I generate Security Credential?**
Encrypt the base64 encoded initiator password with M-Pesa's public key certificate using RSA algorithm with PKCS #1.5 padding (not OAEP). Convert the resulting encrypted byte array into a string using base64 encoding.

**What is a short code?**
A unique number allocated to a pay bill or buy goods organization through which they receive customer payments. It could be a Pay bill, Buy Goods, or Till Number.

**How do I log in to the M-PESA portal?**
Launch https://org.ke.m-pesa.com, enter your shortcode, Business Administrator username, first-time password, verification code, and OTP. Follow the prompts to set a new password and security questions.

**What should I do when the Business Administrator role is Dormant?**
Request activation by emailing M-PESABusiness@Safaricom.co.ke.
