# M-Pesa Ratiba API

Automated salary disbursement through M-Pesa platform.

**Endpoint:** `POST https://sandbox.safaricom.co.ke/mpesa/ratiba/v1/process`

## Overview
The M-Pesa Ratiba API enables employers and payroll systems to automate salary payments to employee M-Pesa accounts. Ratiba (which means "schedule" or "salary" in Swahili) processes batch payroll disbursements efficiently.

### Key Features
- Automated salary disbursement
- Batch payment processing
- Schedule-based salary distribution
- Employee payment tracking
- Real-time processing confirmations
- Payroll reconciliation support

## How It Works
1. Employer submits payroll batch with employee details
2. System validates payment information
3. M-Pesa processes salary transfers
4. Funds credited to employee accounts
5. Employees receive SMS confirmation
6. Employer receives reconciliation report

## Use Cases
- Monthly salary disbursement
- Contractor payments
- Bonus distribution
- Commission payouts
- Pension contributions
- Employee loan disbursements
- Advance salary payments

## Getting Started

### Prerequisites
- Daraja Account on Safaricom Developer Portal
- Sandbox app with API credentials
- Employer/Payroll account setup
- Employee database with M-Pesa details
- Business Admin/Manager operators

### Good to Know
Ratiba typically processes payroll on scheduled dates (e.g., month-end). Batch processing minimizes transaction fees.

## Request Body
```json
{
  "InitiatorName": "payrolluser",
  "SecurityCredential": "SAFVNChNHfVtXEZMBuVo+a1Hwr+DtrUVN3zVg==",
  "CommandID": "SalaryPayment",
  "BatchName": "MONTHLY_PAYROLL_JAN_2024",
  "BatchNumber": "PAY-001-2024",
  "BatchDescription": "January 2024 salaries",
  "ProcessingMethod": "Scheduled",
  "ScheduleDateTime": "2024-01-31 17:00:00",
  "Payments": [
    {
      "EmployeeID": "EMP001",
      "EmployeeName": "John Doe",
      "PhoneNumber": "254722000001",
      "Amount": "50000",
      "Remarks": "January salary"
    }
  ]
}
```

## Request Parameter Definition

| Name | Description | Type | Sample |
|------|-------------|------|--------|
| InitiatorName | Payroll initiator username | String | payrolluser |
| SecurityCredential | Encrypted password | String | EToK4lNR... |
| CommandID | Command type (SalaryPayment, BonusPayment, CommissionPayment) | String | SalaryPayment |
| BatchName | Descriptive batch name | String | MONTHLY_PAYROLL_JAN_2024 |
| BatchNumber | Unique batch identifier | String | PAY-001-2024 |
| BatchDescription | Batch details | String | January 2024 salaries |
| ProcessingMethod | Immediate or Scheduled | String | Scheduled |
| ScheduleDateTime | Process date/time if scheduled | DateTime | 2024-01-31 17:00:00 |
| EmployeeID | Employee identifier | String | EMP001 |
| EmployeeName | Employee name | String | John Doe |
| PhoneNumber | Employee M-Pesa number (2547XXXXXXXX) | String | 254722000001 |
| Amount | Payment amount in KES | Numeric | 50000 |
| Remarks | Payment notes | String | January salary |

## Response Body
```json
{
  "BatchID": "BATCH123456",
  "ResponseCode": "0",
  "ResponseDescription": "Batch accepted for processing",
  "TotalAmount": "5000000",
  "PaymentCount": "100",
  "ProcessingStatus": "Scheduled",
  "ScheduledDateTime": "2024-01-31 17:00:00"
}
```

## Response Parameter Definition

| Name | Description | Type | Sample |
|------|-------------|------|--------|
| BatchID | Unique batch identifier | String | BATCH123456 |
| ResponseCode | Acceptance indicator | String | 0 |
| ResponseDescription | Response message | String | Batch accepted for processing |
| TotalAmount | Total payroll amount | Numeric | 5000000 |
| PaymentCount | Number of employees paid | Numeric | 100 |
| ProcessingStatus | Current batch status | String | Scheduled |
| ScheduledDateTime | Processing date/time | DateTime | 2024-01-31 17:00:00 |

## Batch Status Tracking

| Status | Description |
|--------|-------------|
| Submitted | Batch received |
| Validated | Batch validated |
| Scheduled | Awaiting process time |
| Processing | Active payment processing |
| Completed | All payments processed |
| Failed | Batch processing failed |
| Partial | Some payments failed |

## Payment Status Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Pending |
| 2 | Failed |
| 3 | Retry |
| 4 | Invalid |

## Error Codes

| errorCode | errorMessage | Mitigation |
|-----------|-------------|------------|
| 400.002.02 | Invalid employee data | Verify employee details |
| 401.002.01 | Invalid credentials | Regenerate token |
| 404.002.01 | Employee not found | Check phone number |
| 500.001.1001 | Amount exceeds limit | Reduce payment |
| 500.003.02 | System is busy | Retry request |

## Batch Limits

| Limit | Value |
|-------|-------|
| Maximum per batch | 10,000 employees |
| Maximum per payment | KES 250,000 |
| Minimum per payment | KES 100 |
| Daily limit | Unlimited batches |

## Reconciliation
Post-processing reconciliation includes:
- Successfully paid employees
- Failed payments list
- Retry options
- Settlement confirmation
- Detailed reports

## Testing
Use Daraja Simulator with test employee data.

## Go Live
Submit live payroll account and employee database structure.

## Best Practices
- Batch process during low-traffic periods
- Verify employee phone numbers beforehand
- Maintain detailed payment records
- Test with small batches first
- Schedule payments consistently

## Support
- **Chatbot:** Daraja Chatbot
- **Email:** apisupport@safaricom.co.ke
