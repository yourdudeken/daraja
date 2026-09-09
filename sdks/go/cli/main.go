// Command mpesa is a CLI for the M-Pesa Daraja API.
// It mirrors the TypeScript SDK's `mpesa` CLI commands.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/yourdudeken/daraja/sdks/go/client"
	"github.com/yourdudeken/daraja/sdks/go/types"
)

const version = "0.2.0"

type envFlag struct {
	value types.Environment
}

func (e *envFlag) String() string { return string(e.value) }
func (e *envFlag) Set(s string) error {
	switch types.Environment(s) {
	case types.Sandbox, types.Production:
		e.value = types.Environment(s)
		return nil
	default:
		return fmt.Errorf("invalid environment %q (must be sandbox or production)", s)
	}
}

func parseEnv(fs *flag.FlagSet, def string) types.Environment {
	f := &envFlag{value: types.Environment(def)}
	fs.Var(f, "env", "sandbox or production")
	return func() types.Environment { return f.value }()
}

func printJSON(v interface{}) error {
	b, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	fmt.Println(string(b))
	return nil
}

func main() {
	if len(os.Args) < 2 {
		usage()
	}

	var err error
	cmd := os.Args[1]
	rest := os.Args[2:]
	switch cmd {
	case "token":
		err = runToken(rest)
	case "health":
		err = runHealth(rest)
	case "stk-push":
		err = runSTKPush(rest, false)
	case "stk-query":
		err = runSTKPush(rest, true)
	case "transaction-status":
		err = runTransactionStatus(rest)
	case "account-balance":
		err = runAccountBalance(rest)
	case "version":
		fmt.Println(version)
		return
	case "help", "-h", "--help":
		usage()
	default:
		fmt.Fprintf(os.Stderr, "Unknown command %q\n\n", cmd)
		usage()
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "Error:", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Print(`mpesa - M-Pesa Daraja API CLI

Usage:
  mpesa <command> [flags]

Commands:
  token                Generate OAuth access token
  health               Check API health by acquiring a test token
  stk-push             Send STK Push payment request
  stk-query            Query STK Push status
  transaction-status   Query transaction status
  account-balance      Query account balance
  version              Print version

Run "mpesa <command> -h" for command-specific flags.
`)
	os.Exit(0)
}

func newClient(env types.Environment, consumerKey, consumerSecret, passkey, initiator, credential string) *client.Client {
	return client.NewClient(types.MpesaConfig{
		ConsumerKey:        consumerKey,
		ConsumerSecret:     consumerSecret,
		Environment:        env,
		Passkey:            passkey,
		InitiatorName:      initiator,
		SecurityCredential: credential,
		Timeout:            30 * time.Second,
	})
}

func runToken(args []string) error {
	fs := flag.NewFlagSet("token", flag.ExitOnError)
	consumerKey := fs.String("consumer-key", "", "M-Pesa consumer key")
	consumerSecret := fs.String("consumer-secret", "", "M-Pesa consumer secret")
	env := parseEnv(fs, "sandbox")
	fs.Parse(args)

	if *consumerKey == "" || *consumerSecret == "" {
		return fmt.Errorf("--consumer-key and --consumer-secret are required")
	}

	ctx := context.Background()
	cli := newClient(env, *consumerKey, *consumerSecret, "", "", "")
	token, err := cli.GetAccessToken(ctx)
	if err != nil {
		return fmt.Errorf("failed to acquire token: %w", err)
	}
	return printJSON(map[string]interface{}{
		"access_token": token,
		"environment":  env,
	})
}

func runHealth(args []string) error {
	fs := flag.NewFlagSet("health", flag.ExitOnError)
	consumerKey := fs.String("consumer-key", "", "M-Pesa consumer key")
	consumerSecret := fs.String("consumer-secret", "", "M-Pesa consumer secret")
	env := parseEnv(fs, "sandbox")
	fs.Parse(args)

	if *consumerKey == "" || *consumerSecret == "" {
		return fmt.Errorf("--consumer-key and --consumer-secret are required")
	}

	ctx := context.Background()
	start := time.Now()
	cli := newClient(env, *consumerKey, *consumerSecret, "", "", "")
	_, err := cli.GetAccessToken(ctx)
	latency := time.Since(start).Milliseconds()
	result := map[string]interface{}{
		"environment": env,
		"latency_ms":  latency,
		"timestamp":   time.Now().Format(time.RFC3339),
	}
	if err != nil {
		result["status"] = "unhealthy"
		result["error"] = err.Error()
		if perr := printJSON(result); perr != nil {
			return perr
		}
		return err
	}
	result["status"] = "healthy"
	return printJSON(result)
}

func runSTKPush(args []string, query bool) error {
	name := "stk-push"
	if query {
		name = "stk-query"
	}
	fs := flag.NewFlagSet(name, flag.ExitOnError)
	consumerKey := fs.String("consumer-key", "", "M-Pesa consumer key")
	consumerSecret := fs.String("consumer-secret", "", "M-Pesa consumer secret")
	shortcode := fs.Int("shortcode", 0, "Business shortcode")
	passkey := fs.String("passkey", "", "M-Pesa passkey")
	phone := fs.Int("phone", 0, "Customer phone number (2547XXXXXXXX)")
	amount := fs.Int("amount", 0, "Transaction amount")
	checkoutID := fs.String("checkout-id", "", "CheckoutRequestID from STK push")
	env := parseEnv(fs, "sandbox")
	callback := fs.String("callback", "https://example.com/callback", "Callback URL")
	reference := fs.String("reference", "cli-test", "Account reference")
	description := fs.String("description", "CLI payment", "Transaction description")
	fs.Parse(args)

	if *consumerKey == "" || *consumerSecret == "" {
		return fmt.Errorf("--consumer-key and --consumer-secret are required")
	}
	if *shortcode == 0 {
		return fmt.Errorf("--shortcode is required")
	}
	if *passkey == "" {
		return fmt.Errorf("--passkey is required")
	}

	ctx := context.Background()
	cli := newClient(env, *consumerKey, *consumerSecret, *passkey, "", "")

	if query {
		if *checkoutID == "" {
			return fmt.Errorf("--checkout-id is required")
		}
		resp, err := cli.STKQuery(ctx, types.STKQueryRequest{
			BusinessShortCode: fmt.Sprintf("%d", *shortcode),
			CheckoutRequestID: *checkoutID,
		})
		if err != nil {
			return fmt.Errorf("STK Query failed: %w", err)
		}
		return printJSON(resp)
	}

	if *phone == 0 {
		return fmt.Errorf("--phone is required")
	}
	if *amount == 0 {
		return fmt.Errorf("--amount is required")
	}
	resp, err := cli.STKPush(ctx, types.STKPushRequest{
		BusinessShortCode: *shortcode,
		TransactionType:   types.CustomerPayBillOnline,
		Amount:            *amount,
		PartyA:            *phone,
		PartyB:            *shortcode,
		PhoneNumber:       *phone,
		CallBackURL:       *callback,
		AccountReference:  *reference,
		TransactionDesc:   *description,
	})
	if err != nil {
		return fmt.Errorf("STK Push failed: %w", err)
	}
	return printJSON(resp)
}

func runTransactionStatus(args []string) error {
	return runPartyAQuery("transaction-status", false, args)
}

func runAccountBalance(args []string) error {
	return runPartyAQuery("account-balance", true, args)
}

func runPartyAQuery(name string, balance bool, args []string) error {
	fs := flag.NewFlagSet(name, flag.ExitOnError)
	consumerKey := fs.String("consumer-key", "", "M-Pesa consumer key")
	consumerSecret := fs.String("consumer-secret", "", "M-Pesa consumer secret")
	shortcode := fs.Int("shortcode", 0, "Organization shortcode")
	transactionID := fs.String("transaction-id", "", "M-Pesa transaction ID to query")
	initiator := fs.String("initiator", "", "API initiator name")
	credential := fs.String("credential", "", "Security credential")
	env := parseEnv(fs, "sandbox")
	identifierType := fs.Int("identifier-type", 4, "Identifier type (1=MSISDN, 2=Till, 4=Shortcode)")
	timeoutURL := fs.String("timeout", "https://example.com/timeout", "Queue timeout URL")
	resultURL := fs.String("result", "https://example.com/result", "Result URL")
	fs.Parse(args)

	if *consumerKey == "" || *consumerSecret == "" {
		return fmt.Errorf("--consumer-key and --consumer-secret are required")
	}
	if *shortcode == 0 {
		return fmt.Errorf("--shortcode is required")
	}
	if *initiator == "" || *credential == "" {
		return fmt.Errorf("--initiator and --credential are required")
	}
	if !balance && *transactionID == "" {
		return fmt.Errorf("--transaction-id is required")
	}

	ctx := context.Background()
	cli := newClient(env, *consumerKey, *consumerSecret, "", *initiator, *credential)

	if balance {
		resp, err := cli.AccountBalance(ctx, types.AccountBalanceRequest{
			Initiator:          *initiator,
			SecurityCredential: *credential,
			CommandID:          "AccountBalance",
			PartyA:             *shortcode,
			IdentifierType:     *identifierType,
			Remarks:            "CLI balance query",
			QueueTimeOutURL:    *timeoutURL,
			ResultURL:          *resultURL,
		})
		if err != nil {
			return fmt.Errorf("Account balance query failed: %w", err)
		}
		return printJSON(resp)
	}

	resp, err := cli.TransactionStatus(ctx, types.TransactionStatusRequest{
		Initiator:          *initiator,
		SecurityCredential: *credential,
		CommandID:          "TransactionStatusQuery",
		TransactionID:      *transactionID,
		PartyA:             *shortcode,
		IdentifierType:     *identifierType,
		Remarks:            "CLI query",
		QueueTimeOutURL:    *timeoutURL,
		ResultURL:          *resultURL,
	})
	if err != nil {
		return fmt.Errorf("Transaction status query failed: %w", err)
	}
	return printJSON(resp)
}
