package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/yourdudeken/mpesa-sdk/client"
	"github.com/yourdudeken/mpesa-sdk/types"
	"github.com/yourdudeken/mpesa-sdk/webhooks"
)

func main() {
	mpesa := client.NewClient(types.MpesaConfig{
		ConsumerKey:    os.Getenv("MPESA_CONSUMER_KEY"),
		ConsumerSecret: os.Getenv("MPESA_CONSUMER_SECRET"),
		Environment:    types.Sandbox,
		Passkey:        os.Getenv("MPESA_PASSKEY"),
	})

	wh := webhooks.NewManager()

	wh.On(webhooks.EventSTKCallback, func(et webhooks.EventType, payload interface{}) {
		if result, ok := payload.(types.STKCallbackResult); ok {
			if result.Success {
				receipt := "<nil>"
				if result.ReceiptNumber != nil {
					receipt = *result.ReceiptNumber
				}
				amount := 0.0
				if result.Amount != nil {
					amount = *result.Amount
				}
				fmt.Printf("[STK] Payment: %s KES %.0f\n", receipt, amount)
			} else {
				fmt.Printf("[STK] Failed: %s (code: %d)\n", result.ResultDescription, result.ResultCode)
			}
		}
	})

	wh.On(webhooks.EventB2CResult, func(et webhooks.EventType, payload interface{}) {
		fmt.Println("[B2C] Result received")
	})

	wh.On(webhooks.EventAccountBalance, func(et webhooks.EventType, payload interface{}) {
		fmt.Println("[Balance] Account balance data received")
	})

	wh.On(webhooks.EventTransactionStatus, func(et webhooks.EventType, payload interface{}) {
		fmt.Println("[Status] Transaction status data received")
	})

	wh.On(webhooks.EventReversalResult, func(et webhooks.EventType, payload interface{}) {
		fmt.Println("[Reversal] Reversal result received")
	})

	wh.On(webhooks.EventC2BValidation, func(et webhooks.EventType, payload interface{}) {
		fmt.Println("[C2B] Validation request received")
	})

	ctx := context.Background()
	resp, err := mpesa.STKPush(ctx, types.STKPushRequest{
		BusinessShortCode: 174379,
		TransactionType:   types.CustomerPayBillOnline,
		Amount:            5000,
		PartyA:            254722000000,
		PartyB:            174379,
		PhoneNumber:       254722000000,
		CallBackURL:       "https://api.yourdomain.com/mpesa/callback",
		AccountReference:  "ORDER-12345",
		TransactionDesc:   "Order payment",
	})
	if err != nil {
		log.Fatalf("STK Push failed: %v", err)
	}
	fmt.Printf("Order initiated: %s\n", resp.CheckoutRequestID)

	payload := types.STKCallbackPayload{}
	payload.Body.StkCallback.MerchantRequestID = resp.MerchantRequestID
	payload.Body.StkCallback.CheckoutRequestID = resp.CheckoutRequestID
	payload.Body.StkCallback.ResultCode = 0
	payload.Body.StkCallback.ResultDesc = "Success"
	payload.Body.StkCallback.CallbackMetadata = &struct {
		Item []struct {
			Name  string      `json:"Name"`
			Value interface{} `json:"Value"`
		} `json:"Item"`
	}{
		Item: []struct {
			Name  string      `json:"Name"`
			Value interface{} `json:"Value"`
		}{
			{Name: "Amount", Value: float64(5000)},
			{Name: "MpesaReceiptNumber", Value: "NLA12345XX"},
		},
	}

	// Parse and dispatch through the webhook manager
	result := client.ParseSTKCallback(payload)
	wh.Emit(webhooks.EventSTKCallback, result)

	if result.Success {
		receipt := "<nil>"
		if result.ReceiptNumber != nil {
			receipt = *result.ReceiptNumber
		}
		amount := 0.0
		if result.Amount != nil {
			amount = *result.Amount
		}
		fmt.Printf("Payment confirmed: %s KES %.0f\n", receipt, amount)
	}
}
