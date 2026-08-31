package client

import (
	"encoding/base64"
	"testing"
)

func TestGenerateTimestamp(t *testing.T) {
	ts := GenerateTimestamp()
	if len(ts) != 14 {
		t.Errorf("expected 14 chars, got %d", len(ts))
	}
}

func TestGeneratePassword(t *testing.T) {
	pwd := GeneratePassword(174379, "passkey123", "20210628092408")
	decoded, err := base64.StdEncoding.DecodeString(pwd)
	if err != nil {
		t.Fatal(err)
	}
	if string(decoded) != "174379passkey12320210628092408" {
		t.Errorf("unexpected password: %s", string(decoded))
	}
}

func TestMaskSensitiveData(t *testing.T) {
	data := map[string]interface{}{
		"consumerKey": "abc12345",
		"Password":    "secret",
		"otherField":  "visible",
	}
	masked := MaskSensitiveData(data)
	if v, ok := masked["consumerKey"].(string); !ok || v != "abc1****" {
		t.Errorf("expected abc1****, got %v", masked["consumerKey"])
	}
	if v, ok := masked["otherField"].(string); !ok || v != "visible" {
		t.Errorf("expected visible, got %v", masked["otherField"])
	}
}

func TestIsPhoneNumberValid(t *testing.T) {
	if !IsPhoneNumberValid("254722000000") {
		t.Error("expected true for valid number")
	}
	if IsPhoneNumberValid("0712345678") {
		t.Error("expected false for invalid number")
	}
}

func TestFormatPhoneNumber(t *testing.T) {
	if got := FormatPhoneNumber("0712345678"); got != "254712345678" {
		t.Errorf("expected 254712345678, got %s", got)
	}
	if got := FormatPhoneNumber("254712345678"); got != "254712345678" {
		t.Errorf("expected 254712345678, got %s", got)
	}
}
