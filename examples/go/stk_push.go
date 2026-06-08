package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/yourdudeken/mpesa-sdk/client"
	"github.com/yourdudeken/mpesa-sdk/types"
)

func main() {
	mpesaClient := client.NewClient(types.MpesaConfig{
		ConsumerKey:    os.Getenv("MPESA_CONSUMER_KEY"),
		ConsumerSecret: os.Getenv("MPESA_CONSUMER_SECRET"),
		Environment:    types.Sandbox,
		Passkey:        os.Getenv("MPESA_PASSKEY"),
	})

	ctx := context.Background()

	resp, err := mpesaClient.STKPush(ctx, types.STKPushRequest{
		BusinessShortCode: 174379,
		TransactionType:   types.CustomerPayBillOnline,
		Amount:            1,
		PartyA:            254722000000,
		PartyB:            174379,
		PhoneNumber:       254722111111,
		CallBackURL:       "https://your-domain.com/api/mpesa/callback",
		AccountReference:  "INV-001",
		TransactionDesc:   "Payment",
	})

	if err != nil {
		log.Fatalf("STK Push failed: %v", err)
	}

	fmt.Printf("STK Push initiated: %s\n", resp.CheckoutRequestID)
}
