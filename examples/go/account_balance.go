// Example: Account Balance
//
// Queries the balance of an M-Pesa paybill or till account. The balance
// is delivered asynchronously via ResultURL.
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

	resp, err := mpesa.AccountBalance(ctx, types.AccountBalanceRequest{
		CommandID:       "AccountBalance",
		PartyA:          174379,
		IdentifierType:  4, // 4 = shortcode
		Remarks:         "Balance check",
		QueueTimeOutURL: "https://example.com/balance/queue",
		ResultURL:       "https://example.com/balance/result",
	})
	if err != nil {
		log.Fatalf("Account Balance failed: %v", err)
	}

	fmt.Printf("OriginatorConversationID: %s\n", resp.OriginatorConversationID)
	fmt.Printf("ResponseCode: %s\n", resp.ResponseCode)
}