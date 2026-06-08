# Reversals API

Reverses an M-Pesa transaction.

**Endpoint:** `POST https://sandbox.safaricom.co.ke/mpesa/reversal/v1/request`

## Overview

The Reversals API enables the reversal of Customer-to-Business (C2B) transactions.

## How It Works

1. The organization sends a reversal request via the Daraja API Gateway.
2. The gateway authenticates and forwards the request to the M-PESA system.
3. M-PESA processes the reversal, refunds the customer, sends an SMS notification, and returns the result through Daraja to the organization.

> **Note:** This API is asynchronous and can be consumed over the internet, VPN, or Multiprotocol Switch.

## Getting Started

### Prerequisites

- Create a Daraja Account on the Safaricom Developer Portal.
- Create a sandbox app to get API credentials.
- Retrieve Consumer Key & Consumer Secret from your sandbox app on My Apps.
- Test data is available in the simulator section.
- For production, ensure you have a live pay bill/till number with Business Admin/Manager operators created.

### Good to Know

This API is asynchronous. It is used to check the status of C2B, B2B, B2C, Reversal, and IMT transactions that happen on M-PESA.

### Authentication

You must first generate an access token to authenticate your API calls. See the generate access token API for details.

## Integration Steps

### Use Cases

- Reverse an erroneous payment made to your M-PESA Collection Account (Pay bill or Till number)
- Reverse double payments
- Reverse payments where services were not fulfilled

### Sequence Diagram

Refer to the reversal sequence diagram on the Safaricom Developer Portal.

## Request Body

```json
{
  "Initiator": "apiop37",
  "SecurityCredential": "jUb+dOXJiBDui8FnruaFckZJQup3kmmCH5XJ4NY/Oo3KaUTmJbxUiVgzBjqdL533u5Q435MT2VJwr/ /1fuZvA===",
  "CommandID": "TransactionReversal",
  "TransactionID": "PDU91HIVIT",
  "Amount": "200",
  "ReceiverParty": "603021",
  "RecieverIdentifierType": "11",
  "ResultURL": "https://mydomain.com/reversal/result",
  "QueueTimeOutURL": "https://mydomain.com/reversal/queue",
  "Remarks": "Payment reversal"
}
```

## Request Parameter Definition

| Parameter | Description | Type | Required | Sample Value |
|-----------|-------------|------|----------|--------------|
| Initiator | Username of the API user created on M-PESA portal | String | Yes | johndoe |
| SecurityCredential | Encrypted password for the API user | String | Yes | RC6E9WDx9X2c6z3gp0oC5Th== |
| CommandID | Only `TransactionReversal` is allowed | String | Yes | TransactionReversal |
| Amount | Transaction amount | Numeric | Yes | 100 |
| ReceiverParty | Organization Short Code | Numeric | Yes | 600997 |
| RecieverIdentifierType | Type of Organization (should be `11`) | Numeric | Yes | 11 |
| Remarks | Additional information (2-100 characters) | String | Yes | Any string |
| QueueTimeOutURL | URL for timeout notification | URL | Yes | https://mydomain.com/reversal/timedout |
| ResultURL | URL for result notification | URL | Yes | https://mydomain.com/reversal/result |
| TransactionID | M-PESA Receipt Number for the transaction being reversed | String | Yes | PDU91HIVIT |

## Response Body

### Success Response

```json
{
  "OriginatorConversationID": "f1e2-4b95-a71d-b30d3cdbb7a7735297",
  "ConversationID": "AG_20210706_20106e9209f64bebd05b",
  "ResponseCode": "0",
  "ResponseDescription": "Accept the service request successfully."
}
```

## Response Parameter Definition

| Parameter | Description | Sample Value | Type |
|-----------|-------------|--------------|------|
| ConversationID | Unique global identifier for the transaction request | 4f31-fd2d5deb744c | String |
| OriginatorConversationID | Unique identifier for the transaction request from M-PESA | AG_20210706_2010ead4245 | String |
| ResponseCode | Status code (0 = success, others = error) | 0 | Numeric |
| ResponseDescription | Acknowledgment message | Accept the service request successfully | String |

## Callback Result Payload

After processing, feedback is sent to your specified ResultURL.

### Successful Callback

```json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "dad6-4c34-8787-c8cb963a496d1268232",
    "ConversationID": "AG_20211114_201018edbbf9f1582eaa",
    "TransactionID": "SKE52PAWR9",
    "ResultParameters": {
      "ResultParameter": [
        {
          "Key": "DebitAccountBalance",
          "Value": "Utility Account|KES|7722179.62|7722179.62|0.00|0.00"
        },
        { "Key": "Amount", "Value": 1.0 },
        { "Key": "TransCompletedTime", "Value": 20211114132711 },
        { "Key": "OriginalTransactionID", "Value": "SKC82PACB8" },
        { "Key": "Charge", "Value": 0.0 },
        {
          "Key": "CreditPartyPublicName",
          "Value": "254705912645 - NICHOLAS JOHN SONGOK"
        },
        {
          "Key": "DebitPartyPublicName",
          "Value": "600992 - Safaricom Daraja 992"
        }
      ]
    },
    "ReferenceData": {
      "ReferenceItem": {
        "Key": "QueueTimeoutURL",
        "Value": "https://internalsandbox.safaricom.co.ke/mpesa/reversalresults/v1/submit"
      }
    }
  }
}
```

### Unsuccessful Callback

```json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": "R000002",
    "ResultDesc": "The OriginalTransactionID is invalid.",
    "OriginatorConversationID": "3124-481d-b706-10bdd6fbc8e21792398",
    "ConversationID": "AG_20211114_2010573069aefb6b625a",
    "TransactionID": "SKE0000000",
    "ReferenceData": {
      "ReferenceItem": {
        "Key": "QueueTimeoutURL",
        "Value": "https://internalsandbox.safaricom.co.ke/mpesa/reversalresults/v1/submit"
      }
    }
  }
}
```

## Response Parameter Definition (Callback)

| Parameter | Description | Type | Optional | Sample Value |
|-----------|-------------|------|----------|--------------|
| Result | Root parameter for the result message | JSON Object | No | {} |
| ResultType | Status code (usually 0) | Numeric | No | 0 |
| ResultCode | Status code (0 = success, others = failure) | String | No | 0 |
| ResultDesc | Status message | String | No | The service request is processed successfully. |
| OriginatorConversationID | Unique identifier for the reversal request | String | No | 53e3-4aa8-9fe0-8fb5e4092cdd3544366 |
| ConversationID | Unique identifier from M-PESA | String | No | AG_20210707_20106f7a33 |
| TransactionID | M-PESA Receipt Number for the reversal request | String | No | SKE52PAWR9 |
| ResultParameters | Additional transaction details | JSON Object | Yes | {} |
| DebitAccountBalance | Account balances (format: Account Type\|Currency\|...) | String | Yes | Utility Account\|KES\|7722179.62 |
| Amount | Transaction amount | Decimal | Yes | 1.00 |
| TransCompletedTime | Completion time (YYYYMMDDhhmmss) | String | Yes | 20211114132711 |
| OriginalTransactionID | TransactionID of the transaction to be reversed | String | Yes | SKC82PACB8 |
| Charge | Total fee amount | String | Yes | 0.00 |
| CreditPartyPublicName | Credit Party public name | String | Yes | 254705912645 - NICHOLAS JOHN SONGOK |
| DebitPartyPublicName | Debit Party public name | String | Yes | 600992 - Safaricom Daraja 992 |
| ReferenceData | Additional request details | JSON Object | Yes | {} |

## Error Codes

### Result Codes

| ResultCode | ResultDesc | Explanation |
|-----------|-----------|-------------|
| 0 | The service request is processed successfully | Request processed successfully on M-PESA |
| R000002 | The OriginalTransactionID is invalid | The TransactionID provided is invalid or does not exist on M-PESA |
| R000001 | The transaction has already been reversed | The TransactionID provided is already reversed |
| 11 | The DebitParty is in an invalid state | The organization/short code account is not active |
| 21 | The initiator is not allowed to initiate | API user lacks Org Reversals Initiator API role |
| 2001 | The initiator information is invalid | API user credentials are invalid |
| 2006 | Declined due to account rule | Organization/short code account is not active |
| 2028 | Not permitted according to product assignment | Short code has no permission to perform the request |
| 8006 | The security credential is locked | API user password is locked |
| 1 | The balance is insufficient | Short code does not have enough money to complete the request |

### Error Response Example

```json
{
  "requestId": "94fc-460e-a970-797968bf6a851272619",
  "errorCode": "400.002.02",
  "errorMessage": "Bad Request - Invalid TransactionID"
}
```

| Parameter | Description | Sample Value | Type |
|-----------|-------------|--------------|------|
| requestId | Unique identifier assigned by API | 30764-19833054-1 | String |
| errorCode | Unique error code | 400.002.02 | String |
| errorMessage | Descriptive message of failure | Bad Request - Invalid TransactionID | String |

### Error Response Codes

| errorCode | errorMessage | Mitigation | HTTP Code |
|-----------|-------------|------------|-----------|
| 404.001.03 | Invalid Access Token | Regenerate a new access token and use it before expiry | 404 |
| 400.002.02 | Bad Request – Invalid XXXX | Ensure the request payload is set as per API documentation | 400 |
| 404.001.01 | Resource not found | Make sure you are calling the correct API endpoint | 404 |
| 500.001.1001 | Internal Server Error | Ensure the request payload is set as per API documentation | 500 |
| 500.003.02 | Spike Arrest Violation | Avoid sending multiple requests that violate API TPS limit | 500 |
| 500.003.03 | Quota Violation | Avoid sending multiple requests that violate API requests limit | 500 |

## Testing

### Option 1: Daraja Simulator

Create a new test app under apps on the main nerve bar, select Reversal app product. Once the app is successfully created, the simulator is automated to pick app credentials (Consumer key and Consumer Secret) and predefined test data. You can hit the simulate button.

> **Note:** The simulator can only be accessed when logged in. Please log in to your Daraja account to access the simulator.

### Option 2: Postman

Use the credentials to generate an access token using the below endpoint.

**Sandbox:** `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
**Production:** `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`

Initiate a transaction using the request body above.

> **Note:** The Postman collection can only be accessed when logged in. Please log in to your Daraja account to access the collection.

## Go Live

We've already tested, and finished development. Now attach the integration to a live pay bill/till number.

1. Navigate to the GO LIVE tab.
2. Fill in the fields with live data (short code of a live pay bill or till number, organization name, and an M-PESA admin/manager username).

Upon successful go live, production endpoints will be sent to your developer email and the test sandbox app will be moved to production with production consumer key and secrets.

## Support

### Chatbot

Developers can get instant responses using the Daraja Chatbot for both development and production support.

### Production Issues & Incident Management

- **Incident Management Page:** Visit the Incident Management page on the Safaricom Developer Portal.
- **Email:** Reach out to API support at apisupport@safaricom.co.ke

## FAQs

**Why am I not receiving callbacks on my Reversal ResultURL?**
Ensure your callback endpoint is reachable over the internet and uses a public IP or domain.

**What should I do if I encounter an invalid access token error?**
Ensure the access token has not expired (expires hourly). Use the correct consumer key and secret.

**How can I determine if the Reversal request was successful?**
The API is asynchronous. You receive an acknowledgement first, and the actual result is sent to your ResultURL. A successful reversal has ResultCode 0.

**What API role should I assign to my API user for Reversal requests?**
Assign the Org Reversals Initiator API role.

**How do I activate a pending API user?**
Set their password via the M-PESA portal as a user with the Set Restricted ORG API PASSWORD role.

**Why am I receiving an 'initiator information is invalid' error?**
Check API user credentials, username, and password encryption.

**Why am I receiving 'The security credential is locked' error?**
Multiple invalid credential attempts lock the password. Unlock via the Business Administrator.

**What should I do to resolve an 'Invalid API call as no apiproduct match found' error?**
Ensure the Reversal product is enabled on your Daraja application and you are using the correct endpoint.

**Can I reverse a B2C transaction using the Reversal API?**
No. B2C reversals are done manually on the M-PESA portal.

**What could cause 'Bad Request - Invalid RecieverIdentifierType' error?**
Wrong Content-Type header, incorrect parameter name, or invalid/missing value.

**API reversal failing due to 'initiator information is invalid'?**
Use the correct API user (access channel-API) and ensure the user is active.

**What is the process of creating an Initiator?**
Create a Business Manager, then an API operator, and set the API user's password.

**How do I generate Security Credential?**
Encrypt the base64 encoded initiator password with M-Pesa's public key certificate using RSA and PKCS #1.5 padding.

**What is a short code?**
A unique number allocated to a pay bill or buy goods organization for receiving payments.

**How will I log in to the M-PESA portal?**
Use the provided link, shortcode, username, and password. Follow the prompts to set up your account.

**What should I do when the Business Administrator role is Dormant?**
Request activation by emailing M-PESABusiness@Safaricom.co.ke.
