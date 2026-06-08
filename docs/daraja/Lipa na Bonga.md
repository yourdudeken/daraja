# Lipa na Bonga API

The Bonga scheme is a Safaricom loyalty program. This API lets merchants using Lipa na M-Pesa accept payments with Bonga Points.

**Base Endpoint:** `https://sandbox.safaricom.co.ke/v1/lipa/na/bonga/{path_suffix}`

---

## Overview

The Bonga scheme is a loyalty reward program for Safaricom customers who are enrolled in the service. This API allows Safaricom merchants with Lipa na M-Pesa Buy Goods or Pay Bill to accept payment with Bonga Points.

Two main operations are supported:

1. **Calculate Points** - Retrieve the Bonga points to Kenya Shillings conversion rate.
2. **Redeem Paybill** - Redeem Bonga Points towards payment for goods and services.

> **NB:** Once the redemption process is completed successfully, M-PESA immediately transfers the funds to the merchant's PayBill or Till number. A callback result is then sent to the URLs registered for C2B transactions. Refer to the C2B API documentation for instructions on how to register these URLs.

---

## How It Works

1. Customer chooses Lipa na Bonga in the partner's channel (e.g., web).
2. An input to enter the phone number and points to be deducted is displayed, along with the conversion rate.
3. Customer enters phone number and points to be deducted.
4. The deduction request is sent through the API gateway to the partner system.
5. If the phone number is not eligible, a response is sent to retry or use a different number.
6. If eligible, an STK push is sent for the customer to enter their M-PESA PIN for authentication.
7. If PIN validation fails, the customer is notified and the process ends.
8. If PIN is correct, Bonga balance is checked against points to be deducted.
9. If insufficient balance, the customer is notified to use an alternative payment method.
10. If sufficient, points are deducted and the transaction is processed.
11. In the event M-PESA fails to transfer money to the merchant's Pay Bill/Till number despite Bonga deduction, equivalent Bonga points are reversed and the customer is advised to try again.
12. SMS notifications are sent to the customer on success:
    - **Notification 1:** You have redeemed \*\* Bonga points. Your Bonga points balance is \*\*\*\*.
    - **Notification 2:** Your expenditure for Ksh\*\* worth \*\*points to (Company Name) was successful.

### Audience

- **Business Owners:** Reconcile all value from Bonga Redemptions by accepting payments via Bonga and querying transaction status.
- **Individual Customers:** Empowered to redeem points across multiple eCommerce platforms.
- **Integrators & Developers:** Directly consume the APIs.

---

## Getting Started

### Prerequisites

- Daraja Account on Safaricom Developer Portal.
- Sandbox app to get API credentials.
- Consumer Key & Consumer Secret.
- Test data available on the simulator section.
- Live M-PESA Pay Bill/Till number with Business Admin/Manager operators for Go Live.

### Good to Know

- This API is asynchronous.
- Can be consumed over the internet, a virtual private network, or Multiprotocol Switch.
- Open to individual Prepay and Post-pay customers.
- Available to companies interested in adding Bonga as a payment method on apps and web pages.

### Get Auth Token

Generate an access token to authenticate API calls. See the Authorization API documentation.

---

## Calculate Points

For informational purposes, partners can call this API to retrieve the Bonga points to Kenya Shillings conversion rate.

### Environments

| Environment | Description | URL |
|-------------|-------------|-----|
| Sandbox | Testing environment. | `https://sandbox.safaricom.co.ke/v1/lipa/na/bonga/calculate-points` |
| Production | Live environment for real transactions. | `https://api.safaricom.co.ke/v1/lipa/na/bonga/calculate-points` |

### Request Body

```json
{
  "points": "40"
}
```

### Request Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| Points | Loyalty points accumulated by Safaricom customer. | Integer | 20 |

### Response Body

```json
{
  "header": {
    "requestRefId": "55b2b8bd-0be4-4430-b0dc-792efccdc690",
    "responseCode": 200,
    "responseMessage": "Success",
    "customerMessage": "Request executed successfully.",
    "timestamp": "2025-02-24T12:29:05.484864516"
  },
  "body": {
    "amount": "8",
    "points": "40",
    "rate": "0.2"
  }
}
```

### Response Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| requestRefId | Unique ID associated with the request. | String | 55b2b8bd-0be4-4430-b0dc-792efccdc690 |
| responseCode | Response code returned after the overall process. | Integer | 404 |
| responseMessage | Message associated with the response code. | String | Fail |
| customerMessage | Customer message. | String | Sorry, you are not registered on Bonga |
| timestamp | Timestamp of the transaction in ISO format. | Timestamp | 2025-02-24T12:29:05.484864516 |
| amount | Amount to pay. | Integer | 20 |
| points | Equivalent points to be deducted. | Integer | 100 |
| rate | Bonga conversion rate to Kenya Shillings. The earned points are redeemable at a rate of Ksh.0.2 for every Bonga point. | Decimal | 0.2 |

---

## Redeem Paybill

Partners can redeem Bonga Points by integrating with the Redeem Points API. This endpoint allows customers to convert their accumulated Bonga Points into payment towards goods and services.

### Environments

| Environment | Description | URL |
|-------------|-------------|-----|
| Sandbox | Testing environment. | `https://sandbox.safaricom.co.ke/v1/lipa/na/bonga/redeem-paybill` |
| Production | Live environment for real transactions. | `https://api.safaricom.co.ke/v1/lipa/na/bonga/redeem-paybill` |

### Request Body

```json
{
  "msisdn": "254720776155",
  "amount": 50,
  "bongaPoints": 20,
  "conversionRate": 0.2,
  "shortCode": "888880",
  "accountNumber": "test"
}
```

### Request Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| Username | Request header parameter for authenticating the service in Bonga Everywhere. | String | Username |
| Password | Request header parameter for authenticating the service in Bonga Everywhere. Hashed with SHA256. | String | Password |
| Request id | Unique (timestamp). | Integer | Request id |
| MSISDN | Subscriber mobile number. | Integer | 0722000000 |
| conversion_rate | The earned points are redeemable at a rate of Ksh.0.2 for every Bonga point. | Decimal | 0.2 |
| Points | Points to be deducted. | Integer | 20 |

### Response Body

```json
{
  "header": {
    "requestRefId": "a53a2939-7361-482f-ba1e-ccd51504acd3",
    "responseCode": 200,
    "responseMessage": "Operation Successfully.",
    "customerMessage": "Dear customer, your request was processed successfully",
    "timestamp": "2026-03-10T09:54:28.456847481"
  },
  "body": null
}
```

### Response Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| requestRefId | Unique ID associated with the request. | String | 55b2b8bd-0be4-4430-b0dc-792efccdc690 |
| responseCode | Response code returned after the overall process. | Integer | 404 |
| responseMessage | Message associated with the response code. | String | Fail |
| customerMessage | Customer message. | String | Sorry, you are not registered on Bonga |
| timestamp | Timestamp of the transaction in ISO format. | Timestamp | 2025-02-24T12:29:05.484864516 |

---

## Result Codes

| ResponseCode | ResponseDescription |
|-------------|---------------------|
| 6000 | Success |
| 6001 | Fail |
| 6004 | Server error |
| 6005 | Invalid credentials passed |
| 6006 | Missing parts in the request body |
| 6007 | CBS unavailable / System busy - Email or SMS notification to respective support |
| 6008 | STK unavailable / System busy - Email or SMS notification to respective support |
| 6009 | Broker unavailable / System busy - Email or SMS notification to respective support |
| 1037 | DS timeout (Customer doesn't have STK applet) - SMS notification to update SIM card |
| 6011 | Database unavailable - Email or SMS notification to respective support |
| 2001 | Wrong PIN entered - Notification to customer / initiator information invalid |
| 1031 | STK push timeout - Customer did not enter PIN in time |
| 17 | Reversal fails due to account balance limit (e.g., 100,000) |

---

## Testing

### Option 1: Daraja Simulator

1. Create a new test app, select Lipa na Bonga product.
2. The simulator automatically picks app credentials and predefined test data.
3. Hit the simulate button.

> **Note:** The simulator can only be accessed when logged in.

### Option 2: Postman

1. Generate access token:
   - Sandbox: `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
   - Production: `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
2. Initiate a transaction using the request body above.

---

## Go Live

1. Attach the integration to a live Pay Bill/Till number.
2. Navigate to the GO LIVE tab on the Daraja portal.
3. Fill in the short code of a live Pay Bill or Till number, the organization name, and an M-PESA admin/manager username.
4. Upon successful go live, production endpoints will be sent to your developer email and the sandbox app will be moved to production with production consumer key and secrets.

---

## M-PESA Organization Portal

### Access

URL: https://org.ke.m-pesa.com/orglogin.action

A Business Administrator role is required.

### First-Time Login Steps

1. Launch https://org.ke.m-pesa.com.
2. Enter the Short code (Bulk payment number).
3. Enter the Business Administrator username.
4. Enter the first-time password (case-sensitive).
5. Enter the Verification Code and click login.
6. Enter OTP to proceed to change password.
7. Set new password, security questions, and answers, then submit to activate.

### Account Types

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

#### Creating a Business Manager

1. Log in as Business Administrator.
2. Select Operators.
3. Click Add.
4. Enter username, select Access Channel as Web.
5. Assign role as Business Manager.
6. Enter KYC information and submit.

#### Creating an API User

1. Log in as Business Administrator.
2. Select Operators.
3. Click Add.
4. Enter API initiator username, select Access Channel as API.
5. Assign the appropriate role.
6. Enter KYC information and submit.
7. Set password via Business Manager: My Functions > Operator Management > search API user > Operations > Set Password. Avoid special characters like @ or .

### API Roles

| API | API Role Assignment |
|-----|-------------------|
| B2C | ORG B2C API Initiator |
| Business Pay Bill | Business Paybill Org API initiator |
| Business Buy Goods | Business Buy Goods Org API initiator |
| Transaction Status | Transaction Status query ORG API |
| Reversals | Org Reversals Initiator |
| Tax Remittance | Tax Remittance to KRA API |
| Set Password | Set Restricted ORG API PASSWORD |

### How to Apply for a Live Paybill/Till Number or B2C Account

Contact M-PESABusiness@Safaricom.co.ke.

---

## Support

- **Chatbot:** Daraja Chatbot for instant development and production support.
- **Production Issues & Incident Management:** Visit the Incident Management page or email apisupport@safaricom.co.ke.

---

## FAQs

1. **Is this API open to all merchants who collect via Lipa na M-PESA Pay Bill/Till number?**
   Yes.

2. **How do I earn Bonga Points on the Safaricom network?**
   You earn 1 Bonga Point for every Ksh 10 spent on Safaricom services (calls, SMS, data).

3. **Do I earn Bonga Points when I use M-PESA?**
   Yes, for M-PESA transaction charges of Ksh 100 or more. You earn 1 Bonga Point per qualifying transaction.

4. **How can I access the Bonga Points service?**
   Through *126#, *100# (prepaid), *200# (postpaid), *456#, My Safaricom App, or Zuri chatbot. Merchants integrate via the Lipa na Bonga API on Daraja.

5. **What happens if Bonga deduction succeeds but money transfer to merchant fails?**
   Equivalent Bonga points are reversed back and the customer is advised to try again.
