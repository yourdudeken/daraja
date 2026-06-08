# Dynamic QR API

Generates a dynamic M-PESA QR Code.

**Endpoint:** `POST https://sandbox.safaricom.co.ke/mpesa/qrcode/v1/generate`

---

## Overview

Use this API to generate a Dynamic QR which enables Safaricom M-PESA customers who have My Safaricom App or M-PESA app to scan a QR (Quick Response) code, capture the till number and amount, then authorize payment for goods and services at select LIPA NA M-PESA (LNM) merchant outlets.

---

## Request Body

```json
{
  "MerchantName": "TEST SUPERMARKET",
  "RefNo": "Invoice Test",
  "Amount": 1,
  "TrxCode": "BG",
  "CPI": "373132",
  "Size": "300"
}
```

---

## Request Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| MerchantName | Name of the Company/M-Pesa Merchant Name. | String | "TEST-Supermarket" |
| RefNo | Transaction Reference. | String | "xewr34fer4t" |
| Amount | Total amount for the sale/transaction. | Numeric | 2000 |
| TrxCode | Transaction Type. See supported types below. | String | BG, WA, PB, SM, SB |
| CPI | Credit Party Identifier. Can be a Mobile Number, Business Number, Agent Till, Paybill or Business number, or Merchant Buy Goods. | String | "174379" |
| Size | Size of the QR code image in pixels. QR code image will always be a square image. | String | "300" |

### TrxCode Values

| Code | Description |
|------|-------------|
| BG | Pay Merchant (Buy Goods) |
| WA | Withdraw Cash at Agent Till |
| PB | Paybill or Business number |
| SM | Send Money (Mobile number) |
| SB | Sent to Business. Business number CPI in MSISDN format. |

---

## Response Body

```json
{
  "ResponseCode": "AG_20191219_000043fdf61864fe9ff5",
  "RequestID": "16738-27456357-1",
  "ResponseDescription": "QR Code Successfully Generated.",
  "QRCode": "iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAIAAAD2HxkiAAAHtEl..."
}
```

---

## Response Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| ResponseCode | Used to return the Transaction Type. | String | An alpha-numeric string of fewer than 20 characters |
| RequestID | Unique request identifier from Daraja. | String | 16738-27456357-1 |
| ResponseDescription | Status of the transaction. | String | QR Code Successfully Generated |
| QRCode | QR Code Image/Data/String (Base64 encoded). | String | An alpha-numeric string containing the QR Code |

---

## Error Codes

| Error | Description | Mitigation |
|-------|-------------|------------|
| 404.001.04 Invalid Authentication Header | All M-PESA APIs on Daraja are POST except Authorization API which is GET. If you've misplaced the headers you will get this error. | Use POST for all API requests except Authorization (which is GET). |
| 400.002.05 Invalid Request Payload | Request body is not properly drafted. | Submit the correct request payload as shown in the sample request body. |
| 400.003.01 Invalid Access Token | Using a wrong or expired access token. | Regenerate a new token and use it before expiry. |

---

## Testing

1. Create a sandbox app on the Daraja Portal.
2. Generate an access token via the Authorization API.
3. Call the Dynamic QR API with test data.

**Sandbox Endpoint:** `https://sandbox.safaricom.co.ke/mpesa/qrcode/v1/generate`

**Token Endpoint (Sandbox):** `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`

---

## Go Live

Same endpoint paths are used for production with the production base URL.

**Production Endpoint:** `https://api.safaricom.co.ke/mpesa/qrcode/v1/generate`

**Token Endpoint (Production):** `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`

### Go Live Steps

1. Use production Consumer Key & Consumer Secret.
2. Generate production access tokens.
3. Call the API with live merchant details.
4. Test QR scanning with live devices.

---

## Support

- **Chatbot:** Daraja Chatbot for instant development and production support.
- **Email:** apisupport@safaricom.co.ke
