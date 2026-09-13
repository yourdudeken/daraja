// Example: Business Pay Bill
//
// Sends a payment from a business account to a paybill merchant.
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

	resp, err := mpesa.BusinessPayBill(ctx, types.BusinessPayBillRequest{
		CommandID:              "BusinessPayBill",
		SenderIdentifierType:   "4",
		RecieverIdentifierType: "4",
		Amount:                 100,
		PartyA:                 174379, // business shortcode
		PartyB:                 600000, // paybill number
		AccountReference:       "PAYBILL-TEST",
		Remarks:                "Pay bill test",
		QueueTimeOutURL:        "https://example.com/paybill/queue",
		ResultURL:              "https://example.com/paybill/result",
	})
	if err != nil {
		log.Fatalf("Business Pay Bill failed: %v", err)
	}

	fmt.Printf("ResponseCode: %s\n", resp.ResponseCode)
	fmt.Printf("ResponseDescription: %s\n", resp.ResponseDescription)
}
