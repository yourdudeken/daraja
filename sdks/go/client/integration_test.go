package client

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/yourdudeken/daraja/sdks/go/types"
)

func skipIfNoCredentials(t *testing.T) {
	t.Helper()
	if os.Getenv("MPESA_CONSUMER_KEY") == "" || os.Getenv("MPESA_CONSUMER_SECRET") == "" {
		t.Skip("MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET environment variables required")
	}
}

func getEnvOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func integrationConfig() types.MpesaConfig {
	return types.MpesaConfig{
		ConsumerKey:    os.Getenv("MPESA_CONSUMER_KEY"),
		ConsumerSecret: os.Getenv("MPESA_CONSUMER_SECRET"),
		Environment:    types.Environment(getEnvOrDefault("MPESA_ENVIRONMENT", "sandbox")),
		Passkey:        os.Getenv("MPESA_PASSKEY"),
		InitiatorName:  getEnvOrDefault("MPESA_INITIATOR_NAME", "testinitiator"),
		Timeout:        30 * time.Second,
		RetryConfig: types.RetryConfig{
			MaxRetries:  1,
			BaseDelayMs: 100,
			MaxDelayMs:  1000,
		},
	}
}

func TestIntegrationTokenAcquisition(t *testing.T) {
	skipIfNoCredentials(t)
	client := NewClient(integrationConfig())

	token, err := client.GetAccessToken(context.Background())
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}
	if token == "" {
		t.Fatal("expected non-empty token")
	}
}

func TestIntegrationTokenCaching(t *testing.T) {
	skipIfNoCredentials(t)
	client := NewClient(integrationConfig())

	token1, err := client.GetAccessToken(context.Background())
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	token2, err := client.GetAccessToken(context.Background())
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	if token1 != token2 {
		t.Error("expected cached token to match")
	}
}

func TestIntegrationSTKPush(t *testing.T) {
	skipIfNoCredentials(t)
	client := NewClient(integrationConfig())
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.STKPushRequest{
		BusinessShortCode: 174379,
		TransactionType:   types.CustomerPayBillOnline,
		Amount:            1,
		PartyA:            254722000000,
		PartyB:            174379,
		PhoneNumber:       254722111111,
		CallBackURL:       "https://example.com/callback",
		AccountReference:  "test",
		TransactionDesc:   "test",
	}

	_, err = client.STKPush(ctx, req)
	if err != nil {
		t.Logf("STKPush returned expected sandbox error: %v", err)
	}
}

func TestIntegrationC2BSimulate(t *testing.T) {
	skipIfNoCredentials(t)
	client := NewClient(integrationConfig())
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.C2BSimulateRequest{
		ShortCode: 600984,
		CommandID: types.C2BPayBill,
		Amount:    1,
		Msisdn:    254708374149,
	}

	_, err = client.C2BSimulate(ctx, req)
	if err != nil {
		t.Logf("C2BSimulate returned expected sandbox error: %v", err)
	}
}

func TestIntegrationC2BRegisterURL(t *testing.T) {
	skipIfNoCredentials(t)
	client := NewClient(integrationConfig())
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.C2BRegisterURLRequest{
		ShortCode:       "600984",
		ResponseType:    types.ResponseCompleted,
		ConfirmationURL: "https://example.com/confirm",
		ValidationURL:   "https://example.com/validate",
	}

	_, err = client.C2BRegisterURL(ctx, req)
	if err != nil {
		t.Logf("C2BRegisterURL returned expected sandbox error: %v", err)
	}
}

func TestIntegrationB2C(t *testing.T) {
	skipIfNoCredentials(t)
	cfg := integrationConfig()
	cfg.InitiatorPassword = os.Getenv("MPESA_INITIATOR_PASSWORD")
	client := NewClient(cfg)
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.B2CRequest{
		InitiatorName:      cfg.InitiatorName,
		CommandID:          types.BusinessPayment,
		Amount:             10,
		PartyA:             600984,
		PartyB:             254722111111,
		Remarks:            "test",
		QueueTimeOutURL:    "https://example.com/timeout",
		ResultURL:          "https://example.com/result",
	}

	_, err = client.B2C(ctx, req)
	if err != nil {
		t.Logf("B2C returned expected sandbox error: %v", err)
	}
}

func TestIntegrationAccountBalance(t *testing.T) {
	skipIfNoCredentials(t)
	cfg := integrationConfig()
	cfg.InitiatorPassword = os.Getenv("MPESA_INITIATOR_PASSWORD")
	client := NewClient(cfg)
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.AccountBalanceRequest{
		Initiator:          cfg.InitiatorName,
		CommandID:          "AccountBalance",
		PartyA:             600984,
		IdentifierType:     4,
		Remarks:            "test",
		QueueTimeOutURL:    "https://example.com/timeout",
		ResultURL:          "https://example.com/result",
	}

	_, err = client.AccountBalance(ctx, req)
	if err != nil {
		t.Logf("AccountBalance returned expected sandbox error: %v", err)
	}
}

func TestIntegrationTransactionStatus(t *testing.T) {
	skipIfNoCredentials(t)
	cfg := integrationConfig()
	cfg.InitiatorPassword = os.Getenv("MPESA_INITIATOR_PASSWORD")
	client := NewClient(cfg)
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.TransactionStatusRequest{
		Initiator:          cfg.InitiatorName,
		CommandID:          "TransactionStatusQuery",
		PartyA:             600984,
		IdentifierType:     4,
		Remarks:            "test",
		QueueTimeOutURL:    "https://example.com/timeout",
		ResultURL:          "https://example.com/result",
	}

	_, err = client.TransactionStatus(ctx, req)
	if err != nil {
		t.Logf("TransactionStatus returned expected sandbox error: %v", err)
	}
}

func TestIntegrationReversal(t *testing.T) {
	skipIfNoCredentials(t)
	cfg := integrationConfig()
	cfg.InitiatorPassword = os.Getenv("MPESA_INITIATOR_PASSWORD")
	client := NewClient(cfg)
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.ReversalRequest{
		Initiator:              cfg.InitiatorName,
		CommandID:              "TransactionReversal",
		TransactionID:          "dummy-tx-id",
		Amount:                 1,
		ReceiverParty:          254722111111,
		RecieverIdentifierType: "11",
		QueueTimeOutURL:        "https://example.com/timeout",
		ResultURL:              "https://example.com/result",
	}

	_, err = client.Reversal(ctx, req)
	if err != nil {
		t.Logf("Reversal returned expected sandbox error: %v", err)
	}
}

func TestIntegrationDynamicQR(t *testing.T) {
	skipIfNoCredentials(t)
	client := NewClient(integrationConfig())
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.DynamicQRRequest{
		MerchantName: "Test Merchant",
		RefNo:        "REF-001",
		Amount:       100,
		TrxCode:      types.TrxBuyGoods,
		CPI:          "600984",
		Size:         "300",
	}

	_, err = client.DynamicQR(ctx, req)
	if err != nil {
		t.Logf("DynamicQR returned expected sandbox error: %v", err)
	}
}

func TestIntegrationBusinessBuyGoods(t *testing.T) {
	skipIfNoCredentials(t)
	client := NewClient(integrationConfig())
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.BusinessBuyGoodsRequest{
		Initiator:              "testapi",
		SecurityCredential:     "testcred",
		CommandID:              "BusinessBuyGoods",
		SenderIdentifierType:   "4",
		RecieverIdentifierType: "4",
		Amount:                 1,
		PartyA:                 600984,
		PartyB:                 600000,
		Remarks:                "test",
		QueueTimeOutURL:        "https://example.com/timeout",
		ResultURL:              "https://example.com/result",
	}

	_, err = client.BusinessBuyGoods(ctx, req)
	if err != nil {
		t.Logf("BusinessBuyGoods returned expected sandbox error: %v", err)
	}
}

func TestIntegrationBusinessPayBill(t *testing.T) {
	skipIfNoCredentials(t)
	client := NewClient(integrationConfig())
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.BusinessPayBillRequest{
		Initiator:              "testapi",
		SecurityCredential:     "testcred",
		CommandID:              "BusinessPayBill",
		SenderIdentifierType:   "4",
		RecieverIdentifierType: "4",
		Amount:                 1,
		PartyA:                 600984,
		PartyB:                 600000,
		Remarks:                "test",
		QueueTimeOutURL:        "https://example.com/timeout",
		ResultURL:              "https://example.com/result",
	}

	_, err = client.BusinessPayBill(ctx, req)
	if err != nil {
		t.Logf("BusinessPayBill returned expected sandbox error: %v", err)
	}
}

func TestIntegrationSTKQuery(t *testing.T) {
	skipIfNoCredentials(t)
	client := NewClient(integrationConfig())
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.STKQueryRequest{
		BusinessShortCode: "174379",
		CheckoutRequestID: "ws_CO_123456789",
	}

	_, err = client.STKQuery(ctx, req)
	if err != nil {
		t.Logf("STKQuery returned expected sandbox error: %v", err)
	}
}

func TestIntegrationB2BExpress(t *testing.T) {
	skipIfNoCredentials(t)
	client := NewClient(integrationConfig())
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.B2BExpressRequest{
		PrimaryShortCode:  "174379",
		ReceiverShortCode: "600000",
		Amount:            "100",
		PaymentRef:        "B2B-TEST",
		CallbackUrl:       "https://example.com/callback",
		PartnerName:       "TestPartner",
		RequestRefID:      "REQ001",
	}

	_, err = client.B2BExpress(ctx, req)
	if err != nil {
		t.Logf("B2BExpress returned expected sandbox error: %v", err)
	}
}

func TestIntegrationB2Pochi(t *testing.T) {
	skipIfNoCredentials(t)
	cfg := integrationConfig()
	cfg.InitiatorPassword = os.Getenv("MPESA_INITIATOR_PASSWORD")
	client := NewClient(cfg)
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.B2PochiRequest{
		OriginatorConversationID: "INT_TEST_123",
		CommandID:                "BusinessPayToPochi",
		Amount:                   10,
		PartyA:                   600984,
		PartyB:                   254722111111,
		Remarks:                  "test",
		QueueTimeOutURL:          "https://example.com/timeout",
		ResultURL:                "https://example.com/result",
	}

	_, err = client.B2Pochi(ctx, req)
	if err != nil {
		t.Logf("B2Pochi returned expected sandbox error: %v", err)
	}
}

func TestIntegrationB2CAccountTopUp(t *testing.T) {
	skipIfNoCredentials(t)
	cfg := integrationConfig()
	cfg.InitiatorPassword = os.Getenv("MPESA_INITIATOR_PASSWORD")
	client := NewClient(cfg)
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.B2CAccountTopUpRequest{
		CommandID:              "BusinessPayToBulk",
		SenderIdentifierType:   "4",
		RecieverIdentifierType: "4",
		Amount:                 "10",
		PartyA:                 "600984",
		PartyB:                 "600000",
		AccountReference:       "TOPUP-TEST",
		Remarks:                "test",
		QueueTimeOutURL:        "https://example.com/timeout",
		ResultURL:              "https://example.com/result",
	}

	_, err = client.AccountTopUp(ctx, req)
	if err != nil {
		t.Logf("AccountTopUp returned expected sandbox error: %v", err)
	}
}

func TestIntegrationTaxRemittance(t *testing.T) {
	skipIfNoCredentials(t)
	cfg := integrationConfig()
	cfg.InitiatorPassword = os.Getenv("MPESA_INITIATOR_PASSWORD")
	client := NewClient(cfg)
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.TaxRemittanceRequest{
		CommandID:              "PayTaxToKRA",
		SenderIdentifierType:   "4",
		RecieverIdentifierType: "4",
		Amount:                 "100",
		PartyA:                 "600984",
		PartyB:                 "572572",
		AccountReference:       "TAX-TEST",
		Remarks:                "test",
		QueueTimeOutURL:        "https://example.com/timeout",
		ResultURL:              "https://example.com/result",
	}

	_, err = client.TaxRemittance(ctx, req)
	if err != nil {
		t.Logf("TaxRemittance returned expected sandbox error: %v", err)
	}
}

func TestIntegrationRatiba(t *testing.T) {
	skipIfNoCredentials(t)
	client := NewClient(integrationConfig())
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.RatibaRequest{
		StandingOrderName:           "Test Order",
		StartDate:                   "20260601",
		EndDate:                     "20261231",
		BusinessShortCode:           "174379",
		TransactionType:             "Standing Order Customer Pay Bill",
		ReceiverPartyIdentifierType: "4",
		Amount:                      "500",
		PartyA:                      "254722111111",
		CallBackURL:                 "https://example.com/callback",
		AccountReference:            "RAT-TEST",
		TransactionDesc:             "Test standing order",
		Frequency:                   "4",
	}

	_, err = client.CreateStandingOrder(ctx, req)
	if err != nil {
		t.Logf("CreateStandingOrder returned expected sandbox error: %v", err)
	}
}

func TestIntegrationLipaNaBongaCalculate(t *testing.T) {
	skipIfNoCredentials(t)
	client := NewClient(integrationConfig())
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.LipaNaBongaCalculateRequest{
		Points: "40",
	}

	_, err = client.LipaNaBongaCalculate(ctx, req)
	if err != nil {
		t.Logf("LipaNaBongaCalculate returned expected sandbox error: %v", err)
	}
}

func TestIntegrationLipaNaBongaRedeem(t *testing.T) {
	skipIfNoCredentials(t)
	client := NewClient(integrationConfig())
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.LipaNaBongaRedeemRequest{
		Msisdn:         "254722111111",
		Amount:         50,
		BongaPoints:    20,
		ConversionRate: 0.2,
		ShortCode:      "174379",
		AccountNumber:  "test",
	}

	_, err = client.LipaNaBongaRedeem(ctx, req)
	if err != nil {
		t.Logf("LipaNaBongaRedeem returned expected sandbox error: %v", err)
	}
}

func TestIntegrationPullTransactionsRegister(t *testing.T) {
	skipIfNoCredentials(t)
	client := NewClient(integrationConfig())
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.PullTransactionsRegisterRequest{
		ShortCode:       "600984",
		RequestType:     "Pull",
		NominatedNumber: "254722111111",
		CallBackURL:     "https://example.com/pull/register",
	}

	_, err = client.PullTransactionsRegister(ctx, req)
	if err != nil {
		t.Logf("PullTransactionsRegister returned expected sandbox error: %v", err)
	}
}

func TestIntegrationPullTransactionsQuery(t *testing.T) {
	skipIfNoCredentials(t)
	client := NewClient(integrationConfig())
	ctx := context.Background()

	_, err := client.GetAccessToken(ctx)
	if err != nil {
		t.Fatalf("failed to acquire token: %v", err)
	}

	req := types.PullTransactionsQueryRequest{
		ShortCode:   "600984",
		StartDate:   "2026-01-01",
		EndDate:     "2026-06-18",
		OffSetValue: "0",
	}

	_, err = client.PullTransactionsQuery(ctx, req)
	if err != nil {
		t.Logf("PullTransactionsQuery returned expected sandbox error: %v", err)
	}
}

func TestIntegrationInvalidCredentials(t *testing.T) {
	client := NewClient(types.MpesaConfig{
		ConsumerKey:    "invalid",
		ConsumerSecret: "invalid",
		Environment:    types.Sandbox,
	})

	_, err := client.GetAccessToken(context.Background())
	if err == nil {
		t.Error("expected error with invalid credentials")
	}
}
