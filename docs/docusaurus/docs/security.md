---
sidebar_position: 6
---

# Security Best Practices

## Credential Management

- **Never hardcode credentials** in your source code
- Use environment variables or a secrets manager
- Rotate consumer keys/secrets regularly

```bash
# .env file
MPESA_CONSUMER_KEY=your_key_here
MPESA_CONSUMER_SECRET=your_secret_here
MPESA_PASSKEY=your_passkey_here
```

## Credential Masking

The SDK automatically masks sensitive data in logs:

```typescript
// Logged: { consumerKey: "abc1****" }
// Not logged: { consumerKey: "abc12345secret" }
```

## Webhook Security

- **Verify webhook signatures** using HMAC-SHA256
- **Use HTTPS** for all callback URLs in production
- **Validate payload structure** before processing
- **Implement idempotency** using webhook IDs to prevent duplicate processing

## IP Whitelisting

Add these Safaricom IPs to your firewall whitelist:

```
196.201.214.200
196.201.214.206
196.201.213.114
196.201.214.207
196.201.214.208
196.201.213.44
196.201.212.127
196.201.212.138
196.201.212.129
196.201.212.136
196.201.212.74
196.201.212.69
```

## Enterprise Security Features

### Circuit Breaker Security

The circuit breaker prevents cascading failures and DoS scenarios:

```typescript
resilience: {
  circuitBreaker: {
    failureThreshold: 5,    // Prevent excessive retry storms
    successThreshold: 2,
    timeout: 60000,
  },
}
```

**Security benefits:**
- Stops requests when service is failing (prevents waste of resources)
- Protects against thundering herd during outages
- Gives backends time to recover

### Rate Limiting Protection

Rate limiting prevents abuse and protects against excessive request patterns:

```typescript
resilience: {
  rateLimiter: {
    capacity: 100,
    refillRate: 10,
    refillInterval: 1000,
  },
}
```

**Security benefits:**
- Prevents request flooding
- Protects against brute force attacks
- Ensures fair resource allocation

### DLQ Security

Dead Letter Queue (DLQ) ensures no webhook events are lost:

```typescript
webhooks: {
  dlq: {
    enabled: true,
    storage: 'database',
  },
}
```

**Security benefits:**
- Guarantees webhook delivery (no data loss)
- Allows audit trail of all webhook attempts
- Enables replay for failed transactions

## Tracing and Observability Security

OpenTelemetry tracing is configured to exclude sensitive data:

```typescript
// Automatic masking of:
// - Phone numbers
// - Transaction amounts (in some contexts)
// - Authentication tokens
// - Passwords and secrets

// Always available for audit:
// - Transaction IDs
// - Status codes
// - Operation types
// - Timestamps
```

**Security practices:**
- Store traces securely (encrypted at rest)
- Limit access to trace data
- Implement retention policies
- Regular audit of trace queries

## Data Protection

### Sensitive Data Fields

The SDK automatically masks these fields in logs:

- Phone numbers (254XXXXXXXXX)
- Transaction amounts (in certain contexts)
- Passphrases and passwords
- Authentication tokens
- Consumer secrets

### Request/Response Sanitization

```typescript
// Requests are sanitized before logging
// Only non-sensitive fields are included:
// - Operation type
// - Status codes
// - Error codes (not messages if they contain sensitive data)
// - Timing information
```

## Production Checklist

- [ ] Use HTTPS for all endpoints
- [ ] Store credentials in secrets manager
- [ ] Enable webhook signature verification
- [ ] Enable circuit breaker for resilience
- [ ] Configure rate limiting appropriately
- [ ] Enable webhook DLQ for durability
- [ ] Set up monitoring and alerting on error rates
- [ ] Log sanitized request/response data
- [ ] Use environment-specific configurations
- [ ] Implement idempotency for critical operations
- [ ] Enable distributed tracing with proper access controls
- [ ] Regularly review circuit breaker and rate limiter metrics
- [ ] Monitor DLQ for webhook failures
- [ ] Set up alerts for circuit breaker open events
- [ ] Implement proper error handling and fallbacks
- [ ] Test disaster recovery procedures

## Security Incident Response

### Circuit Breaker Open

If the circuit breaker opens unexpectedly:

1. Check M-Pesa API status
2. Review error logs for pattern
3. Verify network connectivity
4. Check rate limiting isn't excessive
5. Wait for automatic recovery (timeout period)
6. If persistent, contact M-Pesa support

### Rate Limit Exceeded

If you're consistently hitting rate limits:

1. Analyze request patterns
2. Implement request batching
3. Increase `capacity` parameter if needed
4. Use batch operations for bulk requests
5. Contact M-Pesa for higher limits if justified

### DLQ Growing

If DLQ items accumulate:

1. Identify root cause (check logs for failure patterns)
2. Fix underlying issue
3. Manually replay DLQ items
4. Monitor for recurrence
5. Implement alerting for future growth

## Compliance

### Data Residency

- All data is processed and stored in the region specified by M-Pesa API
- The SDK respects your environment configuration (sandbox/production)

### Audit Logging

Enable comprehensive audit logging:

```typescript
import { Logger } from '@yourdudeken/mpesa-sdk';

const logger = new Logger({
  level: 'info',
  format: 'json',
  auditLog: true,  // Enable audit logging
});
```

Audit logs include:
- All API calls and results
- Authentication events
- Webhook processing
- Configuration changes
- Error events

### PCI Compliance

- Never store full phone numbers in plain text
- Never store transaction secrets in logs
- Use secure credential storage
- Enable encrypted connections
- Implement access controls

## Additional Resources

- [M-Pesa Security Documentation](https://developer.safaricom.et/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Circuit Breaker Pattern](./resilience/circuit-breaker)
- [Rate Limiting Guide](./resilience/rate-limiter)
- [Webhook DLQ Guide](./resilience/webhook-dlq)
