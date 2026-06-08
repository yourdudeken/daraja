# Tax Remittance API

Enables businesses to remit tax to the Kenya Revenue Authority (KRA).

**Endpoint:** `POST https://sandbox.safaricom.co.ke/mpesa/b2b/v1/remittax`

**Command ID:** `PayTaxToKRA`

## Overview

This API enables businesses to remit tax to the Kenya Revenue Authority (KRA). To use this API, prior integration is required with KRA for tax declaration, payment registration number (PRN) generation, and exchange of other tax-related information.

## How It Works

1. The business sends a tax remittance request via the Daraja API Gateway.
2. Daraja authenticates the API call and forwards the request to M-PESA.
3. M-PESA processes the payment and credits the KRA account.
4. The result is sent back to the organization via the specified ResultURL.

> **Note:** This API is asynchronous. A Payment Registration Number (PRN) from KRA is required before making a remittance.

## Getting Started

### Prerequisites

- Create a Daraja Account on the Safaricom Developer Portal.
- Create a sandbox app to get API credentials.
- Retrieve Consumer Key & Consumer Secret from your sandbox app on My Apps.
- Prior integration with KRA for tax declaration and PRN generation.
- An active M-PESA short code with sufficient funds.

### Good to Know

This API uses the B2B (Business-to-Business) framework to remit taxes. The `CommandID` must be set to `PayTaxToKRA`.

## Request Body

```json
{
  "Initiator": "TaxPayer",
  "SecurityCredential": "FKXl/KPzT8hFOnozI+unz7mXDgTRbrlrZ+C1Vblxpbz7jliLAFa0E/…../uO4gzUkABQuCxAeq+0Hd0A==",
  "CommandID": "PayTaxToKRA",
  "SenderIdentifierType": "4",
  "RecieverIdentifierType": "4",
  "Amount": "239",
  "PartyA": "888880",
  "PartyB": "572572",
  "AccountReference": "353353",
  "Remarks": "OK",
  "QueueTimeOutURL": "https://mydomain.com/b2b/remittax/queue/",
  "ResultURL": "https://mydomain.com/b2b/remittax/result/"
}
```

## Request Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| CommandID | Specifies the type of transaction. Must be `PayTaxToKRA`. | String | PayTaxToKRA |
| Initiator | The M-Pesa API operator username. | String | Username, user_name |
| SecurityCredential | The encrypted password of the M-Pesa API operator. The process for encrypting the initiator password is described in the docs. An online encryption tool is available under the test credentials section. | String | 32SzVdmCvjpmQfw3X2RK8UAv7xuhhkgjfgHAJSGFH... |
| PartyA | Your own shortcode from which the money will be deducted. | Number | Shortcode (5-6 digits) e.g. 123454 |
| SenderIdentifierType | The type of shortcode from which money is deducted. Only `4` is allowed. | Number | 4 |
| PartyB | The account to which money will be credited. Only `572572` is allowed. | Number | 572572 |
| RecieverIdentifierType | The type of shortcode to which money is credited. Only `4` is allowed. | Number | 4 |
| Amount | The transaction amount. | Number | 3000 |
| AccountReference | The Payment Registration Number (PRN) issued by KRA. | String | PRN1234XN |
| Remarks | Any additional information to be associated with the transaction. | String | Sentence of up to 100 characters |
| QueueTimeOutURL | A URL that will be used to notify your system in case the request times out before processing. | URL | https://ip:port/path or domain:port/path |
| ResultURL | A URL that will be used to send transaction results after processing. | URL | https://ip:port/path or domain:port/path |

## Response Body

### Success Response

```json
{
  "OriginatorConversationID": "5118-111210482-1",
  "ConversationID": "AG_20230420_2010759fd5662ef6d054",
  "ResponseCode": "0",
  "ResponseDescription": "Accept the service request successfully."
}
```

## Response Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| OriginatorConversationID | Unique request identifier assigned by Daraja upon successful request submission. | String | A string of fewer than 20 characters |
| ConversationID | Unique request identifier assigned by M-Pesa upon successful request submission. | String | AG_20230420_2010759fd5662ef6d054 |
| ResponseCode | Status code for request submission. `0` indicates successful request submission. | String | 0 |
| ResponseDescription | A descriptive message of the request submission status. | String | Accept the service request successfully. |

## Callback Result Payload

After processing, feedback is sent to your specified ResultURL.

### Successful Result Body

```json
{
  "Result": {
    "ResultType": "0",
    "ResultCode": "0",
    "ResultDesc": "The service request is processed successfully",
    "OriginatorConversationID": "626f6ddf-ab37-4650-b882-b1de92ec9aa4",
    "ConversationID": "AG_20181005_00004d7ee675c0c7ee0b",
    "TransactionID": "QKA81LK5CY",
    "ResultParameters": {
      "ResultParameter": [
        {
          "Key": "DebitAccountBalance",
          "Value": "{Amount={CurrencyCode=KES, MinimumAmount=618683, BasicAmount=6186.83}}"
        },
        {
          "Key": "Amount",
          "Value": "190.00"
        },
        {
          "Key": "DebitPartyAffectedAccountBalance",
          "Value": "Working Account|KES|346568.83|6186.83|340382.00|0.00"
        },
        {
          "Key": "TransCompletedTime",
          "Value": "20221110110717"
        },
        {
          "Key": "DebitPartyCharges",
          "Value": ""
        },
        {
          "Key": "ReceiverPartyPublicName",
          "Value": "00000 - Tax Collecting Company"
        },
        {
          "Key": "Currency",
          "Value": "KES"
        },
        {
          "Key": "InitiatorAccountCurrentBalance",
          "Value": "{Amount={CurrencyCode=KES, MinimumAmount=618683, BasicAmount=6186.83}}"
        }
      ]
    },
    "ReferenceData": {
      "ReferenceItem": [
        {
          "Key": "BillReferenceNumber",
          "Value": "19008"
        },
        {
          "Key": "QueueTimeoutURL",
          "Value": "https://mydomain.com/b2b/remittax/queue/"
        }
      ]
    }
  }
}
```

### Successful Result Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| Result | The root parameter that encloses the entire result message. | JSON Object | `"Result":{}` |
| ConversationId | Unique request identifier assigned by M-Pesa upon successful request submission. | String | 236543-276372-2 |
| OriginatorConversationId | Unique request identifier assigned by API gateway upon successful request submission. | String | AG_2376487236_126732989KJHJKH |
| ResultDesc | A descriptive message for the transaction result. | String | The service request is processed successfully. |
| ResultType | A status code indicating whether the transaction was already sent to your listener. The usual value is 0. | Number | 0 |
| ResultCode | A transaction result status code. `0` indicates successful processing. | Number | 0 |
| TransactionID | Unique M-PESA transaction ID for the payment request. | String | LHG31AA5TX |
| ResultParameters | A JSON object that holds more details for the transaction. | JSON Object | `"ResultParameters":{"ResultParameter":[]}` |
| Amount | The transaction amount that was transacted. Returned as a key-value object under ResultParameter. | Number | 100 |
| TransactionCompletedTime | A 14-digit timestamp indicating the date and time the transaction was completed on M-PESA. | Number | 20171206163233 |
| DebitPartyCharges | Transaction fee deducted on the debit party if applicable. Empty if no charges apply. | Number | 1 |
| ReceiverPartyPublicName | The public name of the credit party/organization. | String | 600000 - saf test org |
| Currency | A currency code of the transaction amount. | String | KES |
| DebitPartyAffectedAccountBalance | The balance in the organization's account from which funds were deducted. | String | Working Account\|KES\|500000.00\|599490.00\|0.00\|0.00 |
| DebitAccountCurrentBalance | The balance in the organization's account from which funds were deducted. | String | {Amount={CurrencyCode=KES, MinimumAmount=59949000, BasicAmount=599490.00}} |
| InitiatorAccountCurrentBalance | The balance in the organization accounts from which funds were deducted. | String | {Amount={CurrencyCode=KES, MinimumAmount=59949000, BasicAmount=599490.00}} |
| ReferenceData | A JSON object that holds more details for the transaction reference data. | JSON Object | `"ReferenceData": {"ReferenceItem": []}` |
| ReferenceItem | A JSON array that holds JSON Objects with additional transaction details. | JSON Object | `"ReferenceItem": [{"Key": "BillReferenceNumber", "Value": "19008"}]` |

### Unsuccessful Result Body

```json
{
  "Result": {
    "ResultType": "0",
    "ResultCode": 2001,
    "ResultDesc": "The initiator information is invalid.",
    "OriginatorConversationID": "12337-23509183-5",
    "ConversationID": "AG_20200120_0000657265d5fa9ae5c0",
    "TransactionID": "OAK000000",
    "ResultParameters": {
      "ResultParameter": [
        {
          "Key": "BOCompletedTime",
          "Value": "20200120164825"
        }
      ]
    },
    "ReferenceData": {
      "ReferenceItem": {
        "Key": "QueueTimeoutURL",
        "Value": "https://mydomain.com/b2b/remittax/queue/"
      }
    }
  }
}
```

### Failed Result Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| Result | The root parameter that encloses the entire result message. | JSON Object | `"Result":{}` |
| ConversationId | Unique request identifier assigned by M-Pesa. | String | 236543-276372-2 |
| OriginatorConversationId | Unique request identifier assigned by API gateway. | String | AG_2376487236_126732989KJHJKH |
| ResultDesc | A descriptive message for the transaction result. | String | The initiator information is invalid. |
| ResultType | A status code indicating whether the transaction was already sent to your listener. | Number | 0 |
| ResultCode | A transaction result status code. `2001` indicates an error. | Number | 2001 |
| TransactionID | Unique M-PESA transaction ID for the payment request. | String | OAK0000000 |
| ResultParameters | A JSON object that holds more details for the transaction. | JSON Object | `ResultParameters:{"ResultParameter":{"Key":"BOCompletedTime","Value":20200120164825}}` |
| ReferenceData | A JSON object that holds more details for the transaction reference data. | JSON Object | `"ReferenceData": {"ReferenceItem": []}` |
| ReferenceItem | A JSON array that holds JSON Objects with additional transaction details. | JSON Object | `"ReferenceItem": [{"Key": "BillReferenceNumber", "Value": "19008"}]` |

### Error Response Parameter Definition

| Name | Description | Type | Sample Value |
|------|-------------|------|--------------|
| requestId | A unique requestID for the payment request. | String | 16813-15-1 |
| errorCode | Unique error code. | String | 404.001.04 |
| errorMessage | A descriptive message of the failure. | String | Invalid Access Token |

## Testing

### Option 1: Daraja Simulator

Create a new test app under apps on the main nerve bar. Once the app is successfully created, the simulator is automated to pick app credentials (Consumer key and Consumer Secret) and predefined test data. You can hit the simulate button.

> **Note:** The simulator can only be accessed when logged in. Please log in to your Daraja account to access the simulator.

### Option 2: Postman

Use the credentials to generate an access token using the below endpoint.

**Sandbox:** `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
**Production:** `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`

Initiate a transaction using the request body above.

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
