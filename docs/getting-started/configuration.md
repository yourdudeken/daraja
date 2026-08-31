# Configuration

All SDKs accept the same core options:

| Option | Description | Default |
| ------ | ----------- | ------- |
| `consumerKey` | M-Pesa consumer key | — |
| `consumerSecret` | M-Pesa consumer secret | — |
| `environment` | `sandbox` or `production` | `sandbox` |
| `maxRetries` | Retry count with backoff | 3 |

Each SDK exposes an `MpesaConfig`-style object. See language-specific examples.
