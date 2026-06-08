---
sidebar_position: 11
---

# Framework Integrations

Integrate M-Pesa SDK with your favorite framework.

## Express (TypeScript)

```typescript
import express from 'express';
import { Mpesa, createExpressMiddleware, WebhookManager } from '@yourdudeken/mpesa-sdk';

const app = express();
app.use(express.json());

const webhooks = new WebhookManager({ passkey: process.env.MPESA_PASSKEY });

webhooks.on('stk:callback', (event) => {
  const result = webhooks.parseSTKCallback(event.payload);
  console.log(`Payment: ${result.receiptNumber}`);
});

app.use('/mpesa/webhook', createExpressMiddleware({ webhookManager: webhooks }));
app.listen(3000);
```

## Fastify (TypeScript)

```typescript
import Fastify from 'fastify';
import { Mpesa, createFastifyPlugin, WebhookManager } from '@yourdudeken/mpesa-sdk';

const fastify = Fastify({ logger: true });
const webhooks = new WebhookManager();

webhooks.on('stk:callback', (event) => {
  const result = webhooks.parseSTKCallback(event.payload);
  fastify.log.info(`Payment: ${result.receiptNumber}`);
});

fastify.register(createFastifyPlugin({ webhookManager: webhooks }));
await fastify.listen({ port: 3000 });
```

## FastAPI (Python)

```python
from fastapi import FastAPI, Request
from mpesa import Mpesa, WebhookManager

app = FastAPI()
webhooks = WebhookManager()

@webhooks.on("stk:callback")
def handle_stk(event_type, payload):
    result = webhooks.parse_stk_callback(payload)
    print(f"Payment: {result['receipt_number']}")

@app.post("/mpesa/callback")
async def mpesa_callback(request: Request):
    body = await request.json()
    webhooks.emit("stk:callback", body)
    return {"ResultCode": "0", "ResultDesc": "Accepted"}
```

## Flask (Python)

```python
from flask import Flask, request, jsonify
from mpesa import Mpesa, WebhookManager

app = Flask(__name__)
webhooks = WebhookManager()

@webhooks.on("stk:callback")
def handle_stk(event_type, payload):
    result = webhooks.parse_stk_callback(payload)
    print(f"Payment: {result['receipt_number']}")

@app.route("/mpesa/callback", methods=["POST"])
def callback():
    webhooks.emit("stk:callback", request.json)
    return jsonify({"ResultCode": "0", "ResultDesc": "Accepted"})
```

## Gin (Go)

```go
package main

import (
    "github.com/gin-gonic/gin"
    "github.com/yourdudeken/mpesa-sdk/go/client"
    "github.com/yourdudeken/mpesa-sdk/go/types"
    "github.com/yourdudeken/mpesa-sdk/go/webhooks"
)

func main() {
    r := gin.Default()
    wh := webhooks.NewManager()

    wh.On(webhooks.EventSTKCallback, func(et webhooks.EventType, payload interface{}) {
        // handle callback
    })

    r.POST("/mpesa/callback", func(c *gin.Context) {
        body, _ := c.GetRawData()
        wh.HandleSTKCallback(body)
        c.JSON(200, gin.H{"ResultCode": "0", "ResultDesc": "Accepted"})
    })

    r.Run(":8080")
}
```
