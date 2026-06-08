# M-Pesa Express Query API

Check the status of a Lipa Na M-Pesa Online (STK Push) payment.

**Endpoint:** `POST https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query`

## Overview
The M-Pesa Express Query API (also known as STK Push Query) enables merchants to check the status of a previously initiated Lipa Na M-Pesa Online payment. This is useful for reconciliation and handling delayed or uncertain transaction states.

### Key Features
- Real-time STK Push status checking
- Transaction reconciliation support
- Handles successful and failed transactions
- User cancellation detection
- Timeout handling

## How It Works
1. Merchant initiates STK Push via M-Pesa Express API
2. Customer receives prompt and may accept/reject
3. Merchant queries status using CheckoutRequestID
4. API returns current transaction status
5. Merchant takes action based on status
6. Transaction reconciled in merchant system

## Use Cases
- Verify payment completion
- Handle timeout scenarios
- Reconcile pending transactions
- User cancellation detection
- Payment retry logic
- Transaction status dashboard

## Getting Started

### Prerequisites
- Daraja Account on Safaricom Developer Portal
- Sandbox app with API credentials
- Consumer Key & Consumer Secret
- Active M-Pesa Express integration
- Business shortcode and passkey

## Request Body
```json
{
  "BusinessShortCode": "174379",
  "Password": "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMjEwNjI4MDkyNDA4",
  "Timestamp": "20210628092408",
  "CheckoutRequestID": "ws_CO_260520211133524545"
}
```

## Request Parameter Definition

| Name | Description | Type | Required | Sample |
|------|-------------|------|----------|--------|
| BusinessShortCode | Organization's shortcode (Paybill or Buygoods 5-7 digits) | Numeric | Yes | 174379 |
| Password | Base64 encode(Shortcode+Passkey+Timestamp) | String | Yes | MTc0Mzc5YmZiMjc5Zj... |
| Timestamp | Timestamp format YYYYMMDDHHmmss | Timestamp | Yes | 20210628092408 |
| CheckoutRequestID | Global unique identifier of STK Push checkout request | String | Yes | ws_CO_260520211133524545 |

### Password Encoding
The Password field requires Base64 encoding of concatenated string:
```
Password = Base64(BusinessShortCode + Passkey + Timestamp)
Example: Base64("174379" + "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c91920210628092408")
```

## Response Body
```json
{
  "ResponseCode": "0",
  "ResponseDescription": "The service request has been accepted successfully",
  "MerchantRequestID": "22205-34066-1",
  "CheckoutRequestID": "ws_CO_13012021093521236557",
  "ResultCode": "0",
  "ResultDesc": "The service request is processed successfully."
}
```

## Response Parameter Definition

| Name | Description | Type | Sample |
|------|-------------|------|--------|
| ResponseCode | API acceptance status (0 = accepted) | Numeric | 0 |
| ResponseDescription | Acknowledgment message from API | String | The service request has been accepted successfully |
| MerchantRequestID | Global unique identifier for query request | String | 22205-34066-1 |
| CheckoutRequestID | Echo of original CheckoutRequestID | String | ws_CO_13012021093521236557 |
| ResultCode | Query result status (0 = success, 1032 = cancelled) | Numeric | 0 |
| ResultDesc | Detailed status message | String | The service request is processed successfully |

## Result Status Codes

| ResultCode | ResultDesc | Meaning | Action |
|-----------|-----------|---------|--------|
| 0 | The service request is processed successfully | Payment completed successfully | Mark as paid |
| 1032 | Request canceled by user | Customer cancelled the prompt | Retry or cancel order |
| 1 | Transaction timeout | Payment timed out (60 seconds) | Retry or timeout handling |
| 2 | The Initiator does not have permission to access the account | Invalid credentials | Verify API credentials |

## Callback Payload (Optional)
If configured, results also sent to ResultURL:

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "22205-34066-1",
      "CheckoutRequestID": "ws_CO_13012021093521236557",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 1 },
          { "Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV" },
          { "Name": "TransactionDate", "Value": 20210113093521 },
          { "Name": "PhoneNumber", "Value": 254722000000 }
        ]
      }
    }
  }
}
```

## Error Codes

| Error Code | Description | HTTP | Mitigation |
|-----------|-------------|------|-----------|
| 404.001.04 | Invalid Authentication Header | 401 | Ensure POST method; include proper auth header |
| 400.002.05 | Invalid Request Payload | 400 | Verify all required fields are present |
| 400.003.01 | Invalid Access Token | 401 | Generate new token; ensure not expired |
| 400.002.02 | Bad Request - Invalid BusinessShortCode | 400 | Verify shortcode is correct |
| 400.002.03 | Bad Request - Invalid CheckoutRequestID | 400 | Ensure CheckoutRequestID from original request |

## Query Timing
- Queries can be performed immediately after STK Push initiation
- Recommended: Query after 5-10 seconds if no immediate callback
- STK Push prompts timeout after 60 seconds
- Successful queries return results within 1-2 seconds

## Best Practices
- Store CheckoutRequestID from initial STK Push request
- Query status 5-10 seconds after STK Push for timeout handling
- Implement exponential backoff for retry logic
- Cache query results to avoid duplicate API calls
- Log all queries for debugging and reconciliation
- Handle all result codes appropriately in application logic

## Testing
1. Initiate M-Pesa Express request and capture CheckoutRequestID
2. Wait 5-10 seconds
3. Query status using the CheckoutRequestID
4. Test with Daraja Simulator for various scenarios

**Sandbox Endpoint:** `https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query`

## Go Live
When ready for production:
1. Use production Consumer Key & Consumer Secret
2. Generate production access tokens
3. Update callback URLs to HTTPS production endpoints
4. Implement production monitoring and alerting
5. Test with small transaction amounts first

**Production Endpoint:** `https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query`

## FAQs
- **When should I query transaction status?** After initial timeout or for pending transactions.
- **How often can I query?** Rate limits may apply; implement throttling and exponential backoff and respect API quota responses.
- **What's a valid CheckoutRequestID?** ID returned from STK Push initiation request.
- **How long is query result cached?** Results available for 24 hours post-transaction.
- **Can I query expired transactions?** Yes, but results may not be available after 30 days.
- **What if query returns unknown status?** Transaction may be pending; retry after delay.
- **How do I handle timeout queries?** Implement automatic retry with exponential backoff.

## Production Considerations
- Implement automatic query logic for pending transactions
- Store query results in transaction database
- Create alerts for failed transactions
- Implement reconciliation cron job for older transactions
- Consider rate limiting to avoid API quota issues

## Support
- **Chatbot:** Daraja Chatbot
- **Email:** apisupport@safaricom.co.ke
