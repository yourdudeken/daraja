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

	"github.com/yourdudeken/daraja-sdk/go/types"
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

	encrypted, err := rsa.EncryptPKCS1v15(rand.Reader, rsaPub, []byte(password))
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
	"AUTH":                       "/oauth/v1/generate",
	"STK_PUSH":                   "/mpesa/stkpush/v1/processrequest",
	"STK_QUERY":                  "/mpesa/stkpushquery/v1/query",
	"C2B_REGISTER_URL":           "/mpesa/c2b/v2/registerurl",
	"C2B_SIMULATE":               "/mpesa/c2b/v2/simulate",
	"C2B_SIMULATE_V1":            "/mpesa/c2b/v1/simulate",
	"B2C":                        "/mpesa/b2c/v3/paymentrequest",
	"B2B":                        "/mpesa/b2b/v1/paymentrequest",
	"REVERSAL":                   "/mpesa/reversal/v1/request",
	"TRANSACTION_STATUS":         "/mpesa/transactionstatus/v1/query",
	"ACCOUNT_BALANCE":            "/mpesa/accountbalance/v1/query",
	"DYNAMIC_QR":                 "/mpesa/qrcode/v1/generate",
	"QUERY_ORG_INFO":             "/mpesa/queryorginfo/v1/query",
	"IMSI":                       "/mpesa/imsi/v1/query",
	"IOT_MANAGE":                 "/mpesa/iot/v1/manage",
	"B2POCHI":                    "/mpesa/b2pochi/v1/paymentrequest",
	"LIPA_NA_BONGA":              "/mpesa/lipanabonga/v1/redeem",
	"PULL_TRANSACTIONS_REGISTER": "/pulltransactions/v1/register",
	"PULL_TRANSACTIONS_QUERY":    "/pulltransactions/v1/query",
	"SWAP":                       "/imsi/v2/checkATI",
	"BILL_MANAGER":               "/mpesa/billmanager/v1/updatebillreference",
	"B2B_EXPRESS":                "/v1/ussdpush/get-msisdn",
	"RATIBA":                     "/mpesa/ratiba/v1/process",
	"TAX_REMITTANCE":             "/mpesa/taxremittance/v1/remit",
}

type environmentEndpoints struct {
	Auth                     string
	STKPush                  string
	STKQuery                 string
	C2BRegisterURL           string
	C2BSimulate              string
	C2BSimulateV1            string
	B2C                      string
	B2B                      string
	Reversal                 string
	TransactionStatus        string
	AccountBalance           string
	DynamicQR                string
	QueryOrgInfo             string
	IMSI                     string
	IoTManage                string
	B2Pochi                  string
	LipaNaBonga              string
	PullTransactionsRegister string
	PullTransactionsQuery    string
	Swap                     string
	BillManager              string
	B2BExpress               string
	Ratiba                   string
	TaxRemittance            string
}

func getEndpoints(env types.Environment) environmentEndpoints {
	base := sandboxBaseURL
	if env == types.Production {
		base = productionBaseURL
	}

	return environmentEndpoints{
		Auth:                     base + endpoints["AUTH"],
		STKPush:                  base + endpoints["STK_PUSH"],
		STKQuery:                 base + endpoints["STK_QUERY"],
		C2BRegisterURL:           base + endpoints["C2B_REGISTER_URL"],
		C2BSimulate:              base + endpoints["C2B_SIMULATE"],
		C2BSimulateV1:            base + endpoints["C2B_SIMULATE_V1"],
		B2C:                      base + endpoints["B2C"],
		B2B:                      base + endpoints["B2B"],
		Reversal:                 base + endpoints["REVERSAL"],
		TransactionStatus:        base + endpoints["TRANSACTION_STATUS"],
		AccountBalance:           base + endpoints["ACCOUNT_BALANCE"],
		DynamicQR:                base + endpoints["DYNAMIC_QR"],
		QueryOrgInfo:             base + endpoints["QUERY_ORG_INFO"],
		IMSI:                     base + endpoints["IMSI"],
		IoTManage:                base + endpoints["IOT_MANAGE"],
		B2Pochi:                  base + endpoints["B2POCHI"],
		LipaNaBonga:              base + endpoints["LIPA_NA_BONGA"],
		PullTransactionsRegister: base + endpoints["PULL_TRANSACTIONS_REGISTER"],
		PullTransactionsQuery:    base + endpoints["PULL_TRANSACTIONS_QUERY"],
		Swap:                     base + endpoints["SWAP"],
		BillManager:              base + endpoints["BILL_MANAGER"],
		B2BExpress:               base + endpoints["B2B_EXPRESS"],
		Ratiba:                   base + endpoints["RATIBA"],
		TaxRemittance:            base + endpoints["TAX_REMITTANCE"],
	}
}
