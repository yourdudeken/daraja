// Example: Business Buy Goods
//
// Sends a payment from a business account to a buy goods (till) merchant.
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

	resp, err := mpesa.BusinessBuyGoods(ctx, types.BusinessBuyGoodsRequest{
		CommandID:              "BusinessBuyGoods",
		SenderIdentifierType:   "4",
		RecieverIdentifierType: "4",
		Amount:                 100,
		PartyA:                 174379, // business shortcode
		PartyB:                 600000, // till number
		Remarks:                "Buy goods test",
		QueueTimeOutURL:        "https://example.com/buygoods/queue",
		ResultURL:              "https://example.com/buygoods/result",
	})
	if err != nil {
		log.Fatalf("Business Buy Goods failed: %v", err)
	}

	fmt.Printf("ResponseCode: %s\n", resp.ResponseCode)
	fmt.Printf("ResponseDescription: %s\n", resp.ResponseDescription)
}