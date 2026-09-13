// Example: B2Pochi
//
// Sends money from a business account to a customer's Pochi la Biashara
// (business wallet). Result arrives via ResultURL.
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

	resp, err := mpesa.B2Pochi(ctx, types.B2PochiRequest{
		CommandID:                "BusinessPayToPochi",
		Amount:                   10,
		PartyA:                   174379, // business shortcode
		PartyB:                   254708374149, // customer phone
		Remarks:                  "Pochi test",
		QueueTimeOutURL:          "https://example.com/b2pochi/queue",
		ResultURL:                "https://example.com/b2pochi/result",
	})
	if err != nil {
		log.Fatalf("B2Pochi failed: %v", err)
	}

	fmt.Printf("OriginatorConversationID: %s\n", resp.OriginatorConversationID)
	fmt.Printf("ResponseCode: %s\n", resp.ResponseCode)
}