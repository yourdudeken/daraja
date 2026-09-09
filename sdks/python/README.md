# daraja-sdk-py

Production-grade Python SDK for Safaricom M-Pesa Daraja API.

Part of the [daraja-sdk monorepo](../..). See the [documentation](../..//docs/README.md) for usage.

## Install

```bash
pip install daraja-sdk-py
```

## Quick start

```python
from daraja import Mpesa, MpesaConfig

client = Mpesa(MpesaConfig(
    consumer_key="...",
    consumer_secret="...",
    environment="sandbox",
))
```

## License

MIT
