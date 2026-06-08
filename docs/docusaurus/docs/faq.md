---
sidebar_position: 8
---

# FAQ

## General

**Q: What is the difference between sandbox and production?**
A: Sandbox uses test credentials and simulators. Production uses real M-PESA accounts.

**Q: How long do access tokens last?**
A: Tokens expire after 3600 seconds (1 hour). The SDK handles refresh automatically.

**Q: What are the transaction limits?**
A: Min Ksh 1, Max per transaction Ksh 250,000, Daily max Ksh 500,000.

## Enterprise Features

**Q: Does the SDK include circuit breaker support?**
A: Yes. Configure it under `resilience.circuitBreaker` (TypeScript), `resilience.circuit_breaker` (Python), or `Resilience.CircuitBreaker` (Go). See the Circuit Breaker guide.

**Q: How does rate limiting work?**
A: The SDK uses a token bucket rate limiter. Configure `capacity`, `refillRate`, and `refillInterval` to match your traffic profile. See the Rate Limiter guide.

**Q: What happens to failed webhooks?**
A: Failed webhook deliveries are retried with exponential backoff and then placed into a Dead Letter Queue (DLQ) for manual replay. See the Webhook Retry & DLQ guide.

**Q: Can I trace and measure SDK calls?**
A: Yes. The SDK supports OpenTelemetry tracing and Prometheus-style metrics. See the Tracing and Metrics guides.

## STK Push

**Q: Not receiving callbacks?**
A: Ensure your CallBackURL is publicly accessible via HTTPS (production) or HTTP (sandbox).

**Q: What is a Passkey?**
A: A Passkey is used for generating the encrypted password for STK Push. It's provided in the test credentials section for sandbox and after go-live for production.

**Q: Can I use Till Number for STK Push?**
A: Yes, use `TransactionType: CustomerBuyGoodsOnline` with your Till number as `PartyB`.

## B2C

**Q: Why do I get 'Initiator information is invalid'?**
A: Check the API user username, encrypted password, and ensure the user has the ORG B2C API Initiator role.

**Q: Which account is debited?**
A: B2C debits the Utility Account, not the MMF/Working account.

**Q: Can I reverse a B2C transaction?**
A: No, B2C reversals must be done manually on the M-PESA portal.

## Errors

**Q: What does error code 500.001.1001 mean?**
A: This usually means the merchant shortcode doesn't exist or credentials are wrong.

**Q: What does ResultCode 1032 mean?**
A: The customer cancelled the STK Push request.

**Q: What does 'Spike Arrest Violation' mean?**
A: You're sending requests too fast. Reduce your request rate.
