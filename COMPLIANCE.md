# M-Pesa SDK - Compliance Guide

## PCI-DSS

The M-Pesa SDK does not store, process, or transmit Primary Account Numbers (PAN). 
Phone numbers used in transactions (MSISDN) are not classified as PAN under PCI-DSS.

**Recommendations:**
- Encrypt callback payloads at rest if stored in databases
- Use short-lived token caching (already implemented: 60s buffer before expiry)
- Rotate API credentials regularly (see Credential Rotation section)
- Implement request logging for audit trails (use the SDK's Logger interface)

## SOC2

**Security:**
- All API calls include `X-Request-ID` for traceability
- Structured logging with levels (DEBUG/INFO/WARN/ERROR) for audit
- Circuit breaker prevents cascading failures
- Rate limiting protects upstream API resources
- Retry with exponential backoff and jitter prevents thundering herd

**Availability:**
- Health check endpoint (`/health`) returns token status and version
- Circuit breaker automatically recovers after timeout
- Configurable timeouts prevent connection hangs

**Confidentiality:**
- Sensitive data masking in logs (keys, passwords, tokens)
- No secrets hardcoded in source code
- Gitleaks scanning in CI prevents secret leaks

## GDPR / Data Privacy

Phone numbers and transaction metadata may constitute Personal Identifiable 
Information (PII) under GDPR.

**Recommendations:**
- Implement data retention policies for stored callback payloads
- Document what PII flows through your integration
- Provide data deletion mechanisms for stored transaction data
- Use the Logger interface's masking to avoid logging PII
- Consider tokenization of phone numbers in audit logs

## Credential Rotation

Recommended rotation schedule:
- **Consumer Key/Secret**: Every 90 days
- **Passkey**: Every 180 days
- **Initiator Password**: Every 90 days
- **Security Credential**: Every 180 days

The SDK supports live credential updates by creating a new client instance 
with rotated credentials.
