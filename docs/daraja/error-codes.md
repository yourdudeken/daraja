# Daraja API Error Codes — Comprehensive Reference

All error codes returned by Safaricom Daraja APIs, grouped by code, with possible causes, mitigations, and affected APIs.

---

## OAuth / Authentication Errors

| Error Code | Error Message | Possible Cause | Mitigation | Affected APIs |
|------------|---------------|----------------|------------|---------------|
| `400.008.01` | Invalid authentication type passed | Incorrect Authorization type | Select authorization type as Basic | Authorization |
| `400.008.02` | Invalid grant type passed | Incorrect grant type | Select grant type as `client_credentials` | Authorization |
| `400.003.01` | Invalid Access Token | Wrong or expired access token | Regenerate a new token before expiry (1 hour). Ensure correct Consumer Key/Secret. | All APIs |
| `401.002.01` | Error Occurred - Invalid Access Token - XXX | Wrong or expired access token | Regenerate a new access token and use it before one hour expiry period. Ensure correct credentials. | Account Balance, B2C, B2B, Reversals, Transaction Status |
| `404.001.03` | Invalid Access Token | Wrong or expired access token | Regenerate a new access token and use it before expiry. | M-Pesa Express, Reversals |
| `401` | Unauthorized | Client must authenticate itself to get the requested response | Generate valid access token | IMSI, Swap |
| `401` | Unauthorized - Invalid Access Token | Null or expired access token | Generate a new access token and try again | IoT SIM Management |

---

## Bad Request / Validation Errors

| Error Code | Error Message | Possible Cause | Mitigation | Affected APIs |
|------------|---------------|----------------|------------|---------------|
| `400.002.02` | Bad Request - Invalid XXXX | Request payload not set correctly | Ensure the request payload is set as per API documentation | Account Balance, M-Pesa Express, Reversals |
| `400.002.05` | Invalid Request Payload | Request body is not properly drafted | Submit the correct request payload as shown in sample, avoid typo errors | B2C, B2C Top Up, C2B, Dynamic QR, M-Pesa Express Query, Transaction Status |
| `400.003.02` | Bad Request | Server cannot process request because something is missing | Ensure everything is correctly set up as per API documentation | B2C Top Up, C2B, Transaction Status |
| `400` | Bad Request | Server could not understand the request due to invalid syntax | Validate request syntax | IMSI, Swap |
| `400.001` | Invalid ShortCode | Invalid shortcode provided | Use a valid registered shortcode | Pull Transactions |
| `400` | Bad Request - Kindly use your own vpnGroup | Using an account number user is not authorized to access | Retry using the account number the user is allowed to access | IoT SIM Management |
| `1051` | Bad request | One or more fields in the request payload is invalid | Validate all request fields | M-Pesa Ratiba |

---

## Resource / Endpoint Errors

| Error Code | Error Message | Possible Cause | Mitigation | Affected APIs |
|------------|---------------|----------------|------------|---------------|
| `404.002.01` | Resource not found | Incorrect API endpoint | Make sure you are calling the correct API endpoint | Account Balance |
| `404.001.01` | Resource not found | Incorrect API endpoint | Make sure you are calling the correct API endpoint | M-Pesa Express, Reversals |
| `404.003.01` | Resource not found | The requested resource could not be found | Make sure you are calling the correct M-PESA API endpoint | B2C Top Up, C2B, Transaction Status |
| `404` | Not Found | Server cannot find the requested resource | Verify the endpoint URL | IMSI, Swap |
| `404` | No records were found | Account number doesn't exist in the database | Check the format of the account number, verify and retry | IoT SIM Management |
| `200` | No records were found | MSISDN doesn't belong to the account provided | Validate MSISDN belongs to the account and retry | IoT SIM Management |

---

## HTTP Method Errors

| Error Code | Error Message | Possible Cause | Mitigation | Affected APIs |
|------------|---------------|----------------|------------|---------------|
| `405.001` | XXX Method Not Allowed | Passing wrong HTTP method | Use POST for all APIs except Authorization (GET) | Account Balance, M-Pesa Express |
| `404.001.04` | Invalid Authentication Header | Misplaced headers or wrong method | All M-PESA APIs are POST except Authorization (GET) | B2C Top Up, C2B, Dynamic QR, M-Pesa Express Query, Transaction Status |

---

## Duplicate / Conflict Errors

| Error Code | Error Message | Possible Cause | Mitigation | Affected APIs |
|------------|---------------|----------------|------------|---------------|
| `500.002.1001` | Duplicate OriginatorConversationID | OriginatorConversationID already used | Ensure the OriginatorConversationID is unique for every request | Account Balance, B2C, B2Pochi |
| `500.003.1001` | Duplicate notification info | Existing URLs registered on aggregator platform | Request deletion of URLs from aggregator platform, then re-register on Daraja | C2B |
| `500.003.1001` | Urls are already registered | Existing URLs already registered | Request deletion of existing URLs and re-register | C2B |
| `15` | Duplicate Detected | OriginatorConversationID already seen before | Use unique OriginatorConversationID per request | Account Balance |
| `409` | Action Forbidden: Biller already Registered | Invalid shortcode or already registered | Use a shortcode that hasn't been onboarded | Bill Manager |
| `409` | Action Forbidden: Invalid consumer key/short code | Invalid consumer key/short code combination | Use correct consumer key/short code | Bill Manager |
| `409` | Action forbidden: Another entry exist with the same externalReference number | External reference already exists | Use a different externalReference number | Bill Manager |
| `1001` | ShortCode already Registered | Shortcode already registered for pull transactions | Already registered, proceed to query | Pull Transactions |

---

## Initiator / Credential Errors

| Error Code | Error Message | Possible Cause | Mitigation | Affected APIs |
|------------|---------------|----------------|------------|---------------|
| `18` | Initiator Credential Check Failure | Wrong password, or encryption/decryption error | Verify the initiator password and encryption process | Account Balance, B2C, B2B, Reversals, Transaction Status |
| `20` | Unresolved Initiator | Initiator username cannot be found | Verify the initiator username on M-PESA portal | Account Balance, B2C, B2B, Reversals, Transaction Status |
| `21` | Initiator to Primary Party Permission Failure | Initiator lacks permission for the primary party | Assign correct API role to the initiator | Account Balance, B2C, B2B, Reversals, Transaction Status |
| `22` | Initiator to Receiver Party Permission Failure | Initiator is not currently active | Activate the initiator on M-PESA portal | Account Balance, B2C, B2B, Reversals, Transaction Status |
| `2001` | The initiator information is invalid | Wrong username, wrong encrypted password, wrong algorithm/certificate | Verify credentials and encryption process (RSA with PKCS #1.5 padding) | B2C, B2Pochi, B2B, B2C Top Up, Business Pay Bill, Business Buy Goods, Tax Remittance, Reversals, Transaction Status |
| `8006` | The security credential is locked | Password locked due to multiple failed attempts | Business Administrator can unlock it on M-PESA portal | B2C, B2Pochi, Reversals |

---

## Permission / Role Errors

| Error Code | Error Message | Possible Cause | Mitigation | Affected APIs |
|------------|---------------|----------------|------------|---------------|
| `21` | The initiator is not allowed to initiate this request | API user lacks required role | Assign the correct API role (e.g., ORG B2C API Initiator) | B2C, B2Pochi, Reversals |
| `2028` | The request is not permitted according to product assignment | Shortcode has no permission for the transaction type | Verify product assignment for the shortcode | B2C, B2Pochi, Reversals |
| `100000010` | Insufficient permissions | API user lacks required permissions | Assign appropriate permissions | Account Balance |
| `401` | User not permitted to carry out operation | Username lacks required permissions | Assign required permission or use a user with permission | IoT SIM Management |

---

## Rate Limiting / Quota Errors

| Error Code | Error Message | Possible Cause | Mitigation | Affected APIs |
|------------|---------------|----------------|------------|---------------|
| `500.003.02` | Error Occurred: Spike Arrest Violation | Sending requests that violate TPS limit | Ensure application is not sending excessive requests | Account Balance, B2C Top Up, C2B, M-Pesa Express, Reversals, Transaction Status |
| `500.003.03` | Quota Violation | Sending requests that violate API request limit | Ensure application is not sending excessive requests | Account Balance, B2C Top Up, C2B, M-Pesa Express, Reversals, Transaction Status |
| `429` | Too Many Requests | User has sent too many requests in a given time (rate limiting) | Slow down request rate | IMSI, Swap |
| `26` | Traffic blocking condition in place | System too busy | Wait and retry | Account Balance |

---

## Internal / Server Errors

| Error Code | Error Message | Possible Cause | Mitigation | Affected APIs |
|------------|---------------|----------------|------------|---------------|
| `500.003.1001` | Internal Server Error | Server failure | Ensure correct setup as per API documentation, server running as expected | Account Balance, B2C Top Up, C2B, M-Pesa Express, Reversals, Transaction Status |
| `500.003.02` | System is busy. Please try again in few minutes | System overload | Retry after a short wait | M-Pesa Express |
| `500.001.1001` | Merchant does not exist | Wrong BusinessShortCode used | Ensure you're using the shortcode used on Go Live | M-Pesa Express |
| `500.001.1001` | Wrong credentials | Invalid or missing Password parameter | Correctly encode: base64.encode(Shortcode+Passkey+Timestamp) | M-Pesa Express |
| `500.001.1001` | Unable to lock subscriber, a transaction is already in process | Ongoing USSD session conflicts | Wait at least 1 minute between requests | M-Pesa Express |
| `500` | Internal Server Error | Server encountered an unknown situation | Retry or contact support | IMSI, Swap |
| `500` | Failed to retrieve transactions | Shortcode does not have any available transactions | Check shortcode and date range | Pull Transactions |
| `500` | Failed to execute the ExtractVariables | Missing or invalid payload | Retry with correctly structured payload | IoT SIM Management |
| `17` | Internal Failure | Catch-all for unidentified failures | Contact support | Account Balance, Lipa na Bonga |
| `100000000` | Request was cached, waiting for resending | System queue | Wait for processing | Account Balance |
| `100000001` | The system is overload | System overload | Reduce request rate | Account Balance |
| `100000004` | Internal Server Error | Server error | Retry | Account Balance |
| `00.002.1001` | Service is currently under maintenance | Maintenance window | Try again later | Account Balance |

---

## M-Pesa Express Specific Errors

| Error Code | Error Message | Possible Cause | Mitigation |
|------------|---------------|----------------|------------|
| `500.001.1001` | Merchant does not exist | Wrong BusinessShortCode | Use the shortcode used during Go Live |
| `500.001.1001` | Wrong credentials | Invalid Password encoding | Verify: base64.encode(Shortcode+Passkey+Timestamp) |
| `500.001.1001` | Unable to lock subscriber | Ongoing transaction for the subscriber | Wait at least 1 minute between requests |
| `500.003.02` | System is busy. Please try again in few minutes | System busy | Retry after a short wait |

---

## B2B Express CheckOut Specific Errors

| Error Code | Error Message | Possible Cause | Mitigation |
|------------|---------------|----------------|------------|
| `4104` | Missing Nominated Number | No nominated number configured for USSD push | Provide Nominated Number on M-PESA portal |
| `4102` | Merchant KYC Fail | Merchant KYC verification failed | Provide valid KYC details |
| `4201` | USSD Network Error | Network issue during USSD push | Ensure stable network connection |
| `4203` | USSD Exception Error | USSD exception occurred | Ensure stable network connection |

---

## M-Pesa Ratiba Specific Errors

| Error Code | Error Message | Possible Cause | Mitigation |
|------------|---------------|----------------|------------|
| `1037` | DS timeout - user cannot be reached | No updated SIM, old SIM (3+ years), offline phone | Update SIM, notify customer before push |
| `1025` | Error sending push request | System error on partner platform | Retry, ensure system is working correctly |
| `1037` | STK push reached customer but no timely response | Customer didn't respond in time | Retry to receive callback |
| `1032` | Request cancelled by user | STK timed out or user cancelled | Retry after 2-3 minutes, get customer consent |
| `2001` | The initiator information is invalid | Invalid password or wrong PIN entered | Advise customer to enter correct M-PESA PIN |
| `1001` | Unable to lock subscriber | Duplicate MSISDN, existing USSD session | Close session, retry in 2-3 minutes |
| `1050` | User already has a standing order with the same name | Duplicate standing order name | Use a unique name for each standing order |

---

## C2B Register URL Specific Errors

| Error Code | Error Message | Possible Cause | Mitigation |
|------------|---------------|----------------|------------|
| `500.003.1001` | Duplicate notification info | URLs already registered on aggregator platform | Request deletion from aggregator, then register on Daraja |

---

## Pull Transactions Specific Errors

| Error Code | Error Message | Possible Cause | Mitigation |
|------------|---------------|----------------|------------|
| `400.001` | Invalid ShortCode | Invalid shortcode | Use a valid registered shortcode |
| `500` | Failed to retrieve transactions | No available transactions for shortcode | Check shortcode and date range |

---

## Query Org Info Specific Errors

| Error Code | Error Message | Possible Cause | Mitigation |
|------------|---------------|----------------|------------|
| `0` | Success | - | - |
| `1` or any other | Rejecting the request | Invalid parameters or request | Check input parameters |
| `500` | Invalid parameter input | Incorrect parameter format | Validate all parameters |

---

## Internal M-PESA Error Codes (Account Balance / Core)

| Error Code | Description | Message Type | Explanation |
|------------|-------------|--------------|-------------|
| `15` | Duplicate Detected | ApiResult | OriginatorConversationID already seen |
| `17` | Internal Failure | ApiResult | Catch-all for unidentified failures |
| `18` | Initiator Credential Check Failure | ApiResult | Wrong password or encryption error |
| `19` | Message Sequencing Failure | ApiResult | Message out of sequence |
| `20` | Unresolved Initiator | ApiResult | Username not found |
| `21` | Initiator to Primary Party Permission Failure | ApiResult | Initiator lacks permission for primary party |
| `22` | Initiator to Receiver Party Permission Failure | ApiResult | Initiator not active |
| `24` | Missing mandatory fields | ApiResponse | Required parameters missing |
| `25` | InvalidRequestParameters | ApiResponse | Parameter validation failed |
| `26` | Traffic blocking condition in place | ApiResponse | System too busy |
| `29` | InvalidCommand | ApiResponse | CommandID not defined |
| `100000000` | Request was cached, waiting for resending | ApiResponse | Request queued |
| `100000001` | The system is overload | ApiResponse | System overloaded |
| `100000002` | Throttling error | ApiResponse | Rate limit hit |
| `100000004` | Internal Server Error | ApiResponse | Server error |
| `100000005` | Invalid input value | ApiResponse | Invalid parameter value |
| `100000007` | Service's status is abnormal | ApiResponse | Service unavailable |
| `100000009` | API's status is abnormal | ApiResponse | API unavailable |
| `100000010` | Insufficient permissions | ApiResponse | User lacks permissions |
| `100000011` | Exceed the limitation of request rate | ApiResponse | Rate limit exceeded |

---

## Bill Manager Specific Errors

| Error Code | Error Message | Possible Cause | Mitigation |
|------------|---------------|----------------|------------|
| `409` | Action Forbidden: Biller already Registered | Shortcode already onboarded | Use a different shortcode |
| `409` | Action Forbidden: Invalid consumer key/short code | Invalid combination | Use correct consumer key/shortcode |
| `409` | Action forbidden: Another entry exist with the same externalReference number | Duplicate external reference | Use a different externalReference |
| `409` | Action forbidden: Incorrect phone number format | Wrong MSISDN format | Use format 254722XXXXXX or 0722XXXXXX |
| `409` | Action forbidden: Incorrect due date format | Wrong date format | Use format yymmdd |

---

## IoT SIM Management Common Errors

| Error | Possible Cause | Mitigation |
|-------|----------------|------------|
| `400 Bad Request - Kindly use your own vpnGroup` | Using unauthorized account number | Use the correct account number |
| `401 Unauthorized - Invalid Access Token` | Null or expired access token | Generate a new access token |
| `500 Failed to execute the ExtractVariables: EV-FilterMessages` | Missing or invalid payload | Retry with correct payload structure |
| `401 User not permitted to carry out operation` | Username lacks required permissions | Assign required permission or use authorized user |
| `404 No records were found` | Account number doesn't exist | Verify account number format |
| `200 No records were found` | MSISDN doesn't belong to the account | Validate MSISDN account association |
| `200 Operation Failed` | MSISDN doesn't belong to the account | Validate MSISDN belongs to the account |

---

## Quick Reference: Common HTTP Status Codes

| HTTP Code | Meaning | Typical Cause |
|-----------|---------|---------------|
| `200` | Success | Request processed successfully |
| `400` | Bad Request | Invalid parameters, missing fields, wrong payload |
| `401` | Unauthorized | Missing or expired access token |
| `403` | Forbidden | No access rights to the content |
| `404` | Not Found | Wrong endpoint URL or resource |
| `405` | Method Not Allowed | Wrong HTTP method (use POST instead of GET) |
| `408` | Request Timeout | Server didn't receive complete request in time |
| `409` | Conflict | Duplicate entry, already registered |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side failure |
| `501` | Not Implemented | Unsupported request method |
| `502` | Bad Gateway | Invalid upstream response |
| `503` | Service Unavailable | Server down or overloaded |
| `504` | Gateway Timeout | Upstream response timeout |
