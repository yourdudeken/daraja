# M-Pesa Express (Lipa Na M-PESA Online) API

Initiates online payment on behalf of a customer.

**Endpoint:** `POST https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest`

## Overview
LIPA NA M-PESA ONLINE API, also known as M-PESA Express, is a Merchant/Business initiated C2B (Customer to Business) transaction. The merchant integrates to the API and initiates a payment authorization prompt to a customer whose phone number is registered and active on M-PESA.

## How It Works
1. Merchant captures required API parameters and sends the API request
2. API validates internally and sends acknowledgment response
3. A network-initiated push request is sent to the customer's M-PESA-registered phone number
4. Customer confirms payment by entering their M-PESA PIN
5. M-PESA validates PIN, debits customer wallet, credits merchant account
6. Results are sent to the merchant via callback URL
7. Customer receives SMS confirmation

## Use Cases
- Reduction of wrong payments/reversals
- Enhanced and shorter payment journey

## Getting Started

### Prerequisites
- Daraja Account on Safaricom Developer Portal
- Sandbox app with API credentials (Consumer Key & Consumer Secret)
- Test data from simulator section
- Passkey for password encryption (Sandbox: test data; Production: after go-live)
- Live M-PESA pay bill/till number with Business Admin/Manager operators

### Good to Know
This API is asynchronous. Can be consumed over internet, VPN, or Multiprotocol Switch.

## Request Body
```json
{
  "BusinessShortCode": 174379,
  "Password": "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMjEwNjI4MDkyNDA4",
  "Timestamp": "20210628092408",
  "TransactionType": "CustomerPayBillOnline",
  "Amount": "1",
  "PartyA": "254722000000",
  "PartyB": "174379",
  "PhoneNumber": "254722111111",
  "CallBackURL": "https://mydomain.com/path",
  "AccountReference": "accountref",
  "TransactionDesc": "txndesc"
}
```

## Request Parameter Definition

| Name | Description | Type | Sample |
|------|-------------|------|--------|
| BusinessShortCode | M-PESA Shortcode assigned to the Business | Numeric | 654321 (5-6 digits) |
| Password | Base64 encoded string: base64.encode(Shortcode+Passkey+Timestamp) | String | base64.encode(...) |
| Timestamp | Timestamp in format YYYYMMDDHHmmss | Timestamp | 20210628092408 |
| TransactionType | CustomerPayBillOnline (PayBill) or CustomerBuyGoodsOnline (Till) | String | CustomerPayBillOnline |
| Amount | Transaction amount | Numeric | 10 |
| PartyA | Phone number sending money (format: 2547XXXXXXXX) | Numeric | 254722000000 |
| PartyB | Organization receiving funds (credit party) | Numeric | 174379 |
| PhoneNumber | Mobile number to receive USSD prompt (format: 2547XXXXXXXX) | Numeric | 254722111111 |
| CallBackURL | URL for payment gateway to send result | URL | https://mydomain.com/path |
| AccountReference | Alpha-numeric identifier (max 12 chars) | Alpha-Numeric | accountref |
| TransactionDesc | Additional information (max 13 chars) | String | txndesc |

> **Note:** All fields except TransactionDesc are mandatory.

## Response Body
```json
{
  "MerchantRequestID": "2654-4b64-97ff-b827b542881d3130",
  "CheckoutRequestID": "ws_CO_1007202409152617172396192",
  "ResponseCode": "0",
  "ResponseDescription": "Success. Request accepted for processing",
  "CustomerMessage": "Success. Request accepted for processing"
}
```

## Response Parameter Definition

| Name | Description | Type | Sample |
|------|-------------|------|--------|
| MerchantRequestID | Global unique identifier from API proxy | String | 2654-4b64-97ff-b827b542881d3130 |
| CheckoutRequestID | Global unique identifier from M-PESA | String | ws_CO_1007202409152617171293992 |
| ResponseCode | Status code (0 = successful submission) | Numeric | 0 |
| ResponseDescription | Acknowledgment message | String | Accept the service request successfully |
| CustomerMessage | Message for the customer | String | Success. Request accepted for processing |

## Callback Payloads

### Unsuccessful Callback
```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "f1e2-4b95-a71d-b30d3cdbb7a7942864",
      "CheckoutRequestID": "ws_CO_21072024125243250722943992",
      "ResultCode": 1032,
      "ResultDesc": "Request cancelled by user"
    }
  }
}
```

### Successful Callback
```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_191220191020363925",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 1.0 },
          { "Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV" },
          { "Name": "TransactionDate", "Value": 20191219102115 },
          { "Name": "PhoneNumber", "Value": 254708374149 }
        ]
      }
    }
  }
}
```

## Callback Parameter Definition

| Parameter | Description | Type | Optional | Sample |
|-----------|-------------|------|----------|--------|
| Body | Root key for callback message | JSON Object | No | {"Body":{...}} |
| stkCallback | First child of Body with callback details | JSON Object | No | |
| MerchantRequestID | Same as initial response | String | No | 7071-4170-a0e4-... |
| CheckoutRequestID | Same as initial response | String | No | ws_CO_21072024125130652700961992 |
| ResultCode | Transaction processing status (0 = success) | Numeric | No | 0, 1032 |
| ResultDesc | Status description | String | No | The service request is processed successfully. |

### Additional Parameters (Successful Requests)

| Parameter Name | Description | Type | Optional |
|---------------|-------------|------|----------|
| CallbackMetadata | JSON object with more transaction details | JSON Object | Yes |
| Item | Array within CallbackMetadata | JSON Array | Yes |
| Amount | Amount transacted | Decimal | Yes |
| MpesaReceiptNumber | Unique M-PESA transaction ID | String | Yes |
| Balance | Account balance for shortcode | Decimal | Yes |
| TransactionDate | Completion timestamp (YYYYMMDDHHmmss) | Timestamp | Yes |
| PhoneNumber | Customer's phone number | PhoneNumber | Yes |

## Results Parameter Definition

| Name | Description | Type | Sample |
|------|-------------|------|--------|
| ConversationID | Unique identifier from M-PESA | String | AG_20180223_0000493344ae97d86f75 |
| OriginatorConversationID | Unique request identifier | String | 3213-416199-2 |
| ReferenceData | Reference data for transaction log | ReferenceData | n/a |
| ReferenceItem | Reference data item | ParameterType | n/a |
| ResultCode | Processing status (0 = success) | String | 0 |
| ResultDesc | Description of Result Code | String | The service request is processed successfully. |
| ResultParameters | Specific parameters | n/a | n/a |
| Key | Parameter name | String | DebitPartyName |
| Value | Parameter value | String | 600310 - Safaricom333 |
| ResultType | 0: completed, 1: waiting | Integer | 0 |
| TransactionID | Unique transaction identifier | String | MBN0000000 |

## Error Codes

### Sample Error Response
```json
{
  "requestId": "1c5b-4ba8-815c-ac45c57a3db01495926",
  "errorCode": "400.002.02",
  "errorMessage": "Bad Request - Invalid BusinessShortCode"
}
```

### Common Error Codes

| errorCode | errorMessage | Mitigation | HTTP |
|-----------|-------------|------------|------|
| 400.002.02 | Bad Request – Invalid XXXX | Ensure payload is correct | 400 |
| 404.001.03 | Invalid Access Token | Regenerate token | 404 |
| 404.001.01 | Resource not found | Check API endpoint | 404 |
| 405.001 | Method Not Allowed | Use POST | 405 |
| 500.001.1001 | Merchant does not exist | Use correct BusinessShortCode | 500 |
| 500.001.1001 | Wrong credentials | Check Password parameter encoding | 500 |
| 500.001.1001 | Unable to lock subscriber | Wait 1 minute between requests |  |
| 500.003.02 | System is busy | Retry after short wait |  |
| 500.003.1001 | Internal Server Error | Check setup and documentation | 500 |
| 500.003.02 | Spike Arrest Violation | Reduce request rate | 500 |
| 500.003.03 | Quota Violation | Reduce request rate | 500 |

## Testing

### Option 1: Daraja Simulator
Create a test app and use the simulator.

### Option 2: Postman
Generate access token and initiate transactions.

## Go Live
Attach integration to a live pay bill/till number. Navigate to GO LIVE tab.

**Requirements:**
- Organization short code (Pay bill, Till, HO, or B2C account)
- Organization name (no symbols/special characters)
- Mpesa Username (Business Administrator or Business Manager)
- OTP sent to phone number on M-PESA portal

## Support
- **Chatbot:** Daraja Chatbot
- **Production Issues:** Incident Management Page or apisupport@safaricom.co.ke

## FAQs
- **Not receiving callbacks?** Ensure CallbackURL is publicly accessible
- **Invalid access token?** Token expires hourly; regenerate
- **Can I use actual pay bill on simulator?** No, only sandbox test short codes
- **Test environment?** Yes, sandbox environment on Daraja developer portal
- **Transaction limits?** Max Ksh 250,000 per transaction; Max balance Ksh 500,000; Daily max Ksh 500,000; Min Ksh 1
- **Invalid API call - no apiproduct match?** Ensure product is enabled on Daraja app
- **Reverse M-PESA Express transaction?** Yes, via Reversal API
- **View transaction history?** M-PESA Org portal (https://org.ke.m-pesa.com)
- **Bad Request - Invalid BusinessShortCode?** Check Content-Type, parameter name, value
- **Can I use Till Number for STK Push?** Yes, with TransactionType: CustomerBuyGoodsOnline
