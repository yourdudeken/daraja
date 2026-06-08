---
sidebar_position: 2
---

# Installation

## TypeScript

```bash
npm install @yourdudeken/mpesa-sdk
```

**Peer dependency:** Requires `axios` (v1.7+).

```bash
npm install axios
```

## Python

```bash
pip install yourdudeken-mpesa-sdk
```

Requires Python 3.11+.

## Go

```bash
go get github.com/yourdudeken/mpesa-sdk/go
```

Requires Go 1.25+.

## Requirements

### M-Pesa Developer Account

1. Create an account at [Safaricom Developer Portal](https://developer.safaricom.et/)
2. Create a sandbox app to get your API credentials
3. Note your **Consumer Key** and **Consumer Secret**
4. For STK Push, note your **Passkey** from the test credentials

### Environment Setup

```bash
# Required
export MPESA_CONSUMER_KEY=your_consumer_key
export MPESA_CONSUMER_SECRET=your_consumer_secret

# For STK Push
export MPESA_PASSKEY=your_passkey
export MPESA_SHORTCODE=174379

# Optional
export MPESA_ENV=sandbox  # or production
```
