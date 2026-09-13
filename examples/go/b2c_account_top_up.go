// Example: B2C Account Top-Up
//
// Tops up a business M-Pesa account from another business account.
// Result arrives via ResultURL.
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

	resp, err := mpesa.AccountTopUp(ctx, types.B2CAccountTopUpRequest{
		CommandID:              "BusinessPayToBulk",
		SenderIdentifierType:   "4",
		RecieverIdentifierType: "4",
		Amount:                 "10",
		PartyA:                 "174379",
		PartyB:                 "600000",
		AccountReference:       "TOPUP-TEST",
		Remarks:                "Test top up",
		QueueTimeOutURL:        "https://example.com/topup/queue",
		ResultURL:              "https://example.com/topup/result",
	})
	if err != nil {
		log.Fatalf("B2C Account Top-Up failed: %v", err)
	}

	fmt.Printf("OriginatorConversationID: %s\n", resp.OriginatorConversationID)
	fmt.Printf("ResponseCode: %s\n", resp.ResponseCode)
}