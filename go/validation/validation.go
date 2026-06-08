package validation

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/yourdudeken/mpesa-sdk/go/errors"
)

var phoneRegex = regexp.MustCompile(`^2547\d{8}$`)

func RequiredString(value string, field string) error {
	if strings.TrimSpace(value) == "" {
		return errors.NewValidationError(fmt.Sprintf("%s is required and must be a non-empty string", field))
	}
	return nil
}

func RequiredInt(value int, field string) error {
	if value == 0 {
		return errors.NewValidationError(fmt.Sprintf("%s is required and must be a non-zero integer", field))
	}
	return nil
}

func PositiveInt(value int, field string) error {
	if value <= 0 {
		return errors.NewValidationError(fmt.Sprintf("%s must be a positive integer", field))
	}
	return nil
}

func ValidURL(value string, field string) error {
	if err := RequiredString(value, field); err != nil {
		return err
	}
	parsed, err := url.Parse(value)
	if err != nil || (parsed.Scheme == "" || parsed.Host == "") {
		return errors.NewValidationError(fmt.Sprintf("%s must be a valid URL", field))
	}
	return nil
}

func PhoneNumber(value int, field string) error {
	if err := RequiredInt(value, field); err != nil {
		return err
	}
	if !phoneRegex.MatchString(fmt.Sprintf("%d", value)) {
		return errors.NewValidationError(fmt.Sprintf("%s must be a valid Safaricom phone number (2547XXXXXXXX)", field))
	}
	return nil
}

func MaxLength(value string, field string, max int) error {
	if err := RequiredString(value, field); err != nil {
		return err
	}
	if len(value) > max {
		return errors.NewValidationError(fmt.Sprintf("%s exceeds maximum length of %d", field, max))
	}
	return nil
}

func OneOf(value string, field string, allowed []string) error {
	for _, a := range allowed {
		if value == a {
			return nil
		}
	}
	return errors.NewValidationError(fmt.Sprintf("%s must be one of: %s", field, strings.Join(allowed, ", ")))
}

func Amount(value int, field string, min, max int) error {
	if err := PositiveInt(value, field); err != nil {
		return err
	}
	if value < min || value > max {
		return errors.NewValidationError(fmt.Sprintf("%s must be between %d and %d", field, min, max))
	}
	return nil
}
