from flask import Flask, request, jsonify
from mpesa import Mpesa, WebhookManager

app = Flask(__name__)

mpesa = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "environment": "sandbox",
    "passkey": "...",
})

webhooks = WebhookManager()

@webhooks.on("stk:callback")
def handle_stk(event_type, payload):
    result = webhooks.parse_stk_callback(payload)
    print(f"STK Result: {result}")

@app.route("/api/stkpush", methods=["POST"])
def stk_push():
    try:
        response = mpesa.stk_push(request.json)
        return jsonify({"success": True, "data": response.model_dump()})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route("/mpesa/callback", methods=["POST"])
def callback():
    webhooks.emit("stk:callback", request.json)
    return jsonify({"ResultCode": "0", "ResultDesc": "Accepted"})

if __name__ == "__main__":
    app.run(port=5000)
