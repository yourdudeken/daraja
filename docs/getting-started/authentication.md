# Authentication

M-Pesa Daraja uses OAuth 2.0 with the `Basic` authentication scheme to obtain a
short-lived access token. The SDKs handle token acquisition, caching, refresh,
and rotation automatically — you generally never deal with tokens directly.

## How it works

1. The SDK requests an access token from the auth endpoint:
   - sandbox: `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
   - production: `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
2. The request authenticates with HTTP `Basic` auth using the consumer key as
   username and consumer secret as password.
3. The token is cached until it nears expiry and transparently refreshed.
4. The access token is attached to every API request.
5. Optionally, the token cache can be shared across processes (e.g. via Redis)
   so applications running on many instances don't hammer the auth endpoint.

## Credentials

You need a **consumer key** and **consumer secret** from the M-Pesa developer
portal, configured on `MpesaConfig`:

```ts
new Mpesa({
  consumerKey: "...",
  consumerSecret: "...",
});
```

## Getting the token manually

Useful for diagnostics or for calling non-SDK endpoints:

```python
token = mpesa.get_access_token()
```

```ts
const token = await mpesa.client.getAccessToken();
```

## Rotating credentials

The SDKs can swap to new consumer credentials at runtime without rebuilding
the client:

```python
mpesa.rotate_credentials("new_key", "new_secret")
```

```ts
mpesa.client.rotateCredentials("new_key", "new_secret");
```

## Shared token cache (Redis)

To avoid every process authenticating independently, configure a shared cache:

```python
mpesa = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "redis_url": "redis://localhost:6379/0",
})
```

```ts
const mpesa = new Mpesa({
  consumerKey: "...",
  consumerSecret: "...",
  redisUrl: "redis://localhost:6379/0",
});
```

When `redisUrl`/`redis_url` (Python, TypeScript) is
configured, the access token is stored in Redis and shared across client
instances and processes. All SDKs also accept a custom `sharedTokenCache` /
`shared_token_cache` / `SharedTokenCache` implementation.

## Security best practice

- Keep `consumer_secret` and `initiator_password` out of source control and use
  a secret manager or environment variables.
- Set `environment` to `"production"` explicitly once you are ready to go live.
- Never log access tokens.
