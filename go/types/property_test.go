package types

import (
	"testing"
	"testing/quick"

	"pgregory.net/rapid"
)

func TestPropertyPhoneNumberValidation(t *testing.T) {
	check := func(phone string) bool {
		valid := IsPhoneNumberValid(phone)
		if valid {
			if len(phone) != 12 {
				return false
			}
			if phone[:4] != "2547" {
				return false
			}
		}
		return true
	}
	if err := quick.Check(check, nil); err != nil {
		t.Error(err)
	}
}

func TestPropertyFormatPhoneNumber(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		phone := rapid.StringMatching("^0?7[0-9]{8}$").Draw(t, "phone")
		formatted := FormatPhoneNumber(phone)
		if len(formatted) != 12 {
			t.Fatalf("expected 12 chars, got %d: %s", len(formatted), formatted)
		}
		if formatted[:4] != "2547" {
			t.Fatalf("expected 2547 prefix, got %s", formatted[:4])
		}
	})
}

func TestPropertyMaskSensitiveData(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		raw := rapid.MapOf(
			rapid.SampledFrom([]string{"consumerKey", "Password", "SecurityCredential", "otherField"}),
			rapid.String(),
		).Draw(t, "data")

		data := make(map[string]interface{}, len(raw))
		for k, v := range raw {
			data[k] = v
		}

		masked := MaskSensitiveData(data)
		for _, key := range []string{"consumerKey", "Password", "SecurityCredential"} {
			if v, ok := masked[key]; ok {
				val := v.(string)
				if len(data[key].(string)) > 0 {
					if val[len(val)-4:] != "****" {
						t.Fatalf("expected masked value to end with ****, got %s", val)
					}
				}
			}
		}
	})
}

func TestPropertyIdempotencyKeyDeterministic(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		method := rapid.StringN(1, 5, 10).Draw(t, "method")
		url := rapid.StringN(1, 10, 50).Draw(t, "url")
		body := rapid.MapOf(
			rapid.String(),
			rapid.Int(),
		).Draw(t, "body")

		key1 := GenerateIdempotencyKey(method, url, body)
		key2 := GenerateIdempotencyKey(method, url, body)
		if key1 != key2 {
			t.Fatalf("expected identical keys for same inputs, got %s != %s", key1, key2)
		}
	})
}

func TestPropertyIdempotencyKeyDifferent(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		m1 := rapid.StringN(1, 3, 5).Draw(t, "m1")
		u1 := rapid.StringN(1, 5, 10).Draw(t, "u1")
		m2 := rapid.StringN(1, 3, 5).Draw(t, "m2")
		u2 := rapid.StringN(1, 5, 10).Draw(t, "u2")

		if m1 == m2 && u1 == u2 {
			return
		}
		key1 := GenerateIdempotencyKey(m1, u1, map[string]interface{}{})
		key2 := GenerateIdempotencyKey(m2, u2, map[string]interface{}{})
		if key1 == key2 {
			t.Fatalf("expected different keys for different inputs, got %s", key1)
		}
	})
}

func TestPropertyNormalizeEndpointKey(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		key := rapid.OneOf(
			rapid.StringMatching("^https://[a-z]+\\.[a-z]+/[a-z]+/[a-z]+$"),
			rapid.StringMatching("^[A-Z]+/[A-Z]+/[A-Z]+$"),
		).Draw(t, "key")

		normalized := normalizeEndpointKey(key)
		if len(normalized) == 0 {
			t.Fatal("expected non-empty normalized key")
		}
	})
}
