// Example: Transaction Status
//
// Queries the status of a previously initiated M-Pesa transaction by
// TransactionID or OriginalConversationID. Result arrives via ResultURL.
//
// Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET,
//           MPESA_INITIATOR_NAME, MPESA_INITIATOR_PASSWORD
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
		ConsumerKey:       os.Getenv("MPESA_CONSUMER_KEY"),
		ConsumerSecret:    os.Getenv("MPESA_CONSUMER_SECRET"),
		Environment:       types.Sandbox,
		InitiatorName:     os.Getenv("MPESA_INITIATOR_NAME"),
		InitiatorPassword: os.Getenv("MPESA_INITIATOR_PASSWORD"),
	})

	ctx := context.Background()

	resp, err := mpesa.TransactionStatus(ctx, types.TransactionStatusRequest{
		CommandID:       "TransactionStatusQuery",
		TransactionID:   "NLA00TEST",
		PartyA:          174379,
		IdentifierType:  4, // 4 = shortcode
		ResultURL:       "https://example.com/status/result",
		QueueTimeOutURL: "https://example.com/status/queue",
		Remarks:         "Status check",
	})
	if err != nil {
		log.Fatalf("Transaction Status failed: %v", err)
	}

	fmt.Printf("ResponseCode: %s\n", resp.ResponseCode)
	fmt.Printf("ResponseDescription: %s\n", resp.ResponseDescription)
}