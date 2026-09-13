// Example: B2C Payment
//
// Sends money from a business account to a customer's M-Pesa wallet.
// The result is delivered asynchronously via ResultURL.
//
// Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET,
//
//	MPESA_INITIATOR_NAME, MPESA_INITIATOR_PASSWORD
//
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

	resp, err := mpesa.B2C(ctx, types.B2CRequest{
		CommandID:       types.BusinessPayment,
		Amount:          10,
		PartyA:          174379,       // business shortcode
		PartyB:          254708374149, // customer phone
		Remarks:         "Test B2C",
		QueueTimeOutURL: "https://example.com/b2c/queue",
		ResultURL:       "https://example.com/b2c/result",
		Occassion:       "Test",
	})
	if err != nil {
		log.Fatalf("B2C failed: %v", err)
	}

	fmt.Printf("OriginatorConversationID: %s\n", resp.OriginatorConversationID)
	fmt.Printf("ResponseCode: %s\n", resp.ResponseCode)
}
