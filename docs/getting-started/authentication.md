# Authentication

All Daraja requests are authenticated with an OAuth2 Bearer token obtained from
the OAuth endpoint using your consumer key and consumer secret.

## Steps

1. Base64-encode `consumerKey:consumerSecret`.
2. POST to the OAuth URL granting `grant_type=client_credentials`.
3. Use the returned `access_token` as a `Bearer` token.

The SDKs automate this flow and refresh tokens automatically.
