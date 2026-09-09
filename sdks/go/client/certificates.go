package client

import (
	_ "embed"
	"fmt"

	"github.com/yourdudeken/daraja/sdks/go/types"
)

//go:embed certificates/SandboxCertificate.cer
var sandboxCertPEM string

//go:embed certificates/ProductionCertificate.cer
var productionCertPEM string

func GetCertificatePEM(env types.Environment) (string, error) {
	switch env {
	case types.Sandbox:
		return sandboxCertPEM, nil
	case types.Production:
		return productionCertPEM, nil
	default:
		return "", fmt.Errorf("unknown environment: %s", env)
	}
}
