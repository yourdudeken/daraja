# Installation

Each SDK is distributed on its ecosystem's package registry. All share the same
API design and require the M-Pesa credentials from your Daraja developer
portal.

## Python

Requires Python 3.11+.

```bash
pip install daraja-sdk-py
```

## TypeScript

Package `@daraja-sdk/ts` (ESM + CJS dual output).

```bash
npm install @daraja-sdk/ts
```

## Go

Requires Go 1.25+. Import the module as `github.com/yourdudeken/daraja-sdk/go`.

```bash
go get github.com/yourdudeken/daraja-sdk/go
```

```go
import "github.com/yourdudeken/daraja-sdk/go/client"
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
import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({
  consumerKey: "YOUR_CONSUMER_KEY",
  consumerSecret: "YOUR_CONSUMER_SECRET",
});
```

```go
import "github.com/yourdudeken/daraja-sdk/go/client"
import "github.com/yourdudeken/daraja-sdk/go/types"

mpesa := client.NewClient(types.MpesaConfig{
    ConsumerKey:    "YOUR_CONSUMER_KEY",
    ConsumerSecret: "YOUR_CONSUMER_SECRET",
    // defaults to sandbox
})
```

See [Configuration](configuration.md) for all available options.
