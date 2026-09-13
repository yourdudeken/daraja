// Example: Mpesa Ratiba (Standing Order)
//
// Creates a standing order so M-Pesa payments are made automatically on a
// recurring basis. Dates use YYYYMMDD format; Frequency is a code
// (e.g. "4" = monthly).
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

	resp, err := mpesa.CreateStandingOrder(ctx, types.RatibaRequest{
		StandingOrderName:           "Test Order",
		StartDate:                   "20260601",
		EndDate:                     "20261231",
		BusinessShortCode:           "174379",
		TransactionType:             "Standing Order Customer Pay Bill",
		ReceiverPartyIdentifierType: "4",
		Amount:                      "500",
		PartyA:                      "254708374149",
		CallBackURL:                 "https://example.com/ratiba/callback",
		AccountReference:            "RAT-TEST",
		TransactionDesc:             "Test standing order",
		Frequency:                   "4",
	})
	if err != nil {
		log.Fatalf("Ratiba failed: %v", err)
	}

	fmt.Printf("ResponseCode: %s\n", resp.ResponseHeader.ResponseCode)
}
