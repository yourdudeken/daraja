# Authorization API

By Safaricom

Gives you a time bound access token to call allowed APIs.

**Endpoint:** `GET https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`

---

## Overview

The Authorization API generates access tokens required for authenticating API calls on the Daraja platform.

### Key Features

- **OAuth 2.0 Authentication:** Industry-standard authentication protocol.
- **Token Expiry:** 3600 seconds (1 hour).
- **Supports Automated Testing via the Simulator:** Developers can automatically generate tokens by selecting an app in the simulator section, where keys auto-populate.
- **Postman Collection:** Developers can obtain their Consumer Key and Consumer Secret from the Daraja My Apps page and use them for manual authentication.

> **Important:** This API must be called before any other API in the Daraja platform, as all other APIs require an access token for authentication.

## How It Works

1. A developer retrieves the Consumer Key and Consumer Secret from the Daraja Portal.
2. The developer sends a request to the Authorization API using Basic Authentication.
3. The API validates the credentials and returns an access token.
4. The token is then used in subsequent API calls via the `Authorization: Bearer {token}` header.

## Getting Started

### Prerequisites

- Create a Daraja Account on the Safaricom Developer Portal.
- Create a sandbox app in the portal to get API credentials.
- Retrieve Consumer Key & Consumer Secret from your sandbox app on My Apps.

### Good to Know

- **Token Expiry:** Tokens expire after 3600 seconds (1 hour). A new token must be generated once expired.

## Integration Steps

### Generate an OAuth Access Token

All API calls require a Bearer Token obtained from the Authorization API.

**Method:** GET

**Authorization:** Basic Auth (Base64 encoded Consumer Key:Consumer Secret)

**URL:** `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`

### Request Body (Basic Auth)

```
// AUTHORIZATION (Basic Auth)
username: {Consumer Key}
password: {Consumer Secret}
```

### Headers

```json
{
  "Authorization": "Basic Q2RtTmJkdDBpQk4xb3FEZkthc200ZGFiZHBLbXRhTm46RExLRzdQQnVuNzIwR1ppbQ=="
}
```

### Parameters

```
grant_type: client_credentials
```

### Request Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| grant_type | The client_credentials grant type is supported. Put this under Params. | Query | client_credentials |

### Response Body

```json
{
  "access_token": "c9SQxWWhmdVRlyh0zh8gZDTkubVF",
  "expires_in": 3599
}
```

### Response Parameter Definition

| Name | Description | Type | Sample Values |
|------|-------------|------|---------------|
| access_token | Access token to access the APIs. | JSON Response Item | c9SQxWWhmdVRlyh0zh8gZDTkubVF |
| expires_in | Token expiry time in seconds. | JSON Response Item | 3599 |

### Error Response Parameter Definition

| Error | Description | Probable Cause | Mitigation |
|-------|-------------|----------------|------------|
| 400.008.02 | Invalid grant type passed | Incorrect grant type | Select grant type as client_credentials |
| 400.008.01 | Invalid authentication type passed | Incorrect Authorisation type | Select authorization type as Basic |

### Example with curl

```bash
curl -X GET "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials" \
  -H "Authorization: Basic Q2RtTmJkdDBpQk4xb3FEZkthc200ZGFiZHBLbXRhTm46RExLRzdQQnVuNzIwR1ppbQ=="
```

### Example with Python

```python
import requests
import base64

consumer_key = "YOUR_CONSUMER_KEY"
consumer_secret = "YOUR_CONSUMER_SECRET"
auth_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"

credentials = f"{consumer_key}:{consumer_secret}"
encoded = base64.b64encode(credentials.encode()).decode()

headers = {"Authorization": f"Basic {encoded}"}
response = requests.get(auth_url, headers=headers)
token = response.json()["access_token"]
```

### Example with JavaScript/Node.js

```javascript
const axios = require('axios');
const base64 = require('base-64');

const consumerKey = "YOUR_CONSUMER_KEY";
const consumerSecret = "YOUR_CONSUMER_SECRET";
const credentials = `${consumerKey}:${consumerSecret}`;
const encoded = base64.encode(credentials);

const config = {
  headers: {"Authorization": `Basic ${encoded}`}
};

axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", config)
  .then(response => console.log(response.data.access_token));
```

## Testing

### Using the Simulator

Safaricom provides an Authorization API Simulator for testing access token generation via the Daraja Portal.

### Steps to Test

1. Select one of your apps to simulate.
2. Use the simulator to invoke requests to the API.
3. Check the response for success or to resolve any errors.

**Sandbox Endpoint:** `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`

**Production Endpoint:** `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`

## Go Live

Production Authorization follows the same process as sandbox:
1. Register a live app on the Daraja Portal.
2. Obtain production Consumer Key & Consumer Secret.
3. Use production endpoints for all API calls.
4. All token handling remains identical.

## FAQs

**Why is my access token not working?**
Tokens expire in 3600 seconds. Generate a new one if expired.

**What should I do if I get an invalid grant type error?**
Ensure grant_type is set to `client_credentials`.

**Can I generate multiple tokens?**
Yes, but each request generates a unique token. Older tokens remain valid until expiry.

**How do I handle token expiration?**
Implement token refresh logic or cache tokens until ~1 minute before expiry.

**Are tokens the same for sandbox and production?**
No, sandbox and production have separate tokens and credentials.

**How long can I use a single token?**
Tokens are valid for 3600 seconds (1 hour) from generation.

**Do I need to regenerate tokens between API calls?**
No, reuse the same token for multiple API calls until expiry.

## Support

- **Chatbot:** Developers can get instant responses using the Daraja Chatbot for both development and production support.
- **Production Issues & Incident Management:** Visit the Incident Management page or email apisupport@safaricom.co.ke.
