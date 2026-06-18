package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/yourdudeken/daraja-sdk/go/client"
	"github.com/yourdudeken/daraja-sdk/go/types"
)

var mpesa *client.Client

func init() {
	mpesa = client.NewClient(types.MpesaConfig{
		ConsumerKey:        os.Getenv("MPESA_CONSUMER_KEY"),
		ConsumerSecret:     os.Getenv("MPESA_CONSUMER_SECRET"),
		Environment:        types.Sandbox,
		Passkey:            os.Getenv("MPESA_PASSKEY"),
		InitiatorName:      os.Getenv("MPESA_INITIATOR_NAME"),
		SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
	})
}

func stkPush() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resp, err := mpesa.STKPush(ctx, types.STKPushRequest{
		BusinessShortCode: 174379,
		TransactionType:   types.CustomerPayBillOnline,
		Amount:            1,
		PartyA:            254722000000,
		PartyB:            174379,
		PhoneNumber:       254722000000,
		CallBackURL:       "https://your-domain.com/api/mpesa/callback",
		AccountReference:  "INV-001",
		TransactionDesc:   "Payment for invoice 001",
	})
	if err != nil {
		log.Fatalf("STK Push failed: %v", err)
	}
	fmt.Printf("STK Push: %s\n", resp.CheckoutRequestID)
}

func stkQuery(checkoutID string) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resp, err := mpesa.STKQuery(ctx, types.STKQueryRequest{
		BusinessShortCode: "174379",
		CheckoutRequestID: checkoutID,
	})
	if err != nil {
		log.Fatalf("STK Query failed: %v", err)
	}
	fmt.Printf("STK Query: %s (code: %s)\n", resp.ResultDesc, resp.ResultCode)
}

func c2bRegisterURL() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resp, err := mpesa.C2BRegisterURL(ctx, types.C2BRegisterURLRequest{
		ShortCode:       "174379",
		ResponseType:    types.ResponseCompleted,
		ConfirmationURL: "https://your-domain.com/api/c2b/confirmation",
		ValidationURL:   "https://your-domain.com/api/c2b/validation",
	})
	if err != nil {
		log.Fatalf("C2B Register URL failed: %v", err)
	}
	fmt.Printf("C2B Register: %s\n", resp.ResponseDescription)
}

func c2bSimulate() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resp, err := mpesa.C2BSimulate(ctx, types.C2BSimulateRequest{
		ShortCode:     174379,
		CommandID:     types.C2BPayBill,
		Amount:        100,
		Msisdn:        254708374149,
		BillRefNumber: "ACCNO-001",
	})
	if err != nil {
		log.Fatalf("C2B Simulate failed: %v", err)
	}
	fmt.Printf("C2B Simulate: %s\n", resp.ResponseDescription)
}

func b2cPayment() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resp, err := mpesa.B2C(ctx, types.B2CRequest{
		InitiatorName:      os.Getenv("MPESA_INITIATOR_NAME"),
		SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
		CommandID:          types.BusinessPayment,
		Amount:             100,
		PartyA:             174379,
		PartyB:             254705912645,
		Remarks:            "Salary disbursement",
		QueueTimeOutURL:    "https://your-domain.com/api/b2c/queue",
		ResultURL:          "https://your-domain.com/api/b2c/result",
		Occassion:          "Monthly Salary",
	})
	if err != nil {
		log.Fatalf("B2C failed: %v", err)
	}
	fmt.Printf("B2C: %s\n", resp.OriginatorConversationID)
}

func reversal(txnID string) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resp, err := mpesa.Reversal(ctx, types.ReversalRequest{
		Initiator:              os.Getenv("MPESA_INITIATOR_NAME"),
		SecurityCredential:     os.Getenv("MPESA_SECURITY_CREDENTIAL"),
		CommandID:              "TransactionReversal",
		TransactionID:          txnID,
		Amount:                 100,
		ReceiverParty:          174379,
		RecieverIdentifierType: 11,
		QueueTimeOutURL:        "https://your-domain.com/api/reversal/queue",
		ResultURL:              "https://your-domain.com/api/reversal/result",
		Remarks:                "Customer initiated reversal",
	})
	if err != nil {
		log.Fatalf("Reversal failed: %v", err)
	}
	fmt.Printf("Reversal: %s\n", resp.ResponseDescription)
}

func transactionStatus(txnID string) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resp, err := mpesa.TransactionStatus(ctx, types.TransactionStatusRequest{
		Initiator:          os.Getenv("MPESA_INITIATOR_NAME"),
		SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
		CommandID:          "TransactionStatusQuery",
		TransactionID:      txnID,
		PartyA:             174379,
		IdentifierType:     4,
		ResultURL:          "https://your-domain.com/api/status/result",
		QueueTimeOutURL:    "https://your-domain.com/api/status/queue",
		Remarks:            "Status check",
	})
	if err != nil {
		log.Fatalf("Transaction Status failed: %v", err)
	}
	fmt.Printf("Status: %s\n", resp.ResponseDescription)
}

func accountBalance() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resp, err := mpesa.AccountBalance(ctx, types.AccountBalanceRequest{
		Initiator:          os.Getenv("MPESA_INITIATOR_NAME"),
		SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
		CommandID:          "AccountBalance",
		PartyA:             174379,
		IdentifierType:     4,
		Remarks:            "Daily balance check",
		QueueTimeOutURL:    "https://your-domain.com/api/balance/queue",
		ResultURL:          "https://your-domain.com/api/balance/result",
	})
	if err != nil {
		log.Fatalf("Account Balance failed: %v", err)
	}
	fmt.Printf("Balance: %s\n", resp.OriginatorConversationID)
}

func businessBuyGoods() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resp, err := mpesa.BusinessBuyGoods(ctx, types.BusinessBuyGoodsRequest{
		ShortCode:     174379,
		CommandID:     types.CustomerBuyGoodsOnline,
		Amount:        100,
		Msisdn:        254708374149,
		BillRefNumber: "INV-001",
	})
	if err != nil {
		log.Fatalf("Business Buy Goods failed: %v", err)
	}
	fmt.Printf("Buy Goods: %s\n", resp.ResponseDescription)
}

func businessPayBill() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resp, err := mpesa.BusinessPayBill(ctx, types.BusinessPayBillRequest{
		ShortCode:     174379,
		CommandID:     types.CustomerPayBillOnline,
		Amount:        100,
		Msisdn:        254708374149,
		BillRefNumber: "INV-001",
	})
	if err != nil {
		log.Fatalf("Business Pay Bill failed: %v", err)
	}
	fmt.Printf("Pay Bill: %s\n", resp.ResponseDescription)
}

func b2Pochi() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resp, err := mpesa.B2Pochi(ctx, types.B2PochiRequest{
		InitiatorName:      os.Getenv("MPESA_INITIATOR_NAME"),
		SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
		CommandID:          types.BusinessPayment,
		Amount:             100,
		PartyA:             174379,
		PartyB:             254708374149,
		Remarks:            "Pochi payment",
		QueueTimeOutURL:    "https://your-domain.com/api/b2pochi/queue",
		ResultURL:          "https://your-domain.com/api/b2pochi/result",
	})
	if err != nil {
		log.Fatalf("B2Pochi failed: %v", err)
	}
	fmt.Printf("B2Pochi: %s\n", resp.OriginatorConversationID)
}

func lipaNaBonga() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resp, err := mpesa.LipaNaBonga(ctx, types.LipaNaBongaRequest{
		Initiator:          os.Getenv("MPESA_INITIATOR_NAME"),
		SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
		CommandID:          "LipaNaBonga",
		Amount:             100,
		PartyA:             174379,
		PartyB:             254708374149,
		Remarks:            "Bonga redemption",
		QueueTimeOutURL:    "https://your-domain.com/api/bonga/queue",
		ResultURL:          "https://your-domain.com/api/bonga/result",
	})
	if err != nil {
		log.Fatalf("Lipa na Bonga failed: %v", err)
	}
	fmt.Printf("Lipa na Bonga: %s\n", resp.OriginatorConversationID)
}

func pullTransactions() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resp, err := mpesa.PullTransactionsQuery(ctx, types.PullTransactionsRequest{
		ShortCode: 174379,
		StartDate: "2026-01-01",
		EndDate:   "2026-06-04",
		Offset:    0,
		Limit:     100,
	})
	if err != nil {
		log.Fatalf("Pull Transactions failed: %v", err)
	}
	fmt.Printf("Pull Transactions: %d records\n", len(resp.Transactions))
}

func imsiQuery() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resp, err := mpesa.IMSI(ctx, types.IMSIRequest{
		CustomerNumber: "254708374149",
	})
	if err != nil {
		log.Fatalf("IMSI Query failed: %v", err)
	}
	fmt.Printf("IMSI: %s\n", resp.ResponseDesc)
}

func iotGetAllSIMs() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resp, err := mpesa.IoTGetAllSIMs(ctx, types.IoTAllSIMsRequest{
		VpnGroup:    []string{"1-225560081663_VPN"},
		StartAtInde: "0",
		PageSize:    "10",
		Username:    "user@safaricom.co.ke",
	})
	if err != nil {
		log.Fatalf("IoT All SIMs failed: %v", err)
	}
	fmt.Printf("IoT All SIMs: %d records\n", len(resp.Body.Desc))
}

func dynamicQR() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	resp, err := mpesa.DynamicQR(ctx, types.DynamicQRRequest{
		MerchantName: "Your Business Name",
		RefNo:        "INV-2024-001",
		Amount:       1500,
		TrxCode:      types.TrxBuyGoods,
		CPI:          "174379",
		Size:         "300",
	})
	if err != nil {
		log.Fatalf("Dynamic QR failed: %v", err)
	}
	fmt.Printf("QR Generated: %s (len: %d)\n", resp.ResponseDescription, len(resp.QRCode))
}

func main() {
	fmt.Println("=== M-Pesa All APIs Demo ===\n")

	stkPush()
	stkQuery("ws_CO_0000000000")
	c2bRegisterURL()
	c2bSimulate()
	b2cPayment()
	reversal("NLA12345XX")
	transactionStatus("NLA12345XX")
	accountBalance()
	dynamicQR()
}
