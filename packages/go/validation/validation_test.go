package validation

import "testing"

func TestRequiredString(t *testing.T) {
	if err := RequiredString("hello", "field"); err != nil {
		t.Errorf("expected nil, got %v", err)
	}
	if err := RequiredString("", "field"); err == nil {
		t.Error("expected error for empty string")
	}
	if err := RequiredString("  ", "field"); err == nil {
		t.Error("expected error for whitespace-only string")
	}
}

func TestRequiredInt(t *testing.T) {
	if err := RequiredInt(1, "field"); err != nil {
		t.Errorf("expected nil, got %v", err)
	}
	if err := RequiredInt(0, "field"); err == nil {
		t.Error("expected error for zero")
	}
}

func TestPositiveInt(t *testing.T) {
	if err := PositiveInt(1, "field"); err != nil {
		t.Errorf("expected nil, got %v", err)
	}
	if err := PositiveInt(0, "field"); err == nil {
		t.Error("expected error for zero")
	}
	if err := PositiveInt(-1, "field"); err == nil {
		t.Error("expected error for negative")
	}
}

func TestValidURL(t *testing.T) {
	if err := ValidURL("https://example.com/callback", "field"); err != nil {
		t.Errorf("expected nil, got %v", err)
	}
	if err := ValidURL("not-a-url", "field"); err == nil {
		t.Error("expected error for invalid URL")
	}
	if err := ValidURL("", "field"); err == nil {
		t.Error("expected error for empty URL")
	}
}

func TestPhoneNumber(t *testing.T) {
	if err := PhoneNumber(254712345678, "field"); err != nil {
		t.Errorf("expected nil, got %v", err)
	}
	if err := PhoneNumber(25471234567, "field"); err == nil {
		t.Error("expected error for short phone")
	}
	if err := PhoneNumber(0, "field"); err == nil {
		t.Error("expected error for zero phone")
	}
}

func TestAmount(t *testing.T) {
	if err := Amount(100, "field", 1, 70000); err != nil {
		t.Errorf("expected nil, got %v", err)
	}
	if err := Amount(0, "field", 1, 70000); err == nil {
		t.Error("expected error for zero amount")
	}
	if err := Amount(70001, "field", 1, 70000); err == nil {
		t.Error("expected error for amount above max")
	}
}

func TestMaxLength(t *testing.T) {
	if err := MaxLength("hello", "field", 10); err != nil {
		t.Errorf("expected nil, got %v", err)
	}
	if err := MaxLength("hello world!", "field", 5); err == nil {
		t.Error("expected error for exceeding max length")
	}
}

func TestOneOf(t *testing.T) {
	if err := OneOf("a", "field", []string{"a", "b", "c"}); err != nil {
		t.Errorf("expected nil, got %v", err)
	}
	if err := OneOf("d", "field", []string{"a", "b", "c"}); err == nil {
		t.Error("expected error for invalid value")
	}
}
