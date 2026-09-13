// Example: Tax Remittance
//
// Remits tax payments to the Kenya Revenue Authority (KRA) via M-Pesa.
// Result arrives via ResultURL.
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

	resp, err := mpesa.TaxRemittance(ctx, types.TaxRemittanceRequest{
		CommandID:              "PayTaxToKRA",
		SenderIdentifierType:   "4",
		RecieverIdentifierType: "4",
		Amount:                 "100",
		PartyA:                 "174379",
		PartyB:                 "572572", // KRA paybill
		AccountReference:       "TAX-TEST",
		Remarks:                "Test tax remittance",
		QueueTimeOutURL:        "https://example.com/tax/queue",
		ResultURL:              "https://example.com/tax/result",
	})
	if err != nil {
		log.Fatalf("Tax Remittance failed: %v", err)
	}

	fmt.Printf("OriginatorConversationID: %s\n", resp.OriginatorConversationID)
	fmt.Printf("ResponseCode: %s\n", resp.ResponseCode)
}
