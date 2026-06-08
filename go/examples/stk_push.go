// Example shows how to use the M-Pesa Go SDK to initiate an STK Push.
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/yourdudeken/mpesa-sdk/go/client"
	"github.com/yourdudeken/mpesa-sdk/go/types"
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
		PartyA:            254722000000,
		PartyB:            174379,
		PhoneNumber:       254722111111,
		CallBackURL:       "https://example.com/callback",
		AccountReference:  "INV-001",
		TransactionDesc:   "Payment",
	})

	if err != nil {
		log.Fatalf("STK Push failed: %v", err)
	}

	fmt.Printf("Checkout ID: %s\n", resp.CheckoutRequestID)
}
