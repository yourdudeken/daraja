// Example: STK Push (Lipa Na M-Pesa Online)
//
// Sends a USSD prompt to a customer's phone to authorize a payment.
// The response only confirms the request was accepted; the actual
// transaction result arrives via the CallBackURL.
//
// Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY
// Verified against the sandbox.
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/yourdudeken/daraja/sdks/go/client"
	"github.com/yourdudeken/daraja/sdks/go/types"
)

func main() {
	mpesa := client.NewClient(types.MpesaConfig{
		ConsumerKey:    os.Getenv("MPESA_CONSUMER_KEY"),
		ConsumerSecret: os.Getenv("MPESA_CONSUMER_SECRET"),
		Environment:    types.Sandbox,
		Passkey:        os.Getenv("MPESA_PASSKEY"),
	})

	ctx := context.Background()

	resp, err := mpesa.STKPush(ctx, types.STKPushRequest{
		BusinessShortCode: 174379,
		TransactionType:   types.CustomerPayBillOnline,
		Amount:            1,
		PartyA:            254708374149, // customer phone sending money
		PartyB:            174379,       // business shortcode receiving money
		PhoneNumber:       254708374149, // phone that receives the STK prompt
		CallBackURL:       "https://example.com/callback",
		AccountReference:  "INV-001",
		TransactionDesc:   "Payment",
	})
	if err != nil {
		log.Fatalf("STK Push failed: %v", err)
	}

	fmt.Printf("CheckoutRequestID: %s\n", resp.CheckoutRequestID)
	fmt.Printf("ResponseCode: %s\n", resp.ResponseCode)
	fmt.Printf("ResponseDescription: %s\n", resp.ResponseDescription)

	// Use CheckoutRequestID with STKQuery to check the payment status.
}
