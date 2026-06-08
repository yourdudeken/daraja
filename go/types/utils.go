package types

import (
	"fmt"
	"regexp"
	"strings"
)

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
