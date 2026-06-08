# IoT SIM Management API

IoT SIM management APIs enable seamless activation, monitoring, messaging and control of SIM cards in connected devices, ensuring efficient network management and real-time data usage tracking.

**Base Endpoint:** `https://sandbox.safaricom.co.ke/simportal/{path_suffix}`

---

## Overview

The IoT SIM Management APIs make it easy for developers and businesses to manage their Safaricom IoT SIM cards and messaging services. With these APIs, you can efficiently handle SIM lifecycle management, monitor in real-time, and send messages, ensuring your connected devices run smoothly.

### Key Features

**SIM Operations:**
- Activate, suspend & rename SIM cards or assets.
- Retrieve all SIMs, check SIM lifecycle status, query customer & product details.
- Analyze activation trends.

**Messaging:**
- Send single or bulk messages.
- Search, filter, delete messages.
- Fetch all stored messages.

**Additional:**
- Supports Automated Testing via the Simulator.
- Postman Collection available.

---

## How It Works

1. A developer retrieves the Consumer Key and Consumer Secret from the Daraja Portal.
2. The developer sends a request to the Authorization API using Basic Authentication.
3. The API validates credentials and returns an access token.
4. The token is then used in subsequent API calls.

---

## Getting Started

### Prerequisites

- Daraja Account on Safaricom Developer Portal.
- Sandbox app to get API credentials.
- Consumer Key & Consumer Secret.
- Access to the IoT platform (Safaricom IoT SIM Management). To get access, buy the IoT SIM Connectivity solution on Safaricom Business Hub. You will be assigned an active number.
- If actioning on behalf: Admin's Username and account number for Safaricom IoT SIM Management.

### Good to Know

The APIs are divided into two categories:
1. **SIM Operations APIs** - manage SIM cards.
2. **Messaging APIs** - manage messages.

### Environments

| Environment | Description |
|-------------|-------------|
| Sandbox | Testing environment. |
| Production | Live environment for real transactions. |

### Test Data

| Field | Value |
|-------|-------|
| vpnGroup | 1-555162310488_VPN |
| msisdns | 0110100606, 0110100607 |
| username | darajasandbox@safaricom.co.ke |

---

## SIM Operations APIs

### Get All Sims

**Endpoint:** `POST https://sandbox.safaricom.co.ke/simportal/v1/allsims`

Fetch details of all SIMs in a given customer account.

#### Request Body

```json
{
  "vpnGroup": ["1-225560081***_VPN"],
  "startAtInde": "0",
  "pageSize": "3",
  "username": "user@safaricom.co.ke"
}
```

#### Request Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| vpnGroup | Specified account number whose SIMs are to be queried. | String | 1-225560081663_VPN |
| startAtIndex | Index at which to start generating response. | String | 1 |
| pageSize | Number of objects expected from query. | String | 5 |
| username | Username of user registered under vpnAccount. | String | johndoe@gmail.com |

#### Response Body

```json
{
  "header": {
    "requestRefId": "9953-4cfa-a173-507eb79891fe237",
    "responseCode": 200,
    "responseMessage": "Success",
    "customerMessage": "Operation Successfull",
    "timestamp": "2025-03-20T11:22:53.461865400"
  },
  "body": {
    "Desc": [
      {
        "life_cycle_status": "Active",
        "iccid": "***************",
        "asset_name": "*******",
        "activation_date": "-",
        "expiry_date": "2030",
        "imei": "-",
        "product_status": "Active",
        "imsi": "***************",
        "msisdn": "*********",
        "vpn_group": "1-225560081***_VPN",
        "activation_agent": "-"
      }
    ]
  }
}
```

#### Response Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| life_cycle_status | Status of SIM card on the network. | String | Active |
| iccid | Unique SIM card identification code. | String | 89254014010100030360 |
| asset_name | Customer assigned asset name for SIM card. | String | Tracker012 |
| activation_date | Date and time log for when the SIM card was activated. | String | 2025-03-05T11:05:06.088002510 |
| expiry_date | Expected year for SIM card expiration. | String | 2050 |
| imei | IMEI for the device on which the SIM card is used. | String | 350123451234560 |
| product_status | Status of the tariff/product assigned to the SIM card. | String | Active |
| imsi | Unique SIM card network identification code. | String | 639014010003036 |
| msisdn | Unique SIM card IoT subscriber identifier. | String | 300000003036 |
| vpn_group | Account number to which customer SIM cards are registered. | String | 1-225560081663_VPN |
| activation_agent | Name of entity that performed activation procedure on SIM card. | String | jDoe |

#### Error Codes

| Error | Possible Cause | Mitigation |
|-------|---------------|------------|
| 400 Bad Request - Kindly use your own vpnGroup | Using an account number the user is not authorized to access. | Retry using the correct account number. |
| 401 Unauthorized - Invalid Access Token | Null or expired access token. | Generate a new access token. |
| 500 Failed to execute the ExtractVariables: EV-FilterMessages | Missing or invalid payload. | Retry with correct payload structure. |
| 401 User not permitted to carry out operation | Username lacks required permissions. | Assign required permission or use a different user. |
| 404 No records were found | Account number doesn't exist. | Check the format of the account number. |

---

### Query Life Cycle Status

**Endpoint:** `POST https://sandbox.safaricom.co.ke/simportal/v1/queryLifeCycleStatus`

Check the status of a SIM and get detailed information about its current state.

#### Request Body

```json
{
  "msisdn": "300000020***",
  "vpnGroup": "1-225560081***_VPN",
  "username": "user@safaricom.co.ke"
}
```

#### Request Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| msisdn | Unique SIM card IoT subscriber identifier to be queried. | String | 300000443539 |
| vpnGroup | Specified account number where the SIM card is assigned. | String | 1-225560081663_VPN |
| username | Username of user registered under account number. | String | johndoe@gmail.com |

#### Response Body

```json
{
  "header": {
    "requestRefId": "228f-45a2-9987-5780c2ff600f362",
    "responseCode": 200,
    "responseMessage": "Success",
    "customerMessage": "Operation Successfull",
    "timestamp": "2025-03-21T08:57:25.407140944"
  },
  "body": {
    "desc": "Operation successfull",
    "status": "Active",
    "statusCode": "0"
  }
}
```

#### Response Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| desc | Description of the operation status. | String | Operation Successful |
| status | Status of the SIM card on the network. | String | Active |
| statusCode | Numerical description of the SIM card status on the network. | String | 0 |

#### Errors

| Error | Possible Cause | Mitigation |
|-------|---------------|------------|
| 400 Bad Request - Kindly use your own vpnGroup | Unauthorized account number. | Use the correct account number. |
| 401 Unauthorized - Invalid Access Token | Null or expired token. | Generate new token. |
| 500 Failed to execute the ExtractVariables: EV-FilterMessages | Invalid payload. | Retry with correct structure. |
| 401 User not permitted | Username lacks permissions. | Assign permission or use another user. |
| 404 No records found | Account number doesn't exist. | Check format and retry. |
| 200 No records found | MSISDN doesn't belong to the account. | Validate MSISDN belongs to the account. |

---

### Query Customer Info

**Endpoint:** `POST https://sandbox.safaricom.co.ke/simportal/v1/querycustomerinfo`

Check both SIM card and product statuses, as well as the product assigned to the SIM card.

#### Request Body

```json
{
  "msisdn": "300000443***",
  "vpnGroup": "1-225560081***_VPN",
  "username": "user@safaricom.co.ke"
}
```

#### Request Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| msisdn | Unique SIM card IoT subscriber identifier to be queried. | String | 300000443539 |
| vpnGroup | Specified account number where the SIM card is assigned. | String | 1-225560081663_VPN |
| username | Username of user registered under the account number. | String | johndoe@gmail.com |

#### Response Body

```json
{
  "header": {
    "requestRefId": "228f-45a2-9987-5780c2ff600f362",
    "responseCode": 200,
    "responseMessage": "Success",
    "customerMessage": "Operation Successfull",
    "timestamp": "2025-03-21T08:57:25.407140944"
  },
  "body": {
    "offeringName": "Speed Governor 300MB + 20SMS",
    "offeringStatus": "Active",
    "subscriberStatus": "Active",
    "offeringId": "14205***",
    "vpnGroup": "1-22556008****_VPN"
  }
}
```

#### Response Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| offeringName | Name of tariff assigned to SIM card. | String | Speed Governor 300MB + 20SMS |
| offeringStatus | Status of the tariff/product assigned to the SIM card. | String | Active |
| subscriberStatus | Status of SIM card on the network. | String | Active |
| offeringId | ID of tariff assigned to SIM card. | String | 14205001 |
| vpnGroup | Specified account number whose SIMs are to be queried. | String | 1-225560081663_VPN |

#### Errors

| Error | Possible Cause | Mitigation |
|-------|---------------|------------|
| 400 Bad Request - Kindly use your own vpnGroup | Unauthorized account. | Use the correct account number. |
| 401 Unauthorized - Invalid Access Token | Invalid/expired token. | Generate new token. |
| 500 Failed to execute the ExtractVariables: EV-FilterMessages | Invalid payload. | Retry with correct structure. |
| 401 User not permitted | Insufficient permissions. | Assign required permission. |
| 404 No records found | Account not found. | Check format and retry. |
| 200 No records found | MSISDN not in account. | Validate MSISDN. |

---

### SIM Activation

**Endpoint:** `POST https://sandbox.safaricom.co.ke/simportal/v1/simactivation`

Activate a SIM card.

#### Request Body

```json
{
  "msisdn": "300000443***",
  "vpnGroup": "1-225560081***_VPN",
  "username": "user@safaricom.co.ke"
}
```

#### Request Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| msisdn | Unique SIM card IoT subscriber identifier to be queried. | String | 300000443539 |
| vpnGroup | Specified account number where the SIM card is assigned. | String | 1-225560081663_VPN |
| username | Username of user registered under the account number. | String | johndoe@gmail.com |

#### Response Body

```json
{
  "header": {
    "requestRefId": "228f-45a2-9987-5780c2ff600f362",
    "responseCode": 200,
    "responseMessage": "Success",
    "customerMessage": "Operation Successfull",
    "timestamp": "2025-03-21T08:57:25.407140944"
  },
  "body": {
    "Desc": "Line activated successfully",
    "requestId": "df19-47d1-826e-1ef0b317fed3145596",
    "ID": "300000130371"
  }
}
```

#### Response Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| Desc | Description of the operation response. | String | Line activated successfully |
| requestId | Request identifier for the API call. | String | df19-47d1-826e-1ef0b317fed3145596 |
| ID | Unique SIM card IoT subscriber identifier. | String | 300000130371 |

#### Errors

| Error | Possible Cause | Mitigation |
|-------|---------------|------------|
| 400 Bad Request - Kindly use your own vpnGroup | Unauthorized account. | Use correct account number. |
| 401 Unauthorized - Invalid Access Token | Invalid/expired token. | Generate new token. |
| 500 Failed to execute ExtractVariables | Invalid payload. | Retry with correct structure. |
| 401 User not permitted | Insufficient permissions. | Assign permission. |
| 404 No records found | Account not found. | Check format. |
| 200 Operation Failed | MSISDN not in account. | Validate MSISDN. |

---

### Get Activation Trends

**Endpoint:** `POST https://sandbox.safaricom.co.ke/simportal/v1/getactivationtrends`

Get a visual graph of the trends in operations performed on SIM cards within your account.

#### Request Body

```json
{
  "vpnGroup": "1-22556008****_VPN",
  "startDate": "20240221",
  "stopDate": "20240421",
  "username": "user@safaricom.co.ke"
}
```

#### Request Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| vpnGroup | Specified account number where the SIM card is assigned. | String | 1-22556008****_VPN |
| startDate | Start date from which report is generated. | String | 20240413 |
| endDate | End date to which report is generated. | String | 20240727 |
| username | Username of user registered under an account number. | String | johndoe@gmail.com |

#### Response Body

```json
{
  "header": {
    "requestRefId": "9953-4cfa-a173-507eb79891fe358",
    "responseCode": 200,
    "responseMessage": "Success",
    "customerMessage": "Operation Successfull",
    "timestamp": "2025-03-21T09:19:45.058033487"
  },
  "body": {
    "body": [
      {
        "pooledTrend": [...],
        "suspendedTrend": [...],
        "dates": [...],
        "activeTrend": [...],
        "idleTrend": [...]
      }
    ]
  }
}
```

#### Response Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| pooledTrend | Trend of SIM cards set to pooled status. | String | 524 |
| suspendedTrend | Trend of SIM cards set to suspended status. | String | 34 |
| dates | Individual dates within the date range. | String | 20240604 |
| activeTrend | Trend of SIM cards set to active status. | String | 23 |
| idleTrend | Trend of SIM cards set to idle status. | String | 4 |

#### Errors

| Error | Possible Cause | Mitigation |
|-------|---------------|------------|
| 400 Bad Request - Kindly use your own vpnGroup | Unauthorized account. | Use correct account. |
| 401 Unauthorized - Invalid Access Token | Invalid token. | Generate new token. |
| 500 Failed to execute ExtractVariables | Invalid payload. | Retry with correct structure. |
| 401 User not permitted | Insufficient permissions. | Assign permission. |

---

### Rename Asset

**Endpoint:** `POST https://sandbox.safaricom.co.ke/simportal/v1/renameasset`

Assign a preferred name to a given asset/SIM card.

#### Request Body

```json
{
  "msisdn": "300000038722",
  "vpnGroup": "1-225560081663_VPN",
  "username": "test@safaricom.co.ke",
  "assetName": "test11111"
}
```

#### Request Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| msisdn | Unique SIM card IoT subscriber identifier to be queried. | String | 300000443539 |
| vpnGroup | Specified account number where the SIM card is assigned. | String | 1-225560081663_VPN |
| username | Username of user registered under the account number. | String | johndoe@gmail.com |
| assetName | Customer-preferred identifier to be assigned to the asset. | String | Tracker001 |

#### Response Body

```json
{
  "header": {
    "requestRefId": "228f-45a2-9987-5780c2ff600f362",
    "responseCode": 200,
    "responseMessage": "Success",
    "customerMessage": "Asset renamed successfully",
    "timestamp": "2025-03-21T08:57:25.407140944"
  },
  "body": {
    "result": "Success",
    "desc": "Operation Successfull"
  }
}
```

#### Response Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| result | Response of the renaming operation. | String | Success |
| desc | Description of result from renaming operation. | String | Operation Successful |

#### Errors

| Error | Possible Cause | Mitigation |
|-------|---------------|------------|
| 400 Bad Request - Kindly use your own vpnGroup | Unauthorized account. | Use correct account. |
| 401 Unauthorized - Invalid Access Token | Invalid token. | Generate new token. |
| 500 Failed to execute ExtractVariables | Invalid payload. | Retry with correct structure. |
| 401 User not permitted | Insufficient permissions. | Assign permission. |
| 404 No records found | Account not found. | Check format. |
| 200 Operation Failed | MSISDN not in account. | Validate MSISDN. |

---

### Suspend or Unsuspend Subscriber

**Endpoint:** `POST https://sandbox.safaricom.co.ke/simportal/v1/suspend_unsuspend_sub`

Easily suspend or unsuspend a subscriber or SIM card.

#### Request Body

```json
{
  "msisdn": "30000010****",
  "username": "user@safaricom.co.ke",
  "vpnGroup": "1-22556008****_VPN",
  "product": "14205***",
  "operation": "resume"
}
```

#### Request Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| msisdn | Unique SIM card IoT subscriber identifier. | String | 30000044**** |
| username | Username of user registered under the account number. | String | johndoe@gmail.com |
| vpnGroup | Specified account number where the SIM card is assigned. | String | 1-22556008****_VPN |
| product | ID of the tariff that the SIM is registered on. | String | 14205*** |
| operation | Task to perform: "suspend" or "resume". | String | suspend |

#### Response Body

```json
{
  "header": {
    "requestRefId": "9953-4cfa-a173-507eb79891fe359",
    "responseCode": 200,
    "responseMessage": "Success",
    "customerMessage": "Operation Successfull",
    "timestamp": "2025-03-21T09:35:24.665853885"
  },
  "body": {
    "statusCode": 0,
    "statusDesc": "Operation successfully."
  }
}
```

#### Response Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| statusCode | A code of the operation's response. | int | 0 |
| statusDesc | A description of the operation's response. | String | Operation successfully |

#### Errors

| Error | Possible Cause | Mitigation |
|-------|---------------|------------|
| 400 Bad Request - Kindly use your own vpnGroup | Unauthorized account. | Use correct account. |
| 401 Unauthorized - Invalid Access Token | Invalid token. | Generate new token. |
| 500 Failed to execute ExtractVariables | Invalid payload. | Retry with correct structure. |
| 401 User not permitted | Insufficient permissions. | Assign permission. |
| 404 No records found | Account not found. | Check format. |
| 200 Operation Failed | MSISDN not in account. | Validate MSISDN. |

---

## Messaging APIs

### Search Messages

**Endpoint:** `POST https://sandbox.safaricom.co.ke/simportal/v1/searchmessages?pageNo=1&pageSize=50`

Find and retrieve messages based on specific search criteria.

#### Request Body

```json
{
  "searchValue": "25430000010****"
}
```

#### Request Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| searchValue | The SIM whose messages are to be searched, preceded with '254'. | String | 25430000010**** |

#### Response Body

```json
{
  "header": {
    "requestRefId": "9953-4cfa-a173-507eb79891fe237",
    "responseCode": 200,
    "responseMessage": "Details fetched successfully.",
    "customerMessage": "Details fetched successfully.",
    "timestamp": "2025-03-20T11:22:53.461865400"
  },
  "body": {
    "content": [
      {
        "id": 4149,
        "recepitId": -1,
        "sourceAddr": "23122",
        "msisdn": "25430000010****",
        "message": "route",
        "sourceSystem": "sim-portal",
        "processingStatus": "1",
        "messageId": "247439",
        "date": "13-06-2024 11:39:58",
        "deliverTime": "-",
        "description": "sent",
        "vpnGroup": "1-225560081663_VPN"
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 50,
      "sort": { "unsorted": false, "sorted": true, "empty": false },
      "offset": 0,
      "unpaged": false,
      "paged": true
    },
    "totalPages": 0,
    "totalElements": 0,
    "last": true,
    "numberOfElements": 0,
    "size": 50,
    "number": 0,
    "sort": { "unsorted": false, "sorted": true, "empty": false },
    "first": true,
    "empty": true
  }
}
```

#### Response Parameter Definition

| Name | Description | Parameter Type | Sample Value |
|------|-------------|---------------|--------------|
| id | Message's ID on the database. | Int | 4149 |
| reciptId | Flag for status of message's reception on the database. | Int | 1 |
| sourceAddr | ID of the message's source. | String | 2331 |
| msisdn | Unique SIM card IoT subscriber identifier. | String | 254300000003036 |
| message | Raw contents of the message. | String | test |
| sourceSystem | Source from which the message was sent. | String | sim-portal |
| processingStatus | Status of the message transmission operation. | String | 1 |
| messageId | ID of the message on the database. | String | 32242 |
| date | Timestamp of when the message was sent. | String | 13-06-2024 11:39:58 |
| deliverTime | Timestamp of when the device acknowledged receipt. | String | 13-06-2024 11:39:58 |
| description | Description of the messaging operation. | String | sent |
| vpnGroup | Account number to which customer SIM cards are registered. | String | 1-225560081663_VPN |
| pageNumber | Index of the page. | Int | 0 |
| pageSize | Number of messages per page. | Int | 50 |
| unsorted | Whether response is unsorted. | Boolean | false |
| sorted | Whether response is sorted. | Boolean | true |
| empty | Whether response is empty. | Boolean | false |
| offset | Number of records skipped. | Int | 0 |
| unpaged | Whether pagination is disabled. | Boolean | false |
| paged | Whether pagination is enabled. | Boolean | true |
| totalPages | Total number of pages. | Int | 1 |
| totalElements | Total number of elements. | Int | 1 |
| last | Whether this is the last page. | Boolean | true |
| numberOfElements | Number of elements in this page. | Int | 1 |
| size | Size of the page. | Int | 50 |
| number | Position of the record. | Int | 0 |
| first | Whether this is the first page. | Boolean | true |

#### Errors

| Error | Possible Cause | Mitigation |
|-------|---------------|------------|
| 400 Bad Request - Kindly use your own vpnGroup | Unauthorized account. | Use correct account. |
| 401 Unauthorized - Invalid Access Token | Invalid token. | Generate new token. |
| 500 Failed to execute ExtractVariables | Invalid payload. | Retry with correct structure. |

---

### Filter Messages

**Endpoint:** `POST https://sandbox.safaricom.co.ke/simportal/v1/filtermessages?pageNo=1&pageSize=10`

Fetch messages within a specified start date and end date, based on a given status.

#### Request Body

```json
{
  "startDate": "02-05-2022 08:39:11",
  "endDate": "02-10-2022 00:00:00",
  "status": "1"
}
```

#### Request Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| startDate | Timestamp of the start of the date range. | String | 02-05-2024 08:39:11 |
| endDate | Timestamp of the end of the date range. | String | 02-05-2024 08:39:11 |
| status | Processing status code of the messages to be filtered. | String | 1 |

#### Response Body

```json
{
  "header": {
    "requestRefId": "228f-45a2-9987-5780c2ff600f368",
    "responseCode": 200,
    "responseMessage": "Details fetched successfully.",
    "customerMessage": "Details fetched successfully.",
    "timestamp": "2025-03-21T09:45:12.345576841"
  },
  "body": {
    "content": [
      {
        "id": 4156,
        "receiptId": -1,
        "sourceAddr": "23122",
        "msisdn": "254300001365500",
        "message": "Unavailable",
        "sourceSystem": "sim-portal",
        "processingStatus": "1",
        "messageId": "1837299002",
        "date": "02-09-2024 17:01:07",
        "deliverTime": "-",
        "description": "sent",
        "vpnGroup": "1-225560081663_VPN"
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 10,
      "sort": { "sorted": true, "unsorted": false, "empty": false },
      "offset": 0,
      "paged": true,
      "unpaged": false
    },
    "totalPages": 1,
    "totalElements": 2,
    "last": true,
    "size": 10,
    "number": 0,
    "sort": { "sorted": true, "unsorted": false, "empty": false },
    "numberOfElements": 2,
    "first": true,
    "empty": false
  }
}
```

#### Response Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| id | Message's ID on the database. | int | 4149 |
| reciptId | Flag for status of message's reception. | int | 1 |
| sourceAddr | ID of the message's source. | String | 2331 |
| msisdn | Unique SIM card IoT subscriber identifier. | String | 254300000003036 |
| message | Raw contents of the message. | String | test |
| sourceSystem | Source from which the message was sent. | String | sim-portal |
| processingStatus | Status of the message transmission operation. | String | 1 |
| messageId | ID of the message on the database. | String | 32242 |
| date | Timestamp of when the message was sent. | String | 13-06-2024 11:39:58 |
| deliverTime | Timestamp of when the device acknowledged receipt. | String | 13-06-2024 11:39:58 |
| description | Description of the messaging operation. | String | sent |
| vpnGroup | Account number to which customer SIM cards are registered. | String | 1-225560081663_VPN |

#### Errors

| Error | Possible Cause | Mitigation |
|-------|---------------|------------|
| 400 Bad Request - Kindly use your own vpnGroup | Unauthorized account. | Use authorized account. |
| 401 Unauthorized - Invalid Access Token | Invalid token. | Generate new token. |
| 500 Failed to execute ExtractVariables | Invalid payload. | Retry with correct structure. |

---

### Delete Message Thread

**Endpoint:** `POST https://sandbox.safaricom.co.ke/simportal/v1/deleteMessageThread`

Delete all messages sent to a given SIM.

#### Request Body

```json
{
  "msisdn": "254724751076"
}
```

#### Request Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| msisdn | The SIM whose messages are to be deleted, preceded with '254'. | String | 254300000109271 |

#### Response Body

```json
{
  "header": {
    "requestRefId": "9953-4cfa-a173-507eb79891fe361",
    "responseCode": 200,
    "responseMessage": "Message deleted successfully.",
    "customerMessage": "Message deleted successfully.",
    "timestamp": "2025-03-21T09:53:15.341533626"
  },
  "body": null
}
```

#### Response Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| requestRefId | The transaction reference ID for the API call. | String | db6d-46f8-b385-e91c17c867df60905 |
| responseCode | API call response code, aligned to standard HTTP status code definitions. | int | 200 |
| responseMessage | API call technical response message. | String | Success |
| customerMessage | Customer response message. | String | Operation Successful |
| timestamp | Date and time log for when request was sent. | String | 2025-03-05T11:05:06.088002510 |

#### Errors

| Error | Possible Cause | Mitigation |
|-------|---------------|------------|
| 400 Bad Request - Kindly use your own vpnGroup | Unauthorized account. | Use authorized account. |
| 401 Unauthorized - Invalid Access Token | Invalid token. | Generate new token. |
| 500 Failed to execute ExtractVariables | Invalid payload. | Retry with correct structure. |

---

### Get All Messages

**Endpoint:** `POST https://sandbox.safaricom.co.ke/simportal/v1/getallmessages?pageNo=1&pageSize=10`

Fetch details of all messages sent to all SIMs within a specified account number.

#### Request Body

```json
{
  "vpnGroup": "1-24856327146_VPN",
  "pageNo": 1,
  "pageSize": 10
}
```

#### Request Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| vpnGroup | Specified account number where the SIM card is assigned. | String | 1-225560081663_VPN |

#### Response Body

```json
{
  "header": {
    "requestRefId": "228f-45a2-9987-5780c2ff600f369",
    "responseCode": 200,
    "responseMessage": "Details fetched successfully.",
    "customerMessage": "Details fetched successfully.",
    "timestamp": "2025-03-21T10:03:14.025032625"
  },
  "body": {
    "content": [
      {
        "id": 4190,
        "receiptId": -1,
        "sourceAddr": "23122",
        "msisdn": "254300000002967",
        "message": "Test",
        "sourceSystem": "sim-portal",
        "processingStatus": "0",
        "messageId": "-",
        "date": "17-03-2025 14:32:22",
        "deliverTime": "-",
        "description": "-",
        "vpnGroup": "1-225560081663_VPN"
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 10,
      "sort": { "sorted": true, "unsorted": false, "empty": false },
      "offset": 0,
      "paged": true,
      "unpaged": false
    },
    "totalPages": 2,
    "totalElements": 16,
    "last": false,
    "size": 10,
    "number": 0,
    "sort": { "sorted": true, "unsorted": false, "empty": false },
    "numberOfElements": 10,
    "first": true,
    "empty": false
  }
}
```

#### Response Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| id | Message's ID on the database. | int | 4149 |
| reciptId | Flag for status of message's reception. | int | 1 |
| sourceAddr | ID of the message's source. | String | 2331 |
| msisdn | Unique SIM card IoT subscriber identifier. | String | 254300000003036 |
| message | Raw contents of the message. | String | test |
| sourceSystem | Source from which the message was sent. | String | sim-portal |
| processingStatus | Status of the message transmission operation. | String | 1 |
| messageId | ID of the message on the database. | String | 32242 |
| date | Timestamp of when the message was sent. | String | 13-06-2024 11:39:58 |
| deliverTime | Timestamp of when the device acknowledged receipt. | String | 13-06-2024 11:39:58 |
| description | Description of the messaging operation. | String | sent |
| vpnGroup | Account number to which customer SIM cards are registered. | String | 1-225560081663_VPN |

#### Errors

| Error | Possible Cause | Mitigation |
|-------|---------------|------------|
| 400 Bad Request - Kindly use your own vpnGroup | Unauthorized account. | Use authorized account. |
| 401 Unauthorized - Invalid Access Token | Invalid token. | Generate new token. |
| 500 Failed to execute ExtractVariables | Invalid payload. | Retry with correct structure. |

---

### Send Single Message

**Endpoint:** `POST https://sandbox.safaricom.co.ke/simportal/v1/sendsinglemessage`

Send a single message to a given SIM.

#### Request Body

```json
{
  "msisdn": "300001172***",
  "message": "Test",
  "vpnGroup": "1-47820525***_VPN"
}
```

#### Request Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| msisdn | Unique SIM card IoT subscriber identifier. | String | 300000443*** |
| message | The message content to be sent to the SIM card. | String | Test |
| vpnGroup | Specified account number whose SIMs are to be queried. | String | 1-225560081663_VPN |

#### Response Body

```json
{
  "header": {
    "requestRefId": "228f-45a2-9987-5780c2ff600f368",
    "responseCode": 200,
    "responseMessage": "Message queued successfully.",
    "customerMessage": "Message queued successfully.",
    "timestamp": "2025-03-21T09:45:12.345576841"
  },
  "body": {
    "id": 4156,
    "receiptId": -1,
    "sourceAddr": "23122",
    "msisdn": "254300001365500",
    "message": "Unavailable",
    "sourceSystem": "sim-portal",
    "processingStatus": "1",
    "messageId": "1837299002",
    "date": "02-09-2024 17:01:07",
    "deliverTime": "-",
    "description": "sent",
    "vpnGroup": "1-225560081663_VPN"
  }
}
```

#### Response Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| id | Message's ID on the database. | int | 4149 |
| reciptId | Flag for status of message's reception. | int | 1 |
| sourceAddr | ID of the message's source. | String | 2331 |
| msisdn | Unique SIM card IoT subscriber identifier. | String | 254300000003036 |
| message | Raw contents of the message. | String | test |
| sourceSystem | Source from which the message was sent. | String | sim-portal |
| processingStatus | Status of the message transmission operation. | String | 1 |
| messageId | ID of the message on the database. | String | 32242 |
| date | Timestamp of when the message was sent. | String | 13-06-2024 11:39:58 |
| deliverTime | Timestamp of when the device acknowledged receipt. | String | 13-06-2024 11:39:58 |
| description | Description of the messaging operation. | String | sent |
| vpnGroup | Account number to which customer SIM cards are registered. | String | 1-225560081663_VPN |

#### Errors

| Error | Possible Cause | Mitigation |
|-------|---------------|------------|
| 400 Bad Request - Kindly use your own vpnGroup | Unauthorized account. | Use authorized account. |
| 401 Unauthorized - Invalid Access Token | Invalid token. | Generate new token. |
| 500 Failed to execute ExtractVariables | Invalid payload. | Retry with correct structure. |

---

### Delete Message

**Endpoint:** `POST https://sandbox.safaricom.co.ke/simportal/v1/deletemessage`

Delete a specific message using its ID.

#### Request Body

```json
{
  "id": 3888
}
```

#### Request Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| id | The ID of the message to be deleted. Can be gotten from the searchMessages or getAllMessages APIs. | String | 2324 |

#### Response Body

```json
{
  "header": {
    "requestRefId": "9953-4cfa-a173-507eb79891fe361",
    "responseCode": 200,
    "responseMessage": "Message deleted successfully.",
    "customerMessage": "Message deleted successfully.",
    "timestamp": "2025-03-21T09:53:15.341533626"
  },
  "body": null
}
```

#### Response Parameter Definition

| Name | Description | Parameter Type | Sample Values |
|------|-------------|---------------|---------------|
| requestRefId | The transaction reference ID for the API call. | String | db6d-46f8-b385-e91c17c867df60905 |
| responseCode | API call response code, aligned to standard HTTP status code definitions. | int | 200 |
| responseMessage | API call technical response message. | String | Success |
| customerMessage | Customer response message. | String | Operation Successful |
| timestamp | Date and time log for when request was sent. | String | 2025-03-05T11:05:06.088002510 |

#### Error Codes

| Error | Possible Cause | Mitigation |
|-------|---------------|------------|
| 400 Bad Request - Kindly use your own vpnGroup | Unauthorized account. | Use authorized account. |
| 401 Unauthorized - Invalid Access Token | Invalid token. | Generate new token. |
| 500 Failed to execute ExtractVariables | Invalid payload. | Retry with correct structure. |

---

## Testing

### Option 1: Daraja Simulator

1. Create a test app, select the relevant product.
2. Simulator uses app credentials and predefined test data.
3. Hit the simulate button.

> **Note:** The simulator can only be accessed when logged in.

### Option 2: Postman

1. Generate access token:
   - Sandbox: `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
   - Production: `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
2. Initiate a transaction using the request body above.

---

## Go Live

The VPN Group go-live setup has not yet been provisioned on Daraja.

### Next Steps

1. Log in to the Daraja portal.
2. Create a new sandbox app using this naming format: `Prod-companyname-IOT-1778847243655`
3. After creating the app, send an email to apisupport@safaricom.co.ke requesting the sandbox app to be whitelisted for production access.

> **Note:** 1778847243655 is the current Unix timestamp in milliseconds and is used to keep the app name unique.

---

## Support

- **Chatbot:** Daraja Chatbot for instant development and production support.
- **Production Issues & Incident Management:** Visit the Incident Management page or email apisupport@safaricom.co.ke.
