# Installation

Each SDK is distributed on its ecosystem's package registry. All share the same
API design and require the M-Pesa credentials from your Daraja developer
portal.

## Python

Requires Python 3.11+.

```bash
pip install daraja-sdk-py
```

Optional extras (install with `[all]` to get everything):

| Extra | Provides |
| ----- | -------- |
| `fastapi` | FastAPI middleware helpers |
| `flask` | Flask middleware helpers |
| `django` | Django middleware helpers |
| `redis` | Redis-backed shared token cache |
| `all` | All of the above |

```bash
pip install "daraja-sdk-py[all]"
```

The package also ships a `daraja` CLI.

## TypeScript

Package `daraja-sdk-ts` (ESM + CJS dual output).

```bash
npm install daraja-sdk-ts
```

## Initializing the client

Minimal setup:

```python
from daraja import Mpesa

mpesa = Mpesa({
    "consumer_key": "YOUR_CONSUMER_KEY",
    "consumer_secret": "YOUR_CONSUMER_SECRET",
})
```

```ts
import { Mpesa } from "daraja-sdk-ts";

const mpesa = new Mpesa({
  consumerKey: "YOUR_CONSUMER_KEY",
  consumerSecret: "YOUR_CONSUMER_SECRET",
});
```

See [Configuration](configuration.md) for all available options.
