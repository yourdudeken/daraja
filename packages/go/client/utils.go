package client

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"math"
	"math/big"
	"regexp"
	"strings"
	"time"

	"github.com/yourdudeken/daraja-sdk/packages/go/types"
)

func GenerateTimestamp() string {
	return time.Now().Format("20060102150405")
}

func GeneratePassword(shortcode interface{}, passkey, timestamp string) string {
	toEncode := fmt.Sprintf("%v%s%s", shortcode, passkey, timestamp)
	return base64.StdEncoding.EncodeToString([]byte(toEncode))
}

func GenerateSecurityCredential(password string, certPEM []byte) (string, error) {
	block, _ := pem.Decode(certPEM)
	if block == nil {
		return "", fmt.Errorf("failed to parse certificate PEM")
	}

	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return "", fmt.Errorf("failed to parse certificate: %w", err)
	}

	rsaPub, ok := cert.PublicKey.(*rsa.PublicKey)
	if !ok {
		return "", fmt.Errorf("certificate does not contain RSA public key")
	}

	base64Password := base64.StdEncoding.EncodeToString([]byte(password))
	encrypted, err := rsa.EncryptPKCS1v15(rand.Reader, rsaPub, []byte(base64Password))
	if err != nil {
		return "", fmt.Errorf("failed to encrypt password: %w", err)
	}

	return base64.StdEncoding.EncodeToString(encrypted), nil
}

func MaskSensitiveData(data map[string]interface{}) map[string]interface{} {
	sensitiveKeys := map[string]bool{
		"consumerKey": true, "consumerSecret": true,
		"Password": true, "SecurityCredential": true,
		"passkey": true, "InitiatorPassword": true,
	}

	masked := make(map[string]interface{}, len(data))
	for k, v := range data {
		if sensitiveKeys[k] {
			s := fmt.Sprintf("%v", v)
			if len(s) > 4 {
				masked[k] = s[:4] + "****"
			} else {
				masked[k] = "****"
			}
		} else {
			masked[k] = v
		}
	}
	return masked
}

func IsPhoneNumberValid(phone string) bool {
	matched, _ := regexp.MatchString(`^2547\d{8}$`, phone)
	return matched
}

func FormatPhoneNumber(phone string) string {
	phone = strings.TrimLeft(phone, "0")
	if strings.HasPrefix(phone, "7") {
		phone = "254" + phone
	} else if strings.HasPrefix(phone, "+254") {
		phone = phone[1:]
	}
	return phone
}

func CalculateBackoff(attempt int, baseDelayMs, maxDelayMs float64) float64 {
	exponential := baseDelayMs * math.Pow(2, float64(attempt))
	n, _ := rand.Int(rand.Reader, big.NewInt(100))
	jitter := float64(n.Int64())
	delay := exponential + jitter
	if delay > maxDelayMs {
		delay = maxDelayMs
	}
	return delay
}

func VerifySignature(payload, signature, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	expected := mac.Sum(nil)
	decodedSig, err := base64.StdEncoding.DecodeString(signature)
	if err != nil {
		return hmac.Equal([]byte(signature), []byte(fmt.Sprintf("%x", expected)))
	}
	return hmac.Equal(decodedSig, expected)
}

// ---- Environment helpers ----
const (
	sandboxBaseURL    = "https://sandbox.safaricom.co.ke"
	productionBaseURL = "https://api.safaricom.co.ke"
)

var endpoints = map[string]string{
	"AUTH":                        "/oauth/v1/generate",
	"STK_PUSH":                    "/mpesa/stkpush/v1/processrequest",
	"STK_QUERY":                   "/mpesa/stkpushquery/v1/query",
	"C2B_REGISTER_URL":            "/mpesa/c2b/v2/registerurl",
	"C2B_SIMULATE":                "/mpesa/c2b/v2/simulate",
	"B2C":                         "/mpesa/b2c/v3/paymentrequest",
	"B2B":                         "/mpesa/b2b/v1/paymentrequest",
	"REVERSAL":                    "/mpesa/reversal/v1/request",
	"TRANSACTION_STATUS":          "/mpesa/transactionstatus/v1/query",
	"ACCOUNT_BALANCE":             "/mpesa/accountbalance/v1/query",
	"DYNAMIC_QR":                  "/mpesa/qrcode/v1/generate",
	"QUERY_ORG_INFO":              "/mpesa/queryorginfo/v1/query",
	"IMSI":                        "/imsi/v1/checkATI",
	"B2POCHI":                     "/mpesa/b2pochi/v1/paymentrequest",
	"LIPA_NA_BONGA_CALCULATE":     "/v1/lipa/na/bonga/calculate-points",
	"LIPA_NA_BONGA_REDEEM":        "/v1/lipa/na/bonga/redeem-paybill",
	"PULL_TRANSACTIONS_REGISTER":  "/pulltransactions/v1/register",
	"PULL_TRANSACTIONS_QUERY":     "/pulltransactions/v1/query",
	"SWAP":                        "/imsi/v2/checkATI",
	"B2B_EXPRESS":                 "/v1/ussdpush/get-msisdn",
	"RATIBA":                      "/standingorder/v1/createStandingOrderExternal",
	"TAX_REMITTANCE":              "/mpesa/b2b/v1/remittax",
	"B2C_ACCOUNT_TOP_UP":          "/mpesa/b2b/v1/paymentrequest",
	"BILL_MANAGER_OPTIN":          "/v1/billmanager-invoice/optin",
	"BILL_MANAGER_SINGLE_INVOICE": "/v1/billmanager-invoice/single-invoicing",
	"BILL_MANAGER_BULK_INVOICE":   "/v1/billmanager-invoice/bulk-invoicing",
	"BILL_MANAGER_RECONCILIATION": "/v1/billmanager-invoice/reconciliation",
	"BILL_MANAGER_CANCEL_SINGLE":  "/v1/billmanager-invoice/cancel-single-invoice",
	"BILL_MANAGER_CANCEL_BULK":    "/v1/billmanager-invoice/cancel-bulk-invoices",
	"BILL_MANAGER_CHANGE_OPTIN":   "/v1/billmanager-invoice/change-optin-details",
	"IOT_ALL_SIMS":                "/simportal/v1/allsims",
	"IOT_QUERY_LIFECYCLE":         "/simportal/v1/queryLifeCycleStatus",
	"IOT_QUERY_CUSTOMER_INFO":     "/simportal/v1/querycustomerinfo",
	"IOT_SIM_ACTIVATION":          "/simportal/v1/simactivation",
	"IOT_ACTIVATION_TRENDS":       "/simportal/v1/getactivationtrends",
	"IOT_RENAME_ASSET":            "/simportal/v1/renameasset",
	"IOT_SUSPEND_UNSUSPEND":       "/simportal/v1/suspend_unsuspend_sub",
	"IOT_SEARCH_MESSAGES":         "/simportal/v1/searchmessages",
	"IOT_FILTER_MESSAGES":         "/simportal/v1/filtermessages",
	"IOT_DELETE_THREAD":           "/simportal/v1/deleteMessageThread",
	"IOT_ALL_MESSAGES":            "/simportal/v1/getallmessages",
	"IOT_SEND_SINGLE_MESSAGE":     "/simportal/v1/sendsinglemessage",
	"IOT_DELETE_MESSAGE":          "/simportal/v1/deletemessage",
}

type environmentEndpoints struct {
	Auth                      string
	STKPush                   string
	STKQuery                  string
	C2BRegisterURL            string
	C2BSimulate               string
	B2C                       string
	B2B                       string
	Reversal                  string
	TransactionStatus         string
	AccountBalance            string
	DynamicQR                 string
	QueryOrgInfo              string
	IMSI                      string
	B2Pochi                   string
	LipaNaBongaCalculate      string
	LipaNaBongaRedeem         string
	PullTransactionsRegister  string
	PullTransactionsQuery     string
	Swap                      string
	B2BExpress                string
	Ratiba                    string
	TaxRemittance             string
	B2CAccountTopUp           string
	BillManagerOptin          string
	BillManagerSingleInvoice  string
	BillManagerBulkInvoice    string
	BillManagerReconciliation string
	BillManagerCancelSingle   string
	BillManagerCancelBulk     string
	BillManagerChangeOptin    string
	IoTAllSIMs                string
	IoTQueryLifeCycle         string
	IoTQueryCustomerInfo      string
	IoTSimActivation          string
	IoTActivationTrends       string
	IoTRenameAsset            string
	IoTSuspendUnsuspend       string
	IoTSearchMessages         string
	IoTFilterMessages         string
	IoTDeleteThread           string
	IoTAllMessages            string
	IoTSendSingleMessage      string
	IoTDeleteMessage          string
}

func getEndpoints(env types.Environment) environmentEndpoints {
	base := sandboxBaseURL
	if env == types.Production {
		base = productionBaseURL
	}

	return environmentEndpoints{
		Auth:                      base + endpoints["AUTH"],
		STKPush:                   base + endpoints["STK_PUSH"],
		STKQuery:                  base + endpoints["STK_QUERY"],
		C2BRegisterURL:            base + endpoints["C2B_REGISTER_URL"],
		C2BSimulate:               base + endpoints["C2B_SIMULATE"],
		B2C:                       base + endpoints["B2C"],
		B2B:                       base + endpoints["B2B"],
		Reversal:                  base + endpoints["REVERSAL"],
		TransactionStatus:         base + endpoints["TRANSACTION_STATUS"],
		AccountBalance:            base + endpoints["ACCOUNT_BALANCE"],
		DynamicQR:                 base + endpoints["DYNAMIC_QR"],
		QueryOrgInfo:              base + endpoints["QUERY_ORG_INFO"],
		IMSI:                      base + endpoints["IMSI"],
		B2Pochi:                   base + endpoints["B2POCHI"],
		LipaNaBongaCalculate:      base + endpoints["LIPA_NA_BONGA_CALCULATE"],
		LipaNaBongaRedeem:         base + endpoints["LIPA_NA_BONGA_REDEEM"],
		PullTransactionsRegister:  base + endpoints["PULL_TRANSACTIONS_REGISTER"],
		PullTransactionsQuery:     base + endpoints["PULL_TRANSACTIONS_QUERY"],
		Swap:                      base + endpoints["SWAP"],
		B2BExpress:                base + endpoints["B2B_EXPRESS"],
		Ratiba:                    base + endpoints["RATIBA"],
		TaxRemittance:             base + endpoints["TAX_REMITTANCE"],
		B2CAccountTopUp:           base + endpoints["B2C_ACCOUNT_TOP_UP"],
		BillManagerOptin:          base + endpoints["BILL_MANAGER_OPTIN"],
		BillManagerSingleInvoice:  base + endpoints["BILL_MANAGER_SINGLE_INVOICE"],
		BillManagerBulkInvoice:    base + endpoints["BILL_MANAGER_BULK_INVOICE"],
		BillManagerReconciliation: base + endpoints["BILL_MANAGER_RECONCILIATION"],
		BillManagerCancelSingle:   base + endpoints["BILL_MANAGER_CANCEL_SINGLE"],
		BillManagerCancelBulk:     base + endpoints["BILL_MANAGER_CANCEL_BULK"],
		BillManagerChangeOptin:    base + endpoints["BILL_MANAGER_CHANGE_OPTIN"],
		IoTAllSIMs:                base + endpoints["IOT_ALL_SIMS"],
		IoTQueryLifeCycle:         base + endpoints["IOT_QUERY_LIFECYCLE"],
		IoTQueryCustomerInfo:      base + endpoints["IOT_QUERY_CUSTOMER_INFO"],
		IoTSimActivation:          base + endpoints["IOT_SIM_ACTIVATION"],
		IoTActivationTrends:       base + endpoints["IOT_ACTIVATION_TRENDS"],
		IoTRenameAsset:            base + endpoints["IOT_RENAME_ASSET"],
		IoTSuspendUnsuspend:       base + endpoints["IOT_SUSPEND_UNSUSPEND"],
		IoTSearchMessages:         base + endpoints["IOT_SEARCH_MESSAGES"],
		IoTFilterMessages:         base + endpoints["IOT_FILTER_MESSAGES"],
		IoTDeleteThread:           base + endpoints["IOT_DELETE_THREAD"],
		IoTAllMessages:            base + endpoints["IOT_ALL_MESSAGES"],
		IoTSendSingleMessage:      base + endpoints["IOT_SEND_SINGLE_MESSAGE"],
		IoTDeleteMessage:          base + endpoints["IOT_DELETE_MESSAGE"],
	}
}
