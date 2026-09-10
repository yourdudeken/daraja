package health

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/yourdudeken/daraja/sdks/go/client"
	"github.com/yourdudeken/daraja/sdks/go/types"
)

func TestHealthHandlerHealthy(t *testing.T) {
	cache := types.NewInMemorySharedTokenCache()
	defer cache.Dispose()
	if err := cache.Set(context.Background(), types.BuildTokenCacheKey("test-key"), "tok-healthy", time.Minute); err != nil {
		t.Fatal(err)
	}

	c := client.NewClient(types.MpesaConfig{
		ConsumerKey:      "test-key",
		ConsumerSecret:   "test-secret",
		Environment:      types.Sandbox,
		SharedTokenCache: cache,
	})

	start := time.Now().Add(-2 * time.Second)
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	Handler(c, start)(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var resp HealthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Status != "healthy" {
		t.Errorf("expected status healthy, got %q", resp.Status)
	}
	if !resp.TokenOK {
		t.Error("expected token_ok true")
	}
	if resp.Version == "" {
		t.Error("expected version to be set")
	}
	if resp.Uptime == "" {
		t.Error("expected uptime to be set when startTime is non-zero")
	}
	if resp.GoVersion == "" {
		t.Error("expected go_version to be set")
	}
}

func TestHealthHandlerDegraded(t *testing.T) {
	// A 1ns timeout guarantees the token request fails deterministically
	// without meaningful network I/O.
	c := client.NewClient(types.MpesaConfig{
		ConsumerKey:    "test-key",
		ConsumerSecret: "test-secret",
		Environment:    types.Sandbox,
		Timeout:        time.Nanosecond,
	})

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	Handler(c, time.Time{})(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", rec.Code)
	}
	var resp HealthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Status != "degraded" {
		t.Errorf("expected status degraded, got %q", resp.Status)
	}
	if resp.TokenOK {
		t.Error("expected token_ok false")
	}
	if resp.Uptime != "" {
		t.Error("expected no uptime when startTime is zero")
	}
}

func TestHealthHandlerSetsContentType(t *testing.T) {
	cache := types.NewInMemorySharedTokenCache()
	defer cache.Dispose()
	_ = cache.Set(context.Background(), types.BuildTokenCacheKey("test-key"), "tok", time.Minute)

	c := client.NewClient(types.MpesaConfig{
		ConsumerKey:      "test-key",
		ConsumerSecret:   "test-secret",
		Environment:      types.Sandbox,
		SharedTokenCache: cache,
	})

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	Handler(c, time.Now())(rec, req)

	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected application/json content type, got %q", ct)
	}
}