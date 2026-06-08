from fastapi import FastAPI, Request
from mpesa import Mpesa, WebhookManager

app = FastAPI()

mpesa = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "environment": "sandbox",
    "passkey": "...",
})

webhooks = WebhookManager()

@webhooks.on("stk:callback")
def handle_stk_callback(event_type, payload):
    result = webhooks.parse_stk_callback(payload)
    if result["success"]:
        print(f"Payment: {result['receipt_number']} KES {result['amount']}")
    else:
        print(f"Failed: {result['result_description']}")

@app.post("/api/stkpush")
async def stk_push(request: Request):
    body = await request.json()
    try:
        response = mpesa.stk_push(body)
        return {"success": True, "data": response.model_dump()}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/mpesa/callback")
async def mpesa_callback(request: Request):
    body = await request.json()
    webhooks.emit("stk:callback", body)
    return {"ResultCode": "0", "ResultDesc": "Accepted"}
