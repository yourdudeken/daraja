# IMSI API

The IMSI API enhances security by letting users verify a Safaricom number's age, registration date, hashed IMSI, and last SIM swap.

**Endpoint:** `POST https://sandbox.safaricom.co.ke/imsi/v1/checkATI`

---

## Overview

IMSI stands for International Mobile Subscriber Identity. The IMSI API allows users to query the network age of a Safaricom phone number. The API acts as a security enhancement, preventing fraud cases. Partners can query:

- Phone number network registration date
- Hashed IMSI number
- Last SIM swap date

### Key Checks

- Hashed IMSI
- Age on Network < 6 months
- Swap Date < 3 Months

### Usage Fee

KES. 20 per call

---

## How It Works

1. Organization sends an API request to Daraja with the customer's phone number.
2. Daraja authenticates the API call and forwards the request to M-PESA.
3. M-PESA returns the hashed IMSI, age on network, and last swap date to Daraja, which forwards the response to the organization's system.

---

## Getting Started

### Prerequisites

- Daraja Account on Safaricom Developer Portal.
- Sandbox app to get API credentials.
- Consumer Key & Consumer Secret.
- Test data from the simulator section.
- Signed commercial agreement.

### Good to Know

- This is a commercial API.
- The API is asynchronous.
- Can be consumed over the internet.

### Get Auth Token

Generate an access token to authenticate API calls. See the Authorization API documentation.

---

## Request Body

```json
{
  "customerNumber": "254722000000"
}
```

---

## Request Parameter Definition

| Name | Description | Parameter Type | Possible Values |
|------|-------------|---------------|-----------------|
| Customer Number | The customer MSISDN whose network age is to be determined. | Numeric | MSISDN (12 digits Mobile Number) e.g., 2547XXXXXXXX |

---

## Response Body

```json
{
  "requestRefID": "971f-4359-b611-6845a1be45ef280786",
  "responseCode": "200",
  "responseDesc": "Success",
  "imsi": "9233817055099406",
  "lastSwapDate": "01-05-2022",
  "msisdnRegistrationDate": "01-03-2022",
  "customerNumber": "254722000000"
}
```

---

## Response Parameter Definition

| Name | Description | Parameter Type | Possible Values |
|------|-------------|---------------|-----------------|
| requestRefID | The unique request ID returned by the API for each request made. | String | 4277-415525-1 |
| responseCode | Numeric status code that indicates the status of the transaction submission. 200 means successful submission. | Numeric | 200 |
| responseDesc | Message from the API that gives the status of request processing. | String | Success |
| imsi | The hashed number representing the international mobile subscriber identity. | Numerical | 4213215110021315 |
| lastSwapDate | Date when the mobile number was last swapped. If swapped more than 3 months ago, returns a default date of 01-01-1900. | String | 01-01-1900 00:00 |
| msisdnRegistrationDate | MSISDN registration date on the network or a message depicting registration is more than one year old. | String | 2019-01-12 |
| customerNumber | The customer MSISDN whose network age was determined. | Numeric | 254722001231 |

---

## Result Codes

| HTTP Status Code | Error | Description |
|------------------|-------|-------------|
| 400 | Bad Request | The server could not understand the request due to invalid syntax. |
| 401 | Unauthorized | The client must authenticate itself to get the requested response. |
| 403 | Forbidden | The client does not have access rights to the content. |
| 404 | Not Found | The server can not find the requested resource. |
| 405 | Method Not Allowed | The request method is known but has been disabled. |
| 408 | Request Timeout | The server did not receive a complete request within the time it was prepared to wait. |
| 429 | Too Many Requests | The user has sent too many requests in a given amount of time. |
| 500 | Internal Server Error | The server encountered a situation it doesn't know how to handle. |
| 501 | Not Implemented | The request method is not supported by the server. |
| 502 | Bad Gateway | The server got an invalid response while working as a gateway. |
| 503 | Service Unavailable | The server is not ready to handle the request. |
| 504 | Gateway Timeout | The server did not get a response in time while acting as a gateway. |

---

## Testing

### Option 1: Daraja Simulator

1. Create a new test app, select IMSI product.
2. The simulator automatically picks app credentials and predefined test data.
3. Hit the simulate button.

> **Note:** The simulator can only be accessed when logged in.

### Option 2: Postman

1. Generate access token:
   - Sandbox: `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
   - Production: `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
2. Initiate a transaction using the request body above.

---

## Onboarding

To be onboarded, partners can either write to apisupport@safaricom.co.ke or reach out to their account manager. The partner will need to make commercial agreements, after which they will be onboarded to the sandbox and production environments.

### Requirements for Onboarding

- Submit company registration details (for account creation and billing).
- Provide a signed commercial agreement.

---

## Go Live

For Go Live support, email apisupport@safaricom.co.ke.

---

## Support

- **Chatbot:** Daraja Chatbot for instant development and production support.
- **Production Issues & Incident Management:** Visit the Incident Management page or email apisupport@safaricom.co.ke.

---

## FAQs

1. **What is the IMSI API?**
   The IMSI API allows users to query the network age of an MSISDN. It acts as a security enhancement, preventing fraud cases. Partners can query the MSISDN network registration date and the last swap date.

2. **How does the IMSI API work?**
   The organization sends a request to Daraja with the customer's phone number. Daraja authenticates and forwards the request to M-PESA, which returns the hashed IMSI, age on network, and last swap date.

3. **What should I do if I encounter an error?**
   Check the responseCode and responseDesc for details. Ensure all parameters are correctly formatted and valid. Retry the request or contact support if the issue persists.

4. **How can I get support?**
   Use the Daraja assistant, raise an incident on self-services, or email apisupport@safaricom.co.ke.

5. **Who is eligible for this API?**
   Any registered company can apply. While having an M-PESA Paybill or Till number is recommended, it is not mandatory and depends on your business model.
