# Swap API (SIM Swap Detection)

Queries the last date a SIM card was swapped for fraud prevention.

**Endpoint:** `https://sandbox.safaricom.co.ke/imsi/v2/checkATI`

## Overview

Over the years, mobile banking customers have been the target of social engineering through various means, with the majority of fraud happening through SIM swap. With the introduction of the IMSI and SWAP API Products, fraud cases perpetrated through SIM swap are expected to reduce. This API caters to both mobile banking and internet banking services via API.

## How It Works

1. Organization sends an API request to Daraja with the customer's phone number.
2. Daraja authenticates the API call and forwards the request to M-PESA.
3. M-PESA returns the last swap date to Daraja, which forwards the response to the organization system.

> **Note:** This is a commercial API. This API is asynchronous. You can consume this API over the internet.

## Getting Started

### Prerequisites

- Create a Daraja Account on the Safaricom Developer Portal.
- Create a sandbox app in the portal to get API credentials.
- Retrieve Consumer Key & Consumer Secret from your sandbox app on My Apps.
- Test data is available on the simulator section.
- A signed commercial agreement is required.

### Onboarding

To be onboarded, partners can either write to apisupport@safaricom.co.ke or reach out to their account manager with a request to be onboarded to the SWAP API. The partner will have to make commercial agreements, after which they will be onboarded to the sandbox and production environments.

### Usage Fee

- Initial connection fee: KES 50,000
- First 200,000 requests: Free
- Thereafter: KES 1 charged per request

### Authentication

You must first generate an access token to authenticate your API calls. See the generate access token API for details.

## Integration Steps

### Use Cases

- Due diligence for risky mobile and Internet banking transactions for bank/fintech customers
- Onboarding to mobile banking service for new and old customers
- Cheque confirmations – OPS check if the line was swapped before clearing a cheque

### Sequence Diagram

Refer to the swap sequence diagram on the Safaricom Developer Portal.

## Request Body

```json
{
  "customerNumber": "254722000000"
}
```

## Request Parameter Definition

| Name | Description | Parameter Type | Possible Values |
|------|-------------|----------------|-----------------|
| customerNumber | The customer MSISDN whose network age is to be determined | Numeric | MSISDN (12 digits Mobile Number) e.g. 2547XXXXXXXX |

## Response Body

```json
{
  "requestRefID": "4277-415525-1",
  "responseCode": "200",
  "responseDesc": "Success",
  "lastSwapDate": "01-01-1900 00:00"
}
```

## Response Parameter Definition

| Name | Description | Parameter Type | Possible Values |
|------|-------------|----------------|-----------------|
| requestRefID | The unique request ID returned by the API for each request made | String | 4277-415525-1 |
| responseCode | A numeric status code that indicates the status of the transaction submission. 200 means successful submission, any other code means an error occurred. | Numeric | 200 |
| responseDesc | A message from the API that gives the status of the request processing and usually maps to a specific result code value. | String | Success |
| lastSwapDate | A string representing the date on which the mobile number was last swapped. If the specified SIM was swapped more than 3 months ago, the API returns a default date of `01-01-1900`. | String | 01-01-1900 00:00 |

## Error Codes

| HTTP Status Code | Error | Description |
|------------------|-------|-------------|
| 400 | Bad Request | The server could not understand the request due to invalid syntax |
| 401 | Unauthorized | The client must authenticate itself to get the requested response |
| 403 | Forbidden | The client does not have access rights to the content |
| 404 | Not Found | The server cannot find the requested resource |
| 405 | Method Not Allowed | The request method is known by the server but has been disabled |
| 408 | Request Timeout | The server did not receive a complete request message within the time it was prepared to wait |
| 429 | Too Many Requests | The user has sent too many requests in a given amount of time (rate limiting) |
| 500 | Internal Server Error | The server has encountered a situation it doesn't know how to handle |
| 501 | Not Implemented | The request method is not supported by the server |
| 502 | Bad Gateway | The server, while working as a gateway, got an invalid response |
| 503 | Service Unavailable | The server is not ready to handle the request |
| 504 | Gateway Timeout | The server, while acting as a gateway or proxy, did not get a response in time |

## Testing

### Option 1: Daraja Simulator

Create a new test app under apps on the main nerve bar, select SWAP product. Once the app is successfully created, the simulator is automated to pick app credentials (Consumer key and Consumer Secret) and predefined test data. You can hit the simulate button.

> **Note:** The simulator can only be accessed when logged in. Please log in to your Daraja account to access the simulator.

### Option 2: Postman

Use the credentials to generate an access token using the below endpoint.

**Sandbox:** `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
**Production:** `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`

Initiate a request using the request body above.

> **Note:** The Postman collection can only be accessed when logged in. Please log in to your Daraja account to access the collection.

## Go Live

We've already tested and finished development. Now attach the integration to a live production environment.

For Go Live support, kindly email apisupport@safaricom.co.ke.

### Requirements for Onboarding

- Submit company registration details (required to create your account and facilitate billing)
- Provide a signed commercial agreement as part of the onboarding process

## Support

### Chatbot

Developers can get instant responses using the Daraja Chatbot for both development and production support.

### Production Issues & Incident Management

- **Incident Management Page:** Visit the Incident Management page on the Safaricom Developer Portal.
- **Email:** Reach out to API support at apisupport@safaricom.co.ke

## FAQs

**What is the SWAP API?**
The SWAP API allows users to query the last SIM SWAP date of a phone number. The API acts as a security enhancement, preventing fraud cases.

**How does the SWAP API work?**
The sequence diagram on the Safaricom Developer Portal illustrates the interaction between the client application and the SWAP API.

**What should I do if I encounter an error?**
Check the responseCode and responseDesc for details on the error. Ensure that all parameters are correctly formatted and valid. Retry the request or contact support if the issue persists.

**How can I get support?**
For further assistance, use the ask Daraja assistant, raise an incident on self services, or email apisupport@safaricom.co.ke.

**Who is eligible for this API?**
Any registered company can apply. While we recommend having an M-PESA Paybill or Till number, it is not mandatory and depends on your business model.
