# Pull Transactions API

Retrieve historical transaction records from M-Pesa accounts.

**Endpoint:** `POST https://sandbox.safaricom.co.ke/mpesa/pulltransactions/v1/query`

## Overview
The Pull Transactions API enables businesses to retrieve historical transaction data from their M-Pesa accounts. This includes deposits, withdrawals, reversals, and other account activities for reconciliation and reporting.

### Key Features
- Historical transaction retrieval
- Advanced transaction filtering
- Batch transaction export
- Real-time data access
- Transaction reconciliation support
- Detailed transaction information

## How It Works
1. Business submits transaction query with filters
2. API validates credentials and parameters
3. M-Pesa retrieves matching transactions
4. Results returned with complete details
5. Business processes and reconciles data
6. Transactions exported or stored

## Use Cases
- Monthly reconciliation
- Accounting and bookkeeping
- Fraud investigation
- Transaction audits
- Revenue tracking
- Payment verification
- Financial reporting

## Getting Started

### Prerequisites
- Daraja Account on Safaricom Developer Portal
- Sandbox app with API credentials
- Consumer Key & Consumer Secret
- M-Pesa account with transaction history
- Appropriate API permissions

### Good to Know
Transaction history retention varies. Older transactions may require batch reports.

## Request Body
```json
{
  "AccessToken": "YYhZ20EF2nlgD2ekqK1Sy70b3eY",
  "ShortCode": "600000",
  "StartDate": "2024-01-01",
  "EndDate": "2024-01-31",
  "TransactionType": "All",
  "PageNumber": "1",
  "PageSize": "100"
}
```

## Request Parameter Definition

| Name | Description | Type | Sample |
|------|-------------|------|--------|
| AccessToken | OAuth access token | String | YYhZ20EF2nlgD2ekqK1Sy70b3eY |
| ShortCode | Business short code | String | 600000 |
| StartDate | Query start date (YYYY-MM-DD) | Date | 2024-01-01 |
| EndDate | Query end date (YYYY-MM-DD) | Date | 2024-01-31 |
| TransactionType | Transaction type filter (All, Deposit, Withdrawal, etc) | String | All |
| PageNumber | Result page number | Numeric | 1 |
| PageSize | Records per page (max 100) | Numeric | 100 |

## Response Body
```json
{
  "ResponseCode": "0",
  "ResponseDescription": "Success",
  "TotalCount": "250",
  "PageNumber": "1",
  "PageSize": "100",
  "Transactions": [
    {
      "TransactionID": "OA90000000",
      "TransactionDate": "2024-01-15 14:30:00",
      "TransactionType": "C2B",
      "Amount": "5000",
      "PhoneNumber": "254722000000",
      "Reference": "ACC-12345",
      "Status": "Success"
    }
  ]
}
```

## Response Parameter Definition

| Name | Description | Type | Sample |
|------|-------------|------|--------|
| ResponseCode | Query result | String | 0 |
| ResponseDescription | Status message | String | Success |
| TotalCount | Total matching transactions | Numeric | 250 |
| PageNumber | Current page | Numeric | 1 |
| PageSize | Records returned | Numeric | 100 |
| TransactionID | Unique transaction ID | String | OA90000000 |
| TransactionDate | Date and time | DateTime | 2024-01-15 14:30:00 |
| TransactionType | Type of transaction | String | C2B |
| Amount | Transaction amount | Numeric | 5000 |
| PhoneNumber | Customer phone | String | 254722000000 |
| Reference | Bill/Account reference | String | ACC-12345 |
| Status | Transaction status | String | Success |

## Transaction Types

| Type | Description |
|------|-------------|
| C2B | Customer to Business |
| B2C | Business to Customer |
| B2B | Business to Business |
| Reversal | Transaction reversal |
| Withdrawal | Cash withdrawal |
| Deposit | Account deposit |

## Transaction Status

| Status | Description |
|--------|-------------|
| Success | Transaction completed |
| Pending | Transaction processing |
| Failed | Transaction failed |
| Reversed | Transaction reversed |
| Cancelled | Transaction cancelled |

## Error Codes

| errorCode | errorMessage | Mitigation |
|-----------|-------------|------------|
| 400.002.02 | Invalid date range | Check date format |
| 401.002.01 | Invalid token | Regenerate token |
| 404.002.01 | Transactions not found | Adjust filters |
| 500.003.02 | Service unavailable | Retry request |

## Query Limits

| Limit | Value |
|-------|-------|
| Date range max | 12 months |
| Page size max | 100 records |
| Results limit | 100,000 records |

## Pagination
Results paginated to 100 records per page. Use PageNumber parameter to navigate.

## Reconciliation Process
1. Query transactions for date range
2. Match against internal records
3. Identify discrepancies
4. Flag failed transactions
5. Report summary

## Exports
Transactions can be exported as:
- CSV format
- JSON format
- PDF statements
- Direct database import

## Testing
Use Daraja Simulator with test transactions.

### Test Scenarios
1. Query transactions for past month
2. Query with date range filters
3. Paginate through large result sets
4. Verify transaction type filtering
5. Validate sorting and ordering

**Sandbox Endpoint:** `https://sandbox.safaricom.co.ke/mpesa/pulltransactions/v1/query`

## Go Live
Same endpoints work for production:
1. Use production Consumer Key & Consumer Secret
2. Generate production access token
3. Query live transaction history
4. Implement reconciliation cron job

**Production Endpoint:** `https://api.safaricom.co.ke/mpesa/pulltransactions/v1/query`

## Best Practices
- Implement automated reconciliation daily
- Cache query results for same day queries
- Use pagination for large result sets
- Store transaction history in local database
- Implement alerts for discrepancies
- Maintain audit trail of all queries
- Schedule heavy queries during off-peak hours

## FAQs
- **How far back can I query transactions?** Typically up to 12 months depending on retention policy.
- **How many transactions can I retrieve at once?** Maximum 100 per page; use pagination for more.
- **What time zone are transaction timestamps in?** East Africa Time (EAT/UTC+3).
- **Can I export transactions automatically?** Yes, implement scheduled queries and exports.
- **How often should I reconcile?** Daily for operational accounts; weekly minimum for audits.
- **What if a transaction is missing?** Check date range; contact Safaricom if genuinely missing.
- **Are there any rate limits on queries?** Implement reasonable intervals between queries.

## Support
- **Chatbot:** Daraja Chatbot
- **Email:** apisupport@safaricom.co.ke
