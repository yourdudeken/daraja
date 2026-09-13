// Example: C2B Simulate
//
// Simulates a customer-to-business payment in the sandbox. This is a
// testing-only endpoint; production C2B payments come from real M-Pesa
// customers hitting your registered confirmation/validation URLs.
//
// Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET
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
	})

	ctx := context.Background()

	resp, err := mpesa.C2BSimulate(ctx, types.C2BSimulateRequest{
		ShortCode:     174379,
		CommandID:     types.CustomerPaybillOnline,
		Amount:        100,
		Msisdn:        254708374149,
		BillRefNumber: "INV-001",
	})
	if err != nil {
		log.Fatalf("C2B Simulate failed: %v", err)
	}

	fmt.Printf("ResponseCode: %s\n", resp.ResponseCode)
	fmt.Printf("ResponseDescription: %s\n", resp.ResponseDescription)
}