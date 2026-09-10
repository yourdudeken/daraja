package main

import (
	"bytes"
	"flag"
	"os"
	"strings"
	"testing"

	"github.com/yourdudeken/daraja/sdks/go/types"
)

func TestEnvFlagSet(t *testing.T) {
	e := &envFlag{}
	if err := e.Set("sandbox"); err != nil {
		t.Fatalf("sandbox should be valid: %v", err)
	}
	if e.value != types.Sandbox {
		t.Errorf("expected sandbox, got %q", e.value)
	}
	if err := e.Set("production"); err != nil {
		t.Fatalf("production should be valid: %v", err)
	}
	if e.value != types.Production {
		t.Errorf("expected production, got %q", e.value)
	}
	if err := e.Set("bogus"); err == nil {
		t.Fatal("expected error for invalid environment")
	}
	if got := e.String(); got != "production" {
		t.Errorf("expected String() production, got %q", got)
	}
}

func TestParseEnv(t *testing.T) {
	fs := flag.NewFlagSet("test", flag.ContinueOnError)
	env := parseEnv(fs, "sandbox")
	if env != types.Sandbox {
		t.Errorf("expected default sandbox, got %q", env)
	}
}

func TestPrintJSON(t *testing.T) {
	old := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	os.Stdout = w

	err = printJSON(map[string]string{"a": "b"})
	w.Close()
	os.Stdout = old

	if err != nil {
		t.Fatalf("printJSON failed: %v", err)
	}
	var buf bytes.Buffer
	if _, err := buf.ReadFrom(r); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(buf.String(), `"a": "b"`) {
		t.Errorf("unexpected output: %s", buf.String())
	}

	// Unmarshalable value -> error.
	if err := printJSON(make(chan int)); err == nil {
		t.Error("expected error for unmarshalable value")
	}
}

func TestRunTokenMissingCredentials(t *testing.T) {
	if err := runToken([]string{}); err == nil {
		t.Fatal("expected error when credentials missing")
	}
}

func TestRunHealthMissingCredentials(t *testing.T) {
	if err := runHealth([]string{}); err == nil {
		t.Fatal("expected error when credentials missing")
	}
}

func TestRunSTKPushValidation(t *testing.T) {
	tests := []struct {
		name  string
		args  []string
		query bool
	}{
		{"missing credentials", []string{}, false},
		{"missing shortcode", []string{"--consumer-key", "k", "--consumer-secret", "s"}, false},
		{"missing passkey", []string{"--consumer-key", "k", "--consumer-secret", "s", "--shortcode", "174379"}, false},
		{"query missing checkout id", []string{
			"--consumer-key", "k", "--consumer-secret", "s", "--shortcode", "174379", "--passkey", "p",
		}, true},
		{"missing phone", []string{
			"--consumer-key", "k", "--consumer-secret", "s", "--shortcode", "174379", "--passkey", "p",
		}, false},
		{"missing amount", []string{
			"--consumer-key", "k", "--consumer-secret", "s", "--shortcode", "174379", "--passkey", "p", "--phone", "254722111111",
		}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := runSTKPush(tt.args, tt.query); err == nil {
				t.Fatal("expected validation error")
			}
		})
	}
}

func TestRunTransactionStatusMissingTransactionID(t *testing.T) {
	err := runTransactionStatus([]string{
		"--consumer-key", "k", "--consumer-secret", "s", "--shortcode", "600984",
		"--initiator", "i", "--credential", "c",
	})
	if err == nil {
		t.Fatal("expected error when transaction-id missing")
	}
}

func TestRunAccountBalanceMissingCredentials(t *testing.T) {
	err := runAccountBalance([]string{
		"--consumer-key", "k", "--consumer-secret", "s", "--shortcode", "600984",
	})
	if err == nil {
		t.Fatal("expected error when initiator/credential missing")
	}
}

func TestMainVersion(t *testing.T) {
	oldArgs := os.Args
	os.Args = []string{"mpesa", "version"}
	defer func() { os.Args = oldArgs }()

	main() // must return without os.Exit for "version"
}

func TestNewClient(t *testing.T) {
	c := newClient(types.Sandbox, "k", "s", "p", "i", "c")
	if c == nil {
		t.Fatal("expected non-nil client")
	}
	cfg := c.GetConfig()
	if cfg.ConsumerKey != "k" || cfg.ConsumerSecret != "s" || cfg.Passkey != "p" ||
		cfg.InitiatorName != "i" || cfg.SecurityCredential != "c" {
		t.Errorf("unexpected config: %+v", cfg)
	}
	if cfg.Environment != types.Sandbox {
		t.Errorf("expected sandbox env, got %q", cfg.Environment)
	}
}