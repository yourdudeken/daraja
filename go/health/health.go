package health

import (
	"context"
	"encoding/json"
	"net/http"
	"runtime"
	"time"

	"github.com/yourdudeken/mpesa-sdk/go/client"
)

const version = "0.2.0"

type HealthResponse struct {
	Status    string `json:"status"`
	Version   string `json:"version"`
	Timestamp string `json:"timestamp"`
	Uptime    string `json:"uptime,omitempty"`
	GoVersion string `json:"go_version,omitempty"`
	TokenOK   bool   `json:"token_ok"`
}

func Handler(mpesaClient *client.Client, startTime time.Time) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		tokenOK := true
		_, err := mpesaClient.GetAccessToken(ctx)
		if err != nil {
			tokenOK = false
		}

		status := "healthy"
		if !tokenOK {
			status = "degraded"
		}

		resp := HealthResponse{
			Status:    status,
			Version:   version,
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			GoVersion: runtime.Version(),
			TokenOK:   tokenOK,
		}

		if !startTime.IsZero() {
			resp.Uptime = time.Since(startTime).Round(time.Second).String()
		}

		w.Header().Set("Content-Type", "application/json")
		if status != "healthy" {
			w.WriteHeader(http.StatusServiceUnavailable)
		}
		json.NewEncoder(w).Encode(resp)
	}
}
