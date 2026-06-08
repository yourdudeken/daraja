# Bill Manager API

By Safaricom

Gives the business and customers a one-stop end-to-end platform to send, receive, pay and reconcile all payments.

---

## Overview

Welcome to M-PESA Bill Manager for organizations. M-PESA Bill Manager is a digital service that gives the business and customers a one-stop end-to-end platform to send, receive, pay and reconcile all payments.

### Key Features

- **Onboarding:** Register your shortcode to the Bill Manager platform.
- **Single Invoicing:** Create and send customized individual e-invoices to customers.
- **Bulk Invoicing:** Send multiple e-invoices in a single API call (up to 1000 invoices).
- **Payments and Reconciliation:** Receive payment notifications and send receipt acknowledgments.
- **Cancel Invoice:** Recall already sent invoices (single or bulk).
- **Update Opt-in Details:** Modify your onboarding configuration.

### Important Information

- You will use your Daraja access token for all the Bill Manager integrated APIs.
- You can use the same consumer key for multiple shortcodes that belong to that consumer key.

## How It Works

1. **Onboarding:** Register your paybill/buy goods shortcode to Bill Manager via the opt-in API.
2. **Invoicing:** Create and send single or bulk e-invoices to your customers via SMS.
3. **Payment:** Customers pay via USSD, SIM Toolkit, M-PESA App, or Safaricom App referencing their account number.
4. **Reconciliation:** Bill Manager pushes payment notifications to your callback URL. You acknowledge and send receipt to the customer.

---

## 1. Onboarding Generic API

Register your organization's shortcode to the Bill Manager platform.

**Endpoint:** `POST https://api.safaricom.co.ke/v1/billmanager-invoice/optin`

This is the first API used to opt you as a biller to our bill manager features. Once you integrate and send a request with a success response, your shortcode is whitelisted and you are able to integrate with all the other remaining bill manager APIs.

### Request Body

```json
{
  "shortcode": "718003",
  "email": "youremail@gmail.com",
  "officialContact": "0710XXXXXX",
  "sendReminders": "1",
  "logo": "image",
  "callbackurl": "http://my.server.com/bar/callback"
}
```

### Request Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| shortcode | Organization's shortcode (Paybill or Buygoods - 5 to 6 digit account number) used to identify an organization and receive the transaction. | Numeric \| Required | 654321 |
| email | Official contact email address for the organization signing up to bill manager. It will appear in invoices and payment receipts for customers to reach out to you. | String \| Required | example@mail.com |
| officialContact | Official contact phone number for the organization signing up to bill manager. It will appear in invoices and payment receipts. | Numeric \| Required | 0710XXXXXX |
| sendReminders | Enable or disable SMS payment reminders for invoices sent. A payment reminder is sent 7 days before the due date, 3 days before the due date, and on the day the payment is due. 0 = Disable, 1 = Enable. | Boolean \| Required | 0 or 1 |
| logo | Image to be embedded in the invoices and receipts sent to your customer. | Image \| Optional | JPEG, JPG |
| callbackurl | Callback URL provided by you during the initial opt-in process. This will be invoked by our payments API to push payments done to your paybill. | URL \| Required | http://my.server.com/bar/callback |

### Response Body

```json
{
  "app_key": "AG_2376487236_126732989KJ",
  "resmsg": "Success",
  "rescode": "200"
}
```

### Response Parameter Definition

| Name | Description | Sample Values |
|------|-------------|---------------|
| app_key | This app_key is the one you receive upon onboarding your paybill to the Daraja Platform. | AG_2376487236_126732989KJ |
| resmsg | Message from the API that gives the status of the request processing and maps to a specific result code value. | Success |
| rescode | Numeric status code that indicates the status of the transaction processing. 200 means success and any other code means an error occurred or the transaction failed. | 200 |

---

## 2. Single Invoicing Generic API

Create and send a single e-invoice to a customer. Customers receive the notification via SMS to the Safaricom phone number specified.

**Endpoint:** `POST https://api.safaricom.co.ke/v1/billmanager-invoice/single-invoicing`

### Important Information

A customer can still opt to pay via USSD, SIM Toolkit, M-PESA App, or Safaricom App to your pay bill number as long as they reference the correct account number (account reference) as specified on the invoice.

### Request Body

```json
{
  "externalReference": "#9932340",
  "billedFullName": "John Doe",
  "billedPhoneNumber": "07XXXXXXXX",
  "billedPeriod": "August 2021",
  "invoiceName": "Jentrys",
  "dueDate": "2021-10-12",
  "accountReference": "1ASD678H",
  "amount": "800",
  "invoiceItems": [
    {
      "itemName": "food",
      "amount": "700"
    },
    {
      "itemName": "water",
      "amount": "100"
    }
  ]
}
```

### Request Parameter Definition

| Name | Description | Parameter Type | Possible Values |
|------|-------------|---------------|-----------------|
| externalReference | Unique invoice name on your system's end. Used for referencing an invoice from both Bill Manager and your system. | Varchar \| Required | INV2345 |
| billedFullName | The name of the recipient to receive the invoice details. It will appear in the SMS sent. | String \| Required | Thomas Shelby |
| billedPhoneNumber | The phone number to receive invoice details via SMS. Must be a Safaricom number. | Numeric \| Required | 0722XXXXXX |
| billedPeriod | Month and Year of the billing period. | Date (M/Y) \| Required | August 2021 |
| invoiceName | A descriptive invoice name for what your customer is being billed. It will appear in the invoice SMS. | Varchar \| Required | damagefee, watersupply |
| dueDate | The date you expect the customer to have paid the invoice amount. Three reminders will be sent before the due date (7 days, 3 days, and on the due date). | String Varchar \| Required | 2021-09-15 00:00:00.00 |
| accountReference | The account number being invoiced that uniquely identifies a customer. Could be a customer name, business name, property unit, student name, etc. | String (Varchar) \| Required | John Doe, WS Suppliers, G70 |
| amount | Total invoice amount to be paid in Kenyan Shillings. No special characters (e.g., commas). | Numeric \| Required | 2000 |
| invoiceItems | Additional billable items to be included in your invoice. Items will appear on the e-invoice. | itemName: String, amount: Numeric \| Optional | Food, 1000 |

### Response Body

```json
{
  "Status_Message": "Invoice sent successfully",
  "resmsg": "Success",
  "rescode": "200"
}
```

### Response Parameter Definition

| Name | Description | Sample Values |
|------|-------------|---------------|
| Status_Message | Descriptive message to show the exact meaning of a response. | Invoice sent successfully |
| rescode | Numeric status code. 200 means success, any other code means an error occurred. | 200 |
| resmsg | Message from the API that gives the status of the request processing. | Success |

---

## 3. Bulk Invoicing Generic API

Send multiple e-invoices in a single API call. Up to 1000 invoices can be sent per call.

**Endpoint:** `POST https://api.safaricom.co.ke/v1/billmanager-invoice/bulk-invoicing`

### Important Information

- A customer can still opt to pay via USSD, SIM Toolkit, M-PESA App, or Safaricom App using the correct account reference.
- To send multiple e-invoices, specify the fields in the `bulk` array section.
- The `appKey` needs to be in the Header of every Service Request provided to you during onboarding.

### Request Body

```json
[
  {
    "externalReference": "1107",
    "billedFullName": "John Doe",
    "billedPhoneNumber": "0722000000",
    "billedPeriod": "August 2021",
    "invoiceName": "Jentrys",
    "dueDate": "2021-09-15 00:00:00.00",
    "accountReference": "A1",
    "amount": "2000",
    "invoiceItems": [
      { "itemName": "food", "amount": "1000" },
      { "itemName": "water", "amount": "1000" }
    ]
  },
  {
    "externalReference": "967",
    "billedFullName": "John Doe",
    "billedPhoneNumber": "0722000000",
    "billedPeriod": "August 2021",
    "invoiceName": "Jentrys",
    "dueDate": "2021-09-15 00:00:00.00",
    "accountReference": "Balboa45",
    "amount": "2000",
    "invoiceItems": [
      { "itemName": "food", "amount": "1000" },
      { "itemName": "water", "amount": "1000" }
    ]
  },
  {
    "externalReference": "120401",
    "billedFullName": "John Doe",
    "billedPhoneNumber": "0722000000",
    "billedPeriod": "August 2021",
    "invoiceName": "Jentrys",
    "dueDate": "2021-09-15 00:00:00.00",
    "accountReference": "Balboa45",
    "amount": "2000",
    "invoiceItems": [
      { "itemName": "food", "amount": "1000" },
      { "itemName": "water", "amount": "1000" }
    ]
  },
  {
    "externalReference": "120067",
    "billedFullName": "John Doe",
    "billedPhoneNumber": "0722000000",
    "billedPeriod": "August 2021",
    "invoiceName": "Jentrys",
    "dueDate": "2021-09-15 00:00:00.00",
    "accountReference": "",
    "invoiceItems": [
      { "itemName": "food", "amount": "1000" },
      { "itemName": "water", "amount": "1000" }
    ]
  }
]
```

### Request Parameter Definition

| Name | Description | Parameter Type | Possible Values |
|------|-------------|---------------|-----------------|
| externalReference | Unique invoice name on your system's end. Must be existing, otherwise the invoice will not be sent. | Varchar \| Required | INV2345 |
| billedFullName | The name of the recipient to receive the invoice details. It will appear in the SMS sent. | String \| Required | Thomas Shelby |
| billedPhoneNumber | The phone number to receive invoice details via SMS. Must be a Safaricom number. | Numeric \| Required | 0722XXXXXX |
| billedPeriod | Month and Year of the billing period. | Date (M/Y) \| Required | August 2021 |
| invoiceName | A descriptive invoice name for what your customer is being billed. | Varchar \| Required | damagefee, watersupply |
| dueDate | The date you expect the customer to have paid the invoice amount. | String Varchar \| Required | 2021-09-15 00:00:00.00 |
| accountReference | The account number being invoiced that uniquely identifies a customer. | String (Varchar) \| Required | John Doe, WS Suppliers, G70 |
| amount | Total invoice amount to be paid in Kenyan Shillings. No special characters. | Numeric \| Required | 2000 |
| invoiceItems | Additional billable items to be included in your invoice. | itemName: String, amount: Numeric \| Optional | Food, 1000 |

### Response Body

```json
{
  "Status_Message": "Invoice sent successfully",
  "resmsg": "Success",
  "rescode": "200"
}
```

### Response Parameter Definition

| Name | Description | Sample Values |
|------|-------------|---------------|
| Status_Message | Descriptive message to show the exact meaning of a response. | Invoice sent successfully |
| rescode | Numeric status code. 200 means success, any other code means an error occurred. | 200 |
| resmsg | Message from the API that gives the status of the request processing. | Success |

---

## 4. Payments and Reconciliation Generic API

Receive payment notifications and send receipt acknowledgments to your customers.

**Endpoint:** `POST https://api.safaricom.co.ke/v1/billmanager-invoice/reconciliation`

### Overview

The Bill Manager payment feature enables your customers to receive e-receipts for payments made to your paybill account.

### Pre-Condition

Your business pay bill must have been onboarded to Bill Manager for us to push payments to you and for Bill Manager to receive your payment acknowledgment details.

### Payment Flow

1. An M-PESA customer makes a C2B payment to your pay bill number with the correct account number (account reference) via USSD, SIM Toolkit, M-PESA App, Safaricom App, or from the Bill Manager e-invoice.
2. Bill Manager receives the payment and pushes it to you for acknowledgment via the callback URL you provided during onboarding.

> **Note:** Bill Manager will try to send payment details **5 times** to your callback URL before cancelling the request.

### Sample Payment API Request Body

```json
{
  "transactionId": "{trandID}",
  "paidAmount": "{50}",
  "msisdn": "254710119383",
  "dateCreated": "2021-09-15",
  "accountReference": "LGHJIO789",
  "shortCode": "349350555"
}
```

### Request Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| transactionId | The M-PESA generated reference. | String (Varchar) \| Required | RJB53MYR1N |
| paidAmount | Amount paid in KES. | Numeric | 5000 |
| msisdn | The customer's phone number debited. | Numeric | 254722000000 |
| dateCreated | The date the payment was done and recorded in the BillManager System. | Date | 2021-10-01 |
| accountReference | The account number being invoiced that uniquely identifies a customer. | AlphaNumeric | BC001 |
| shortCode | Organization's shortcode (Paybill or Buygoods - 5 to 6 digit account number). | Numeric | 456545 |

### Response Body

```json
{
  "resmsg": "Success",
  "rescode": "200"
}
```

### Response Parameter Definition

| Name | Description | Sample Values |
|------|-------------|---------------|
| resmsg | Message from the API that gives the status of the request processing. | Success |
| rescode | Numeric status code. 200 means success, any other code means an error occurred. | 200 |

### Acknowledgment Process

Once the payment details are availed to you, you will reconcile the payment on your end and send an acknowledgment message to the Bill Manager acknowledgment endpoint. Acknowledgment details must contain:

- Payment Date
- Paid Amount
- Account Reference
- External Reference
- Transaction ID
- Customer Phone Number
- Customer Full Name
- Invoice Name

Upon receiving the acknowledgment message, Bill Manager will process it and send a receipt acknowledgment message to your customers via the phone number provided.

### Sample Acknowledgment API Request Body

```json
{
  "paymentDate": "2021-10-01",
  "paidAmount": "800",
  "accountReference": "Balboa95",
  "transactionId": "PJB53MYR1N",
  "phoneNumber": "0710XXXXXX",
  "fullName": "John Doe",
  "invoiceName": "School Fees",
  "externalReference": "955"
}
```

### Acknowledgment Request Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| paymentDate | The date the payment was made. | Date | 2021-10-01 |
| paidAmount | Amount paid in Kenyan Shillings. No special characters such as commas. | Numeric \| Required | 5000 |
| accountReference | The account number being invoiced that uniquely identifies a customer. | String (Varchar) \| Required | D44 |
| transactionId | The M-PESA generated reference. | String (Varchar) \| Required | PJB53MYR1N |
| phoneNumber | The Safaricom phone number that receives the e-invoice details via SMS. | Numeric \| Required | 0722XXXXXX |
| fullName | The name of the invoiced recipient. | String (Varchar) \| Required | Thomas Shelby |
| invoiceName | A descriptive name for what your customer is being billed. It will appear in the invoice SMS. | String (Varchar) \| Required | damagefee, watersupply |
| externalReference | Unique invoice reference from your system. | Varchar | INV2345 |

### Acknowledgment Response Body

```json
{
  "resmsg": "Success",
  "rescode": "200"
}
```

### Acknowledgment Response Parameter Definition

| Name | Description | Sample Values |
|------|-------------|---------------|
| resmsg | Message from the API that gives the status of the request processing. | Success |
| rescode | Numeric status code. 200 means success, any other code means an error occurred. | 200 |

---

## 5. Cancel Invoice APIs

Recall already sent invoices. A partially paid or fully paid invoice cannot be cancelled. Existing external reference number(s) are used to specify the exact invoice(s) you want to cancel.

### Cancel Single Invoice

**Endpoint:** `POST https://api.safaricom.co.ke/v1/billmanager-invoice/cancel-single-invoice`

#### Request Body

```json
{
  "externalReference": "113"
}
```

### Cancel Bulk Invoices

**Endpoint:** `POST https://sandbox.safaricom.co.ke/v1/billmanager-invoice/cancel-bulk-invoices`

#### Request Body

```json
[
  { "externalReference": "113" },
  { "externalReference": "114" }
]
```

#### Success Response Body

```json
{
  "Status_Message": "Invoice cancelled successfully.",
  "resmsg": "Success",
  "rescode": "200",
  "errors": []
}
```

#### Error Response Body (Partially/Fully Paid Invoice)

```json
{
  "Status_Message": "Partially or fully paid invoices cannot be cancelled.",
  "resmsg": "Conflict",
  "rescode": "409",
  "errors": []
}
```

---

## 6. Updating Opt-in Details

Update your Bill Manager onboarding configuration.

**Endpoint:** `POST https://sandbox.safaricom.co.ke/v1/billmanager-invoice/change-optin-details`

### Important Information

- You will use your Daraja access token for all the Bill Manager integrated APIs.
- You can use the same consumer key for multiple shortcodes that belong to that consumer key.

### Request Body

```json
{
  "shortcode": "718003",
  "email": "youremail@gmail.com",
  "officialContact": "0710XXXXXX",
  "sendReminders": 1,
  "logo": "image",
  "callbackurl": "/api.example.com/payments?callbackURL=http://my.server.com/bar"
}
```

### Request Parameter Definition

| Name | Description | Parameter Type | Possible Values |
|------|-------------|---------------|-----------------|
| email | Official contact email address. It will appear in invoices and payment receipts. | String \| Required | example@mail.com |
| officialContact | Official contact phone number. It will appear in invoices and payment receipts. | Numeric \| Required | 0710XXXXXX |
| sendReminders | Enable or disable SMS payment reminders. A reminder is sent 7 days before, 3 days before, and on the due date. 0 = Disable, 1 = Enable. | Numeric \| Required | 0 or 1 |
| logo | Image to be embedded in invoices and receipts. | Image \| Required | JPEG, JPG |
| callbackurl | Callback URL invoked by our payments API to push payments done to your paybill. | URL \| Optional | /api.example.com/payments?callbackURL=http://my.server.com/bar |

### Response Body

```json
{
  "resmsg": "Success",
  "rescode": "200"
}
```

### Response Parameter Definition

| Name | Description | Sample Values |
|------|-------------|---------------|
| resmsg | Message from the API that gives the status of the request processing. | Success |
| rescode | Numeric status code. 200 means success, any other code means an error occurred. | 200 |

---

## Error Response Parameter Definition

### Onboarding Generic API Errors

| Error | Possible Cause | Mitigation |
|-------|---------------|------------|
| 409 Action Forbidden: Biller already Registered | Invalid short code | Use a short code which hasn't been onboarded |
| 409 Action Forbidden: Invalid consumer key/short code | Invalid consumer key/short code | Use correct consumer key/short code |

### Single Invoicing Generic API Errors

| Error | Possible Cause | Mitigation |
|-------|---------------|------------|
| 409 Action Forbidden: Invalid consumer key/short code | Invalid consumer key/short code | Use correct consumer key/short code |
| 409 Action forbidden: Another entry exists with the same externalReference number | External reference number already exists | Use a different externalReference number |
| 409 Action forbidden: Incorrect phone number format | Incorrect phone number format | Use format 254722XXXXXX or 0722XXXXXX |
| 409 Action forbidden: Incorrect due date format | Incorrect due date format | Use format yymmdd |

### Bulk Invoicing Generic API Errors

| Error | Possible Cause | Mitigation |
|-------|---------------|------------|
| 409 | Invalid consumer key/short code | Use correct consumer key/short code |
| 409 | Another entry exists with the same externalReference number | Use a different externalReference number |
| 409 | Incorrect phone number format | Use format 254722XXXXXX or 0722XXXXXX |
| 409 | Incorrect due date format | Use format yymmdd |

### Update Opt-in Details Errors

| Error Response Body | Description |
|---------------------|-------------|
| `{"Status_Message": "Biller already Registered", "resmsg": "Action Forbidden", "rescode": "409"}` | Invalid short code |
| `{"Status_Message": "Invalid consumerkey/shortcode", "resmsg": "Action Forbidden", "rescode": "409"}` | Invalid consumer key/short code |

| Name | Description | Possible Values |
|------|-------------|-----------------|
| Status_Message | Descriptive message to show the exact meaning of a response. | Biller is already Registered |
| resmsg | Message from the API that gives the status of the request processing. | Action Forbidden |
| rescode | Numeric status code. 409 means conflict/error. | 409 |

---

## Testing

### Option 1: Daraja Simulator
Create a test app and use the simulator which provides test data.

### Option 2: Postman
Use credentials to generate access token, then initiate the relevant Bill Manager API request.

**Sandbox Token Endpoint:** `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`

**Production Token Endpoint:** `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`

## Go Live

Attach the integration to a live pay bill/till number. Navigate to the GO LIVE tab and provide:

- Short code of a live pay bill or till number
- Organization name
- M-PESA admin/manager username

Upon successful go live, production endpoints will be sent to the developer email.

## Support

- **Chatbot:** Developers can get instant responses using the Daraja Chatbot for both development and production support.
- **Production Issues & Incident Management:** Visit the Incident Management page or email apisupport@safaricom.co.ke.
