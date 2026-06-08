package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/yourdudeken/mpesa-sdk/client"
	"github.com/yourdudeken/mpesa-sdk/types"
)

func main() {
	mpesa := client.NewClient(types.MpesaConfig{
		ConsumerKey:        os.Getenv("MPESA_CONSUMER_KEY"),
		ConsumerSecret:     os.Getenv("MPESA_CONSUMER_SECRET"),
		Environment:        types.Production,
		Passkey:            os.Getenv("MPESA_PASSKEY"),
		InitiatorName:      os.Getenv("MPESA_INITIATOR_NAME"),
		SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
		Timeout:            30 * time.Second,
	})

	ctx := context.Background()

	// 1. Initiate STK Push
	resp, err := mpesa.STKPush(ctx, types.STKPushRequest{
		BusinessShortCode: 174379,
		TransactionType:   types.CustomerPayBillOnline,
		Amount:            5000,
		PartyA:            254722000000,
		PartyB:            174379,
		PhoneNumber:       254722000000,
		CallBackURL:       "https://api.yourdomain.com/mpesa/callback",
		AccountReference:  "ORDER-12345",
		TransactionDesc:   "Order payment",
	})
	if err != nil {
		log.Fatalf("STK Push failed: %v", err)
	}
	fmt.Printf("1. STK Push sent: %s\n", resp.CheckoutRequestID)

	// 2. Query STK status after delay
	time.Sleep(5 * time.Second)
	status, err := mpesa.STKQuery(ctx, types.STKQueryRequest{
		BusinessShortCode: "174379",
		CheckoutRequestID: resp.CheckoutRequestID,
	})
	if err != nil {
		log.Printf("2. Query failed: %v", err)
	} else {
		fmt.Printf("2. Payment status: %s\n", status.ResultDesc)
	}

	// 3. Check account balance
	balance, err := mpesa.AccountBalance(ctx, types.AccountBalanceRequest{
		Initiator:          os.Getenv("MPESA_INITIATOR_NAME"),
		SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
		CommandID:          "AccountBalance",
		PartyA:             174379,
		IdentifierType:     4,
		Remarks:            "Daily reconciliation",
		QueueTimeOutURL:    "https://api.yourdomain.com/mpesa/queue",
		ResultURL:          "https://api.yourdomain.com/mpesa/balance-result",
	})
	if err != nil {
		log.Printf("3. Balance query failed: %v", err)
	} else {
		fmt.Printf("3. Balance query sent: %s\n", balance.OriginatorConversationID)
	}
}
