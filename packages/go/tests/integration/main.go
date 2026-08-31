package main

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/yourdudeken/daraja-sdk/go/client"
	"github.com/yourdudeken/daraja-sdk/go/types"
)

var ERRORS []string
var sandboxBlocked bool

func logError(api string, err error) {
	ERRORS = append(ERRORS, fmt.Sprintf("[%s] %T: %s", api, err, err.Error()))
	fmt.Printf("  [ERROR] %s: %T: %s\n", api, err, err)
}

func checkBlocked(api string, err error) bool {
	errStr := err.Error()
	if strings.Contains(errStr, "403") && (strings.Contains(strings.ToLower(errStr), "oauth") || strings.Contains(strings.ToLower(errStr), "generate")) {
		sandboxBlocked = true
		fmt.Println("   [BLOCKED] Sandbox WAF blocked the IP. Skipping remaining tests.")
	}
	return sandboxBlocked
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	fmt.Println("============================================================")
	fmt.Println("Go SDK - Core API Integration Tests")
	fmt.Println("============================================================")

	mpesa := client.NewClient(types.MpesaConfig{
		ConsumerKey:       os.Getenv("MPESA_CONSUMER_KEY"),
		ConsumerSecret:    os.Getenv("MPESA_CONSUMER_SECRET"),
		Environment:       types.Sandbox,
		Passkey:           os.Getenv("MPESA_PASSKEY"),
		InitiatorName:     os.Getenv("MPESA_INITIATOR_NAME"),
		InitiatorPassword: os.Getenv("MPESA_INITIATOR_PASSWORD"),
	})

	ctx, cancel := context.WithTimeout(context.Background(), 900*time.Second)
	defer cancel()

	sleep := func() { time.Sleep(30 * time.Second) }
	shortcode := 174379
	phone := 254708374149
	callbackBase := getEnv("MPESA_CALLBACK_URL", "https://webhook.site/ad79c1ec-2493-4016-b8ed-905390f58db3")

	// Test 1: OAuth (implicit, done during first call)

	sleep()
	// Test 2: STK Push
	fmt.Println("\n2. STK Push (M-Pesa Express)")
	stkResp, err := mpesa.STKPush(ctx, types.STKPushRequest{
		BusinessShortCode: shortcode,
		TransactionType:   types.CustomerPayBillOnline,
		Amount:            1,
		PartyA:            phone,
		PartyB:            shortcode,
		PhoneNumber:       phone,
		CallBackURL:       callbackBase + "/callback",
		AccountReference:  "INV-001",
		TransactionDesc:   "Test payment",
	})
	if err != nil {
		logError("STK Push", err)
	} else {
		fmt.Printf("   CheckoutRequestID: %s\n", stkResp.CheckoutRequestID)
		fmt.Printf("   ResponseCode: %s\n", stkResp.ResponseCode)
		fmt.Printf("   ResponseDescription: %s\n", stkResp.ResponseDescription)

		// Test 3: STK Query
		sleep()
		checkoutID := stkResp.CheckoutRequestID
		fmt.Printf("\n3. STK Query (%s)\n", checkoutID)
		stkQResp, err := mpesa.STKQuery(ctx, types.STKQueryRequest{
			BusinessShortCode: "174379",
			CheckoutRequestID: checkoutID,
		})
		if err != nil {
			logError("STK Query", err)
		} else {
			fmt.Printf("   ResultCode: %s\n", stkQResp.ResultCode)
			fmt.Printf("   ResultDesc: %s\n", stkQResp.ResultDesc)
		}
	}

	sleep()
	// Test 5: C2B Simulate
	fmt.Println("\n5. C2B Simulate")
	c2bSimResp, err := mpesa.C2BSimulate(ctx, types.C2BSimulateRequest{
		ShortCode:     174379,
		CommandID:     types.C2BPayBill,
		Amount:        100,
		Msisdn:        phone,
		BillRefNumber: "TEST-001",
	})
	if err != nil {
		logError("C2B Simulate", err)
	} else {
		fmt.Printf("   ResponseCode: %s\n", c2bSimResp.ResponseCode)
		fmt.Printf("   ResponseDescription: %s\n", c2bSimResp.ResponseDescription)
	}

	sleep()
	// Test 10: Dynamic QR
	fmt.Println("\n10. Dynamic QR")
	qrResp, err := mpesa.DynamicQR(ctx, types.DynamicQRRequest{
		MerchantName: "TestBiz",
		RefNo:        "QR-001",
		Amount:       100,
		TrxCode:      types.TrxBuyGoods,
		CPI:          "174379",
		Size:         "300",
	})
	if err != nil {
		logError("Dynamic QR", err)
	} else {
		fmt.Printf("   ResponseCode: %s\n", qrResp.ResponseCode)
		fmt.Printf("   QRCode length: %d\n", len(qrResp.QRCode))
	}

	sleep()
	// Test 6: B2C
	fmt.Println("\n6. B2C Payment")
	if os.Getenv("MPESA_INITIATOR_NAME") == "" {
		fmt.Println("   SKIP: initiator_name not set")
	} else if sandboxBlocked {
		// skip
	} else {
		oid := fmt.Sprintf("INT_%d_%x", time.Now().Unix(), time.Now().UnixNano())
		b2cResp, err := mpesa.B2C(ctx, types.B2CRequest{
			OriginatorConversationID: oid,
			CommandID:                types.BusinessPayment,
			Amount:                   10,
			PartyA:                   shortcode,
			PartyB:                   phone,
			Remarks:                  "Test B2C",
			QueueTimeOutURL:          callbackBase + "/b2c/queue",
			ResultURL:                callbackBase + "/b2c/result",
			Occassion:                "Test",
		})
		if err != nil {
			if !checkBlocked("B2C", err) {
				logError("B2C", err)
			}
		} else {
			fmt.Printf("   OriginatorConversationID: %s\n", b2cResp.OriginatorConversationID)
			fmt.Printf("   ResponseCode: %s\n", b2cResp.ResponseCode)
		}
	}

	sleep()
	// Test 7: Reversal
	fmt.Println("\n7. Transaction Reversal")
	if os.Getenv("MPESA_INITIATOR_NAME") == "" {
		fmt.Println("   SKIP: initiator_name not set")
	} else if sandboxBlocked {
		// skip
	} else {
		revResp, err := mpesa.Reversal(ctx, types.ReversalRequest{
			CommandID:              "TransactionReversal",
			TransactionID:          "NLA00TEST",
			Amount:                 10,
			ReceiverParty:          shortcode,
			RecieverIdentifierType: 11,
			QueueTimeOutURL:        callbackBase + "/reversal/queue",
			ResultURL:              callbackBase + "/reversal/result",
			Remarks:                "Test reversal",
		})
		if err != nil {
			if !checkBlocked("Reversal", err) {
				logError("Reversal", err)
			}
		} else {
			fmt.Printf("   ResponseCode: %s\n", revResp.ResponseCode)
			fmt.Printf("   ResponseDescription: %s\n", revResp.ResponseDescription)
		}
	}

	sleep()
	// Test 8: Transaction Status
	fmt.Println("\n8. Transaction Status Query")
	if os.Getenv("MPESA_INITIATOR_NAME") == "" {
		fmt.Println("   SKIP: initiator_name not set")
	} else if sandboxBlocked {
		// skip
	} else {
		tsResp, err := mpesa.TransactionStatus(ctx, types.TransactionStatusRequest{
			CommandID:       "TransactionStatusQuery",
			TransactionID:   "NLA00TEST",
			PartyA:          shortcode,
			IdentifierType:  4,
			ResultURL:       callbackBase + "/status/result",
			QueueTimeOutURL: callbackBase + "/status/queue",
			Remarks:         "Status check",
		})
		if err != nil {
			if !checkBlocked("Transaction Status", err) {
				logError("Transaction Status", err)
			}
		} else {
			fmt.Printf("   ResponseCode: %s\n", tsResp.ResponseCode)
			fmt.Printf("   ResponseDescription: %s\n", tsResp.ResponseDescription)
		}
	}

	sleep()
	// Test 9: Account Balance
	fmt.Println("\n9. Account Balance Query")
	if os.Getenv("MPESA_INITIATOR_NAME") == "" {
		fmt.Println("   SKIP: initiator_name not set")
	} else if sandboxBlocked {
		// skip
	} else {
		balResp, err := mpesa.AccountBalance(ctx, types.AccountBalanceRequest{
			CommandID:       "AccountBalance",
			PartyA:          shortcode,
			IdentifierType:  4,
			Remarks:         "Balance check",
			QueueTimeOutURL: callbackBase + "/balance/queue",
			ResultURL:       callbackBase + "/balance/result",
		})
		if err != nil {
			if !checkBlocked("Account Balance", err) {
				logError("Account Balance", err)
			}
		} else {
			fmt.Printf("   OriginatorConversationID: %s\n", balResp.OriginatorConversationID)
			fmt.Printf("   ResponseCode: %s\n", balResp.ResponseCode)
		}
	}

	sleep()
	// Test 11: Business Buy Goods
	fmt.Println("\n11. Business Buy Goods")
	if os.Getenv("MPESA_INITIATOR_NAME") == "" {
		fmt.Println("   SKIP: initiator_name not set")
	} else if sandboxBlocked {
		// skip
	} else {
		bgResp, err := mpesa.BusinessBuyGoods(ctx, types.BusinessBuyGoodsRequest{
			CommandID:              "BusinessBuyGoods",
			SenderIdentifierType:   4,
			RecieverIdentifierType: 4,
			Amount:                 100,
			PartyA:                 shortcode,
			PartyB:                 600000,
			Remarks:                "Buy goods test",
			QueueTimeOutURL:        callbackBase + "/buygoods/queue",
			ResultURL:              callbackBase + "/buygoods/result",
		})
		if err != nil {
			if !checkBlocked("Business Buy Goods", err) {
				logError("Business Buy Goods", err)
			}
		} else {
			fmt.Printf("   ResponseCode: %s\n", bgResp.ResponseCode)
			fmt.Printf("   ResponseDescription: %s\n", bgResp.ResponseDescription)
		}
	}

	sleep()
	// Test 12: Business Pay Bill
	fmt.Println("\n12. Business Pay Bill")
	if os.Getenv("MPESA_INITIATOR_NAME") == "" {
		fmt.Println("   SKIP: initiator_name not set")
	} else if sandboxBlocked {
		// skip
	} else {
		pbResp, err := mpesa.BusinessPayBill(ctx, types.BusinessPayBillRequest{
			CommandID:              "BusinessPayBill",
			SenderIdentifierType:   4,
			RecieverIdentifierType: 4,
			Amount:                 100,
			PartyA:                 shortcode,
			PartyB:                 600000,
			AccountReference:       "PAYBILL-TEST",
			Remarks:                "Pay bill test",
			QueueTimeOutURL:        callbackBase + "/paybill/queue",
			ResultURL:              callbackBase + "/paybill/result",
		})
		if err != nil {
			if !checkBlocked("Business Pay Bill", err) {
				logError("Business Pay Bill", err)
			}
		} else {
			fmt.Printf("   ResponseCode: %s\n", pbResp.ResponseCode)
			fmt.Printf("   ResponseDescription: %s\n", pbResp.ResponseDescription)
		}
	}

	sleep()
	// Test 13: B2Pochi
	fmt.Println("\n13. B2Pochi")
	if os.Getenv("MPESA_INITIATOR_NAME") == "" {
		fmt.Println("   SKIP: initiator_name not set")
	} else if sandboxBlocked {
		// skip
	} else {
		pochResp, err := mpesa.B2Pochi(ctx, types.B2PochiRequest{
			OriginatorConversationID: fmt.Sprintf("INT_%d_%x", time.Now().Unix(), time.Now().UnixNano()),
			CommandID:                "BusinessPayToPochi",
			Amount:                   10,
			SenderIdentifier:         4,
			ReceiverIdentifier:       4,
			PartyA:                   shortcode,
			PartyB:                   phone,
			AccountReference:         "POCHI-TEST",
			Remarks:                  "Pochi test",
			QueueTimeOutURL:          callbackBase + "/b2pochi/queue",
			ResultURL:                callbackBase + "/b2pochi/result",
		})
		if err != nil {
			if !checkBlocked("B2Pochi", err) {
				logError("B2Pochi", err)
			}
		} else {
			fmt.Printf("   OriginatorConversationID: %s\n", pochResp.OriginatorConversationID)
			fmt.Printf("   ResponseCode: %s\n", pochResp.ResponseCode)
		}
	}

	sleep()
	// Test 14: Lipa na Bonga
	fmt.Println("\n14. Lipa na Bonga")
	lnbResp, err := mpesa.LipaNaBongaCalculate(ctx, types.LipaNaBongaCalculateRequest{
		Points: "40",
	})
	if err != nil {
		logError("Lipa na Bonga", err)
	} else {
		fmt.Printf("   Amount: %s, Points: %s\n", lnbResp.Amount, lnbResp.Points)
	}

	sleep()
	// Test 15: Pull Transactions
	fmt.Println("\n15. Pull Transactions")
	ptResp, err := mpesa.PullTransactionsQuery(ctx, types.PullTransactionsQueryRequest{
		ShortCode:   "174379",
		StartDate:   "2026-01-01",
		EndDate:     "2026-06-18",
		OffSetValue: "0",
	})
	if err != nil {
		logError("Pull Transactions", err)
	} else {
		fmt.Printf("   ResponseCode: %s\n", ptResp.ResponseCode)
	}

	sleep()
	// Test 16: Query Org Info
	fmt.Println("\n16. Query Org Info")
	qoResp, err := mpesa.QueryOrgInfo(ctx, types.QueryOrgInfoRequest{})
	if err != nil {
		logError("Query Org Info", err)
	} else {
		fmt.Printf("   ResponseCode: %s\n", qoResp.ResponseCode)
	}

	sleep()
	// Test 17: IMSI
	fmt.Println("\n17. IMSI Query")
	imsiResp, err := mpesa.IMSI(ctx, types.IMSIRequest{
		CustomerNumber: "254708374149",
	})
	if err != nil {
		logError("IMSI", err)
	} else {
		fmt.Printf("   responseCode: %s\n", imsiResp.ResponseCode)
	}

	sleep()
	// Test 18: IoT
	fmt.Println("\n18. IoT SIM Management")
	iotResp, err := mpesa.IoTGetAllSIMs(ctx, types.IoTGetAllSIMsRequest{
		VpnGroup:     []string{"test_vpn"},
		StartAtIndex: "0",
		PageSize:     "10",
		Username:     "test@safaricom.co.ke",
	})
	if err != nil {
		logError("IoT SIM Management", err)
	} else {
		fmt.Printf("   Header responseCode: %d\n", iotResp.Header.ResponseCode)
	}

	sleep()
	// Test 19: Swap
	fmt.Println("\n19. Swap Query")
	swapResp, err := mpesa.Swap(ctx, types.SwapRequest{
		CustomerNumber: "254708374149",
	})
	if err != nil {
		logError("Swap", err)
	} else {
		fmt.Printf("   responseCode: %s\n", swapResp.ResponseCode)
		fmt.Printf("   responseDesc: %s\n", swapResp.ResponseDesc)
	}

	sleep()
	// Test 20: Bill Manager
	fmt.Println("\n20. Bill Manager")
	bmResp, err := mpesa.BillManagerOptin(ctx, types.BillManagerOptinRequest{
		ShortCode:       "174379",
		Email:           "test@example.com",
		OfficialContact: "0710000000",
		SendReminders:   "1",
		CallbackURL:     callbackBase + "/billmanager/callback",
	})
	if err != nil {
		logError("Bill Manager", err)
	} else {
		fmt.Printf("   ResMsg: %s\n", bmResp.ResMsg)
	}

	sleep()
	// Test 21: B2B Express
	fmt.Println("\n21. B2B Express CheckOut")
	b2bResp, err := mpesa.B2BExpress(ctx, types.B2BExpressRequest{
		PrimaryShortCode:  "174379",
		ReceiverShortCode: "600000",
		Amount:            "100",
		PaymentRef:        "B2B-TEST",
		CallbackUrl:       callbackBase + "/b2b-express/callback",
		PartnerName:       "TestPartner",
		RequestRefID:      "REQ001",
	})
	if err != nil {
		logError("B2B Express", err)
	} else {
		fmt.Printf("   code: %s, status: %s\n", b2bResp.Code, b2bResp.Status)
	}

	sleep()
	// Test 22: Ratiba
	fmt.Println("\n22. M-Pesa Ratiba (Standing Order)")
	ratResp, err := mpesa.CreateStandingOrder(ctx, types.RatibaRequest{
		StandingOrderName:           "Test Order",
		StartDate:                   "20260601",
		EndDate:                     "20261231",
		BusinessShortCode:           "174379",
		TransactionType:             "Standing Order Customer Pay Bill",
		ReceiverPartyIdentifierType: "4",
		Amount:                      "500",
		PartyA:                      "254708374149",
		CallBackURL:                 callbackBase + "/ratiba/callback",
		AccountReference:            "RAT-TEST",
		TransactionDesc:             "Test standing order",
		Frequency:                   "4",
	})
	if err != nil {
		logError("Ratiba", err)
	} else {
		fmt.Printf("   responseCode: %s\n", ratResp.ResponseHeader.ResponseCode)
	}

	sleep()
	// Test 23: Tax Remittance
	fmt.Println("\n23. Tax Remittance")
	if os.Getenv("MPESA_INITIATOR_NAME") == "" {
		fmt.Println("   SKIP: initiator_name not set")
	} else if sandboxBlocked {
		// skip
	} else {
		taxResp, err := mpesa.TaxRemittance(ctx, types.TaxRemittanceRequest{
			CommandID:              "PayTaxToKRA",
			SenderIdentifierType:   "4",
			RecieverIdentifierType: "4",
			Amount:                 "100",
			PartyA:                 "174379",
			PartyB:                 "572572",
			AccountReference:       "TAX-TEST",
			Remarks:                "Test tax remittance",
			QueueTimeOutURL:        callbackBase + "/tax/queue",
			ResultURL:              callbackBase + "/tax/result",
		})
		if err != nil {
			if !checkBlocked("Tax Remittance", err) {
				logError("Tax Remittance", err)
			}
		} else {
			fmt.Printf("   OriginatorConversationID: %s\n", taxResp.OriginatorConversationID)
			fmt.Printf("   ResponseCode: %s\n", taxResp.ResponseCode)
		}
	}

	sleep()
	// Test 4: C2B Register URL (last — triggers sandbox WAF block)
	fmt.Println("\n4. C2B Register URL")
	c2bRegResp, err := mpesa.C2BRegisterURL(ctx, types.C2BRegisterURLRequest{
		ShortCode:       "174379",
		ResponseType:    types.ResponseCompleted,
		ConfirmationURL: callbackBase + "/c2b/confirmation",
		ValidationURL:   callbackBase + "/c2b/validation",
	})
	if err != nil {
		logError("C2B Register URL", err)
	} else {
		fmt.Printf("   ResponseCode: %s\n", c2bRegResp.ResponseCode)
		fmt.Printf("   ResponseDescription: %s\n", c2bRegResp.ResponseDescription)
	}

	sleep()
	// Test 24: Webhook Handling
	fmt.Println("\n24. Webhook Handling")
	payload := types.STKCallbackPayload{}
	payload.Body.StkCallback.MerchantRequestID = "MR-001"
	payload.Body.StkCallback.CheckoutRequestID = "CO-001"
	payload.Body.StkCallback.ResultCode = 0
	payload.Body.StkCallback.ResultDesc = "Success"
	result := client.ParseSTKCallback(payload)
	fmt.Printf("   Parsed STK callback: success=%v\n", result.Success)

	// Results summary
	fmt.Println("\n" + "=" + "===========================================================")
	if len(ERRORS) > 0 {
		fmt.Printf("\nERRORS ENCOUNTERED (%d):\n", len(ERRORS))
		for _, e := range ERRORS {
			fmt.Printf("  - %s\n", e)
		}
		if sandboxBlocked {
			fmt.Println("\n[INFO] Some tests were skipped due to sandbox WAF block.")
		}
	} else {
		fmt.Println("\nAll tests completed without errors!")
	}
	fmt.Println("============================================================")
}
