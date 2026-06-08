# Query Org Info API

Retrieve organization/business information and account details.

**Endpoint:** `POST https://sandbox.safaricom.co.ke/mpesa/queryorginfo/v1/query`

## Overview
The Query Org Info API enables retrieval of organization account details, business information, and M-Pesa account configuration. This is useful for account validation and business information verification.

### Key Features
- Organization details retrieval
- Account configuration access
- Business information verification
- Account status checking
- API access permissions view
- Account hierarchy information

## How It Works
1. Business queries organization information
2. API validates credentials
3. M-Pesa retrieves organization data
4. Account details returned
5. Business verifies information
6. Integration with management systems

## Use Cases
- Account information verification
- Business detail confirmation
- API permissions checking
- Account status monitoring
- Multi-account management
- Integration validation
- Compliance verification

## Getting Started

### Prerequisites
- Daraja Account on Safaricom Developer Portal
- Sandbox app with API credentials
- Consumer Key & Consumer Secret
- Organization/business account
- Admin/Manager access level

### Good to Know
Query Org Info provides metadata about your M-Pesa business account and API access.

## Request Body
```json
{
  "AccessToken": "YYhZ20EF2nlgD2ekqK1Sy70b3eY"
}
```

## Request Parameter Definition

| Name | Description | Type | Sample |
|------|-------------|------|--------|
| AccessToken | OAuth access token from Authorization API | String | YYhZ20EF2nlgD2ekqK1Sy70b3eY |

## Response Body
```json
{
  "ResponseCode": "0",
  "ResponseDescription": "Success",
  "Organization": {
    "OrgName": "ABC Business Limited",
    "ShortCode": "600000",
    "AccountType": "PayBill",
    "Status": "Active",
    "Industry": "Retail",
    "Region": "Kenya"
  },
  "Accounts": [
    {
      "AccountNumber": "600000",
      "AccountType": "PayBill",
      "Status": "Active",
      "Currency": "KES",
      "CreatedDate": "2020-01-15"
    }
  ],
  "APIAccess": {
    "Permissions": ["B2C", "C2B", "TransactionStatus"],
    "Status": "Active"
  }
}
```

## Response Parameter Definition

| Name | Description | Type | Sample |
|------|-------------|------|--------|
| ResponseCode | Query result | String | 0 |
| ResponseDescription | Status message | String | Success |
| OrgName | Organization name | String | ABC Business Limited |
| ShortCode | Primary business short code | String | 600000 |
| AccountType | Type of account (PayBill, BuyGoods, B2C, etc) | String | PayBill |
| Status | Account status | String | Active |
| Industry | Business industry | String | Retail |
| Region | Operating region | String | Kenya |
| AccountNumber | Specific account number | String | 600000 |
| Currency | Account currency | String | KES |
| CreatedDate | Account creation date | Date | 2020-01-15 |
| Permissions | Available API permissions | Array | [B2C, C2B] |

## Organization Status

| Status | Description |
|--------|-------------|
| Active | Account is operational |
| Inactive | Account not in use |
| Suspended | Account temporarily suspended |
| Closed | Account closed |
| Pending | Account activation pending |

## Account Types

| Type | Description |
|------|-------------|
| PayBill | Regular bill payment account |
| BuyGoods | Retail goods/services account |
| B2C | Business to Customer disbursement |
| Utility | Utility bill collection |
| Till | Retail point-of-sale account |

## API Permissions Available

| Permission | Description |
|-----------|-------------|
| B2C | Business to Customer disbursement |
| C2B | Customer to Business collection |
| B2B | Business to Business transfer |
| TransactionStatus | Transaction status queries |
| Reversals | Transaction reversals |
| AccountBalance | Balance inquiries |
| BillManager | Bill reference management |

## Error Codes

| errorCode | errorMessage | Mitigation |
|-----------|-------------|------------|
| 401.002.01 | Invalid Access Token | Regenerate token |
| 404.002.01 | Organization not found | Verify account |
| 500.003.02 | Service unavailable | Retry request |

## Use Cases
- Pre-integration validation
- Multi-account management
- Permission verification
- Account status monitoring
- Business information updates
- Compliance reporting

## Testing
Use Daraja Simulator to test org info queries.

### Test Scenarios
1. Retrieve sandbox organization details
2. Query account information
3. Check API permissions
4. Verify account status
5. List multiple accounts

**Sandbox Endpoint:** `https://sandbox.safaricom.co.ke/mpesa/queryorginfo/v1/query`

## Go Live
Same endpoints work for production:
1. Use production Consumer Key & Consumer Secret
2. Generate production access token
3. Query live organization information
4. Validate account configuration

**Production Endpoint:** `https://api.safaricom.co.ke/mpesa/queryorginfo/v1/query`

## Best Practices
- Cache organization information (1 hour)
- Verify account status before initiating payments
- Monitor API permission changes
- Document all account configurations
- Update local records periodically
- Implement permission checks in application logic
- Alert on account status changes

## FAQs
- **How often should I query organization info?** Cache for 1 hour; query on app startup.
- **Can I retrieve multiple accounts at once?** Query returns all accounts linked to credentials.
- **What are account permissions?** Permissions determine which APIs can be used (B2C, C2B, etc).
- **How are accounts linked to permissions?** Configured in M-Pesa portal by Business Administrator.
- **What does account status mean?** Active: operational; Inactive: not in use; Suspended: temporarily disabled.
- **Can I manage permissions via API?** No, manage only via M-Pesa Organization Portal.
- **How do I add new API permissions?** Contact Safaricom or use M-Pesa portal to update operator roles.

## Support
- **Chatbot:** Daraja Chatbot
- **Email:** apisupport@safaricom.co.ke
