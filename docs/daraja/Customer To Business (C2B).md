# Customer To Business (C2B) API

Register URL for Validation/Confirmation and Simulate transaction.

**Endpoint:** `POST https://sandbox.safaricom.co.ke/mpesa/c2b/v2/registerurl`

---

## Overview

The Customer to Business (C2B) API, also known as the Register URL API, enables merchants to receive notifications for successful payments to their Paybill or Till numbers. Funds originate from the customer wallet and are transferred to the merchant's short code. Payments can be initiated via SIM Toolkit, Mpesa App, Safaricom App, USSD, NI Push API, or Dynamic QR Code API.

The C2B API allows you to register callback URLs for payment notifications:

- **Validation URL:** Used when a merchant needs to validate payment details before accepting (e.g., verifying an account number).
- **Confirmation URL:** Receives payment notification after successful completion.

> **Note:** C2B Transaction Validation is optional and must be activated by emailing apisupport@safaricom.co.ke or M-pesabusiness@safaricom.co.ke.

---

## How It Works

1. Customer initiates payment to a Paybill or Till number.
2. M-PESA validates the request internally.
3. M-PESA checks if External Validation is enabled for the Paybill.
4. If enabled:
   - Sends a Validation request to the registered Validation URL.
   - Merchant system validates and responds (within ~8 seconds).
   - M-PESA processes the transaction based on the response.
   - If default action is "Completed", sends a Confirmation request to the Confirmation URL.
   - If default action is "Cancelled", cancels the transaction.
5. If External Validation is disabled, M-PESA completes the transaction and sends a Confirmation request.
6. If unable to reach the merchant's endpoint, M-PESA uses the default action value.
7. If no URLs are registered, M-PESA completes the request.
8. SMS notifications are sent to both customer and merchant.
9. For failed notifications, use the Pull Transaction API or check the M-PESA Org portal.

### URL Requirements

- Use publicly available IP addresses or domain names.
- Production URLs must be HTTPS; Sandbox allows HTTP.
- Avoid keywords like M-PESA, Safaricom, exe, exec, cmd, SQL, query, etc., in URLs.
- Do not use public URL testers (e.g., ngrok, mockbin, requestbin) in production.
- On the sandbox, you can register your URLs multiple times or overwrite existing ones.
- In production, this is a one-time API call. To change URLs, delete them via the URL management tab under self-service and re-register, or email apisupport@safaricom.co.ke.

> **Note:** The words "Cancelled/Completed" in ResponseType must be in sentence case and well-spelled.

---

## Getting Started

### Prerequisites

- Daraja Account on Safaricom Developer Portal.
- Sandbox app to get API credentials.
- Consumer Key & Consumer Secret.
- Test data from the simulator section.
- Live M-PESA Paybill/Till number with Business Admin/Manager operators for Go Live.

### Good to Know

- The API is asynchronous.
- Can be consumed over the internet, VPN, or Multiprotocol Switch.

### Get Auth Token

Generate an access token to authenticate API calls. See the Authorization API documentation.

---

## Request Body

### Register URLs

```json
{
  "ShortCode": "600984",
  "ResponseType": "Either Cancelled or Completed",
  "ConfirmationURL": "your confirmation URL",
  "ValidationURL": "your validation URL"
}
```

### Simulate Transactions

```json
{
  "ShortCode": 600984,
  "CommandID": "Either CustomerBuyGoodsOnline or CustomerPayBillOnline",
  "Amount": 1,
  "Msisdn": 254708374149,
  "BillRefNumber": "Account reference for Customer paybills and null for customer buy goods"
}
```

---

## Request Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| ValidationURL | URL that receives the validation request from the API upon payment submission. Only called if external validation on the registered shortcode is enabled. (By default External Validation is disabled.) | URL | https://ip/domain:port/path |
| ConfirmationURL | URL that receives the confirmation request from API upon payment completion. | URL | https://ip/domain:port/path |
| ResponseType | Default action if the validation URL is not reachable. Only two values: Completed or Cancelled. | String | Completed, Cancelled |
| ShortCode | Unique number tagged to an M-PESA pay bill/till number of the organization. | Numeric | 600996 |
| CommandID | Defines the type of transaction being simulated. CustomerBuyGoodsOnline for till number, CustomerPayBillOnline for paybill number. | String | CustomerBuyGoodsOnline, CustomerPayBillOnline |
| Amount | Amount to be transacted. | Numeric | 10 |
| Msisdn | Phone number from which the funds will be debited. For testing use the provided number. | Numeric | 254708374149 |
| BillRefNumber | Account reference number for payments to paybill numbers. Usually null for till number. | String | "Test Ref" |

---

## Response Body

### Simulate Response

```json
{
  "OriginatorCoversationID": "53e3-4aa8-9fe0-8fb5e4092cdd3405976",
  "ResponseCode": "0",
  "ResponseDescription": "Accept the service request successfully."
}
```

### Register URLs Response

```json
{
  "OriginatorCoversationID": "6e86-45dd-91ac-fd5d4178ab523408729",
  "ResponseCode": "0",
  "ResponseDescription": "Success"
}
```

---

## Response Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| OriginatorCoversationID | Global unique identifier for the transaction request returned by the API proxy upon successful request submission. | Alphanumeric | Alpha-numeric string, fewer than 20 characters |
| ResponseCode | Indicates whether Mobile Money accepts the request or not. | Alphanumeric | 0 |
| ResponseDescription | Status of the request. | String | Success |

> **NB:** Before including any API request to register URLs, you must first generate an access token from the Authorization API.

Once you have registered your URLs, a C2B API payment transaction is initiated by the customer during payment. You can use the simulator to preview how the request will look.

Upon successful payment, M-PESA posts the payment details to your confirmation and validation URLs as described below.

---

## Callback Payload

### Validation Request (only if External Validation enabled)

The validation request is received only by partners who have enabled the External Validation feature on their PayBill or BuyGoods (Till Number). You will first receive a validation request at your Validation URL.

The confirmation and validation results posted to your URLs will have one of the following structures:

```json
{
  "TransactionType": "Pay Bill",
  "TransID": "RKL51ZDR4F",
  "TransTime": "20231121121325",
  "TransAmount": "5.00",
  "BusinessShortCode": "600966",
  "BillRefNumber": "Sample Transaction",
  "InvoiceNumber": "",
  "OrgAccountBalance": "25.00",
  "ThirdPartyTransID": "",
  "MSISDN": "2547 ***** 126",
  "FirstName": "NICHOLAS",
  "MiddleName": "",
  "LastName": ""
}
```

---

## Callback Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| TransactionType | The transaction type specified during the payment request. | String | Buy Goods or Pay Bill |
| TransID | Unique M-Pesa transaction ID for every payment request. Sent in both callback messages and confirmation SMS. | Alpha-numeric | LHG31AA5TX |
| TransTime | Timestamp of the transaction in the format YEAR+MONTH+DATE+HOUR+MINUTE+SECOND (YYYYMMDDHHMMSS). | Time | 20170813154301 |
| TransAmount | Amount transacted, money paid by the customer to the Shortcode. Only whole numbers are supported. | Numeric | 100 |
| BusinessShortCode | Organization's shortcode (Paybill or Buygoods - a 5 to 6-digit account number). | String | 654321 |
| BillRefNumber | Account number for which the customer is making the payment. Applicable only to Customer PayBill Transactions. | String | Alpha-numeric, up to 20 chars |
| OrgAccountBalance | Current utility account balance of the payment-receiving organization shortcode. Blank for validation requests; for confirmation, represents new balance after payment. | Decimal | 30671 |
| ThirdPartyTransID | Transaction ID that the partner can use to identify the transaction. For validation requests, partner can respond with ThirdPartyTransID, which is sent back with confirmation notification. | String | 1234567890 |
| MSISDN | Masked number of the customer making the payment. | String | 2547 * 126 |
| FirstName | Customer's first name as per the M-Pesa register. Can be empty. | String | John |
| MiddleName | Customer's middle name as per the M-Pesa register. Can be empty. | String | null |
| LastName | Customer's last name as per the M-Pesa register. Can be empty. | String | null |

---

## Validation Response

After receiving the validation request, you are required to process it and respond to the API call and inform M-PESA either to accept or reject the payment.

### Accept Transaction

```json
{
  "ResultCode": "0",
  "ResultDesc": "Accepted"
}
```

### Reject Transaction

```json
{
  "ResultCode": "C2B00011",
  "ResultDesc": "Rejected"
}
```

---

## Result Codes

When rejecting transactions, responding with the ResultCodes below ensures customers receive a more appropriate message.

| ResultCode | ResultDesc |
|-----------|------------|
| C2B00011 | Invalid MSISDN |
| C2B00012 | Invalid Account Number |
| C2B00013 | Invalid Amount |
| C2B00014 | Invalid KYC Details |
| C2B00015 | Invalid Short code |
| C2B00016 | Other Error |

---

## Error Codes

| HTTP Code | Error Message | Possible Cause | Mitigation |
|-----------|--------------|----------------|------------|
| 500 | 500.003.1001 Internal Server Error | Server failure. | Make sure everything is correctly set up and you are calling the correct endpoints. |
| 500 | 500.003.1001 Urls are already registered. | Existing URL registered. | Request deletion of the existing and re-register. |
| 400 | 400.003.01 Invalid Access Token | Wrong or expired access token. | Regenerate a new token and use it before expiry. |
| 400 | 400.003.02 Bad Request | Something is missing. | Check API documentation. |
| 500 | 500.003.03 Error Occurred: Quota Violation | Sending multiple requests violating TPS. | Send a reasonable number of requests. |
| 500 | 500.003.02 Error Occurred: Spike Arrest Violation | Endpoints generating many errors. | Ensure endpoints are accessible and responding correctly. |
| 404 | 404.003.01 Resource not found | Wrong endpoint. | Check the M-PESA API endpoint. |
| 404 | 404.001.04 Invalid Authenticator Header | Wrong HTTP method used. | All M-PESA API requests on Daraja are POST except Authorization API which is GET. |
| 400 | 400.002.05 Invalid Request Payload | Request body not properly drafted. | Submit the correct request payload as shown in the sample. |
| 500 | Duplicate notification info, SP ID is xxxxx, correlator is xxxxxx | Existing URLs registered on aggregator platform (formerly Broker). | Request deletion of URLs from the aggregator platform, then register on Daraja. |

---

## Testing

### Option 1: Daraja Simulator

1. Create a test app, select C2B product.
2. Simulator uses app credentials and predefined test data.
3. Register URLs before each simulation.
4. Select "CustomerPayBillOnline" for Paybill or "CustomerBuyGoodsOnline" for Till.

> **Note:** The simulator can only be accessed when logged in. Log in to your Daraja account to access the simulator.

### Option 2: Postman

1. Use credentials to generate access token:
   - Sandbox: `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
   - Production: `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
2. Initiate a transaction using the request body above.
3. Download the Postman collection and replace parameters with your credentials.

> **Note:** "Simulate C2B Request" is only available in Sandbox. The Postman collection can only be accessed when logged in.

---

## Go Live

1. Attach integration to a live Paybill/Till number.
2. Fill in live data: short code, organization name, M-PESA admin/manager username.
3. Visit the "GO LIVE" tab on the Daraja portal for more info.
4. Upon successful go live, production endpoints are sent to your developer email.

---

## M-PESA Organization Portal

### Access

URL: https://org.ke.m-pesa.com/orglogin.action

Business Administrator role is required.

### First-Time Login Steps

1. Launch https://org.ke.m-pesa.com.
2. Enter Short code (Bulk payment number).
3. Enter Business Administrator username.
4. Enter first-time password (case-sensitive).
5. Enter Verification Code and login.
6. Enter OTP, set new password, security questions, and activate account.

### Account Types in C2B Organization

| Account Type | Description |
|-------------|-------------|
| MMF/Working/M-PESA Account | For business withdrawals. |
| Utility Account | Receives customer payments. |
| Charges Paid Account | Debited for transaction charges. |
| Organization Settlement Account | Settles charges and moves balance automatically. |

### Portal Roles

**Business Administrator:**
- Creates system users and assigns roles.
- Cannot view transactions.
- Created by Safaricom.

**Business Manager:**
- Approves transactions, checks balances, views statements, withdraws funds.

#### Creating Business Manager

1. Log in as Business Administrator.
2. Select operators.
3. Click "Add".
4. Enter username, select access channel as Web.
5. Assign role, set password, submit KYC info.

#### Creating API User

1. Log in as Business Administrator.
2. Select operators.
3. Click "Add".
4. Enter API initiator username, select access channel as API.
5. Assign API roles, submit KYC info.
6. Set password via Business Manager (Operator Management > search > Operations > Set Password).

### API Roles

| API | Role Assignment |
|-----|----------------|
| B2C | ORG B2C API Initiator |
| Business Pay Bill | Business Paybill Org API initiator |
| Business Buy Goods | Business Buy Goods Org API initiator |
| Transaction Status | Transaction Status query ORG API |
| Reversals | Org Reversals Initiator |
| Tax Remittance | Tax Remittance to KRA API |
| Set Password | Set Restricted ORG API PASSWORD |

### Apply for Live Paybill/Till/B2C Account

Email: M-PESABusiness@Safaricom.co.ke

---

## Support

- **Chatbot:** Daraja Chatbot for instant development and production support.
- **Production Issues & Incident Management:** Visit the Incident Management page or email apisupport@safaricom.co.ke.

---

## FAQs

1. **What is a short code?**
   A unique number allocated to a pay bill or buy goods organization through which they receive customer payments.

2. **What is C2B?**
   Customer to Business payment from a customer wallet to the merchant's short code.

3. **What is the difference between C2B v1 and C2B v2?**
   C2B v1 includes a SHA256 hashed MSISDN. C2B v2 includes a masked MSISDN (e.g., 2547 * 126). The result is posted with a POST request in application/json format.

4. **How often should I register URLs?**
   Sandbox: before each simulation. Production: once, re-register after deletion.

5. **How do I delete URLs?**
   Self-managed on the Daraja portal under Self Services > URL Management. Requires two operators with Business Manager or Business Administrator role for validation.

6. **How can I enable validation on my short code?**
   Email APISupport@safaricom.co.ke. Takes approximately 6 hours.

7. **Why am I not receiving notifications to my confirmation and validation URLs?**
   The URL could be invalid. Ensure URLs are internet-accessible, use HTTPS in production, avoid blocked keywords, and do not use public URL testers.

8. **What is a validation URL?**
   The URL that receives the validation request from the API upon payment submission. Only called if external validation is enabled.

9. **What is a confirmation URL?**
   The URL that receives the confirmation request from the API upon payment completion.

10. **How do I get my Mpesa username or Business Administrator username?**
    Send an official request letter on company letterhead to M-PESABusiness@Safaricom.co.ke with organization short code, name, administrator details, and ID documentation.
