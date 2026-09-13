// Example: Pull Transactions
//
// Registers to receive transaction notifications and queries historical
// pull transactions for a business shortcode.
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

	// 1. Register for pull transaction notifications.
	regResp, err := mpesa.PullTransactionsRegister(ctx, types.PullTransactionsRegisterRequest{
		ShortCode:       "174379",
		RequestType:     "Pull",
		NominatedNumber: "254708374149",
		CallBackURL:     "https://example.com/pull/callback",
	})
	if err != nil {
		log.Fatalf("Pull Transactions Register failed: %v", err)
	}
	fmt.Printf("Register ResponseRefID: %s\n", regResp.ResponseRefID)

	// 2. Query the pulled transactions.
	queryResp, err := mpesa.PullTransactionsQuery(ctx, types.PullTransactionsQueryRequest{
		ShortCode:   "174379",
		StartDate:   "20260101",
		EndDate:     "20261231",
		OffSetValue: "0",
	})
	if err != nil {
		log.Fatalf("Pull Transactions Query failed: %v", err)
	}
	fmt.Printf("Query ResponseRefID: %s\n", queryResp.ResponseRefID)
}