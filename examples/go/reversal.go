// Example: Transaction Reversal
//
// Reverses a completed M-Pesa transaction. The reversal amount must not
// exceed the original transaction amount. Result arrives via ResultURL.
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

	resp, err := mpesa.Reversal(ctx, types.ReversalRequest{
		CommandID:              "TransactionReversal",
		TransactionID:          "NLA00TEST", // the transaction to reverse
		Amount:                 10,
		ReceiverParty:          174379,
		RecieverIdentifierType: "11", // 11 = shortcode
		QueueTimeOutURL:        "https://example.com/reversal/queue",
		ResultURL:              "https://example.com/reversal/result",
		Remarks:                "Test reversal",
	})
	if err != nil {
		log.Fatalf("Reversal failed: %v", err)
	}

	fmt.Printf("ResponseCode: %s\n", resp.ResponseCode)
	fmt.Printf("ResponseDescription: %s\n", resp.ResponseDescription)
}