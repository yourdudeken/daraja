// Example: STK Query
//
// Queries the status of an STK Push transaction using the
// CheckoutRequestID returned by STK Push.
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

	resp, err := mpesa.STKQuery(ctx, types.STKQueryRequest{
		BusinessShortCode: "174379",
		Password:          "", // SDK derives this from passkey + timestamp
		Timestamp:         "",
		CheckoutRequestID: "ws_CO_1234567890", // from STK Push response
	})
	if err != nil {
		log.Fatalf("STK Query failed: %v", err)
	}

	fmt.Printf("ResultCode: %s\n", resp.ResultCode)
	fmt.Printf("ResultDesc: %s\n", resp.ResultDesc)
	fmt.Printf("Amount: %s\n", resp.Amount)
	fmt.Printf("MpesaReceiptNumber: %s\n", resp.MpesaReceiptNumber)
}