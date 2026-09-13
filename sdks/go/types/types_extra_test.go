package types

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/prometheus/client_golang/prometheus"
)

// ---- InMemorySharedTokenCache ----

func TestInMemorySharedTokenCacheSetGet(t *testing.T) {
	c := NewInMemorySharedTokenCache()
	defer c.Dispose()

	if err := c.Set(context.Background(), "k1", "tok-1", time.Minute); err != nil {
		t.Fatalf("Set failed: %v", err)
	}
	got, err := c.Get(context.Background(), "k1")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if got != "tok-1" {
		t.Errorf("expected tok-1, got %q", got)
	}
}

func TestInMemorySharedTokenCacheMissAndExpiry(t *testing.T) {
	c := NewInMemorySharedTokenCache()
	defer c.Dispose()

	got, err := c.Get(context.Background(), "missing")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if got != "" {
		t.Errorf("expected empty for missing key, got %q", got)
	}

	if err := c.Set(context.Background(), "expired", "tok", -time.Second); err != nil {
		t.Fatalf("Set failed: %v", err)
	}
	got, err = c.Get(context.Background(), "expired")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if got != "" {
		t.Errorf("expected empty for expired key, got %q", got)
	}
}

func TestInMemorySharedTokenCacheCleanup(t *testing.T) {
	c := NewInMemorySharedTokenCache()
	defer c.Dispose()

	_ = c.Set(context.Background(), "old", "tok", -time.Hour)
	_ = c.Set(context.Background(), "fresh", "tok", time.Hour)
	c.cleanup()

	c.mu.RLock()
	_, oldExists := c.cache["old"]
	_, freshExists := c.cache["fresh"]
	c.mu.RUnlock()
	if oldExists {
		t.Error("expected expired entry to be cleaned up")
	}
	if !freshExists {
		t.Error("expected fresh entry to remain")
	}
}

func TestInMemorySharedTokenCacheDispose(t *testing.T) {
	c := NewInMemorySharedTokenCache()
	_ = c.Set(context.Background(), "k", "tok", time.Hour)
	c.Dispose()

	c.mu.RLock()
	_, exists := c.cache["k"]
	c.mu.RUnlock()
	if exists {
		t.Error("expected cache to be emptied after Dispose")
	}
}

// ---- RedisTokenCache ----

type fakeRedisClient struct {
	mu       sync.Mutex
	store    map[string]string
	getErr   error
	setErr   error
	closed   bool
	lastTTL  time.Duration
}

func newFakeRedisClient() *fakeRedisClient {
	return &fakeRedisClient{store: make(map[string]string)}
}

func (f *fakeRedisClient) Get(_ context.Context, key string) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.getErr != nil {
		return "", f.getErr
	}
	return f.store[key], nil
}

func (f *fakeRedisClient) Set(_ context.Context, key string, value interface{}, expiration time.Duration) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.setErr != nil {
		return f.setErr
	}
	f.store[key] = value.(string)
	f.lastTTL = expiration
	return nil
}

func (f *fakeRedisClient) Close() error {
	f.closed = true
	return nil
}

func TestRedisTokenCache(t *testing.T) {
	redis := newFakeRedisClient()
	c := NewRedisTokenCache(redis)

	if err := c.Set(context.Background(), "k", "tok", 30*time.Second); err != nil {
		t.Fatalf("Set failed: %v", err)
	}
	got, err := c.Get(context.Background(), "k")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if got != "tok" {
		t.Errorf("expected tok, got %q", got)
	}
	if redis.lastTTL != 30*time.Second {
		t.Errorf("expected TTL 30s, got %v", redis.lastTTL)
	}
	if err := c.Close(); err != nil {
		t.Fatalf("Close failed: %v", err)
	}
	if !redis.closed {
		t.Error("expected underlying client to be closed")
	}
}

func TestRedisTokenCachePropagatesErrors(t *testing.T) {
	redis := newFakeRedisClient()
	redis.getErr = errors.New("redis down")
	c := NewRedisTokenCache(redis)

	if _, err := c.Get(context.Background(), "k"); err == nil {
		t.Error("expected error from Get to propagate")
	}

	redis.getErr = nil
	redis.setErr = errors.New("redis down")
	if err := c.Set(context.Background(), "k", "tok", time.Minute); err == nil {
		t.Error("expected error from Set to propagate")
	}
}

func TestBuildTokenCacheKey(t *testing.T) {
	if got := BuildTokenCacheKey("ck-123"); got != "mpesa:token:ck-123" {
		t.Errorf("unexpected key: %s", got)
	}
}

// ---- EncryptedTokenStore ----

func TestEncryptedTokenStoreRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "sub", "token.json")
	s := NewEncryptedTokenStore(path, "short-key")

	expires := time.Now().Add(time.Hour).UTC().Truncate(time.Second)
	if err := s.Save("tok-abc", expires); err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	token, gotExpires, err := s.Load()
	if err != nil {
		t.Fatalf("Load failed: %v", err)
	}
	if token != "tok-abc" {
		t.Errorf("expected tok-abc, got %q", token)
	}
	if !gotExpires.Equal(expires) {
		t.Errorf("expected expires %v, got %v", expires, gotExpires)
	}
}

func TestEncryptedTokenStoreLoadMissing(t *testing.T) {
	s := NewEncryptedTokenStore(filepath.Join(t.TempDir(), "nope.json"), "01234567890123456789012345678901")
	if _, _, err := s.Load(); err == nil {
		t.Error("expected error loading missing file")
	}
}

func TestEncryptedTokenStoreClear(t *testing.T) {
	path := filepath.Join(t.TempDir(), "token.json")
	s := NewEncryptedTokenStore(path, "01234567890123456789012345678901")
	if err := s.Save("tok", time.Now().Add(time.Hour)); err != nil {
		t.Fatalf("Save failed: %v", err)
	}
	if err := s.Clear(); err != nil {
		t.Fatalf("Clear failed: %v", err)
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Errorf("expected file to be removed, stat err: %v", err)
	}
}

func TestEncryptedTokenStoreCorruptFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "token.json")
	if err := os.WriteFile(path, []byte("not json"), 0600); err != nil {
		t.Fatal(err)
	}
	s := NewEncryptedTokenStore(path, "01234567890123456789012345678901")
	if _, _, err := s.Load(); err == nil {
		t.Error("expected error loading corrupt file")
	}
}

// ---- CircuitBreaker ----

func TestCircuitBreakerDefaults(t *testing.T) {
	cb := NewCircuitBreaker(CircuitBreakerConfig{})
	if cb.failureThreshold != 5 {
		t.Errorf("expected default failure threshold 5, got %d", cb.failureThreshold)
	}
	if cb.successThreshold != 2 {
		t.Errorf("expected default success threshold 2, got %d", cb.successThreshold)
	}
	if cb.timeout != 30*time.Second {
		t.Errorf("expected default timeout 30s, got %v", cb.timeout)
	}
	if cb.State() != CircuitClosed {
		t.Error("expected initial state closed")
	}
}

func TestCircuitBreakerOpensAfterFailures(t *testing.T) {
	cb := NewCircuitBreaker(CircuitBreakerConfig{FailureThreshold: 2, SuccessThreshold: 1, TimeoutMs: 60000})

	if err := cb.Execute(func() error { return errors.New("boom") }); err == nil {
		t.Fatal("expected error from fn")
	}
	if cb.State() != CircuitClosed {
		t.Error("expected still closed after 1 failure")
	}
	if err := cb.Execute(func() error { return errors.New("boom") }); err == nil {
		t.Fatal("expected error from fn")
	}
	if cb.State() != CircuitOpen {
		t.Error("expected open after threshold failures")
	}
	if err := cb.Execute(func() error { return nil }); !errors.Is(err, ErrCircuitBreakerOpen) {
		t.Errorf("expected ErrCircuitBreakerOpen, got %v", err)
	}
}

func TestCircuitBreakerHalfOpenToClosed(t *testing.T) {
	cb := NewCircuitBreaker(CircuitBreakerConfig{FailureThreshold: 1, SuccessThreshold: 2, TimeoutMs: 60000})
	cb.RecordFailure()
	if cb.State() != CircuitOpen {
		t.Fatal("expected open")
	}

	// Force timeout to have elapsed so State() transitions to half-open.
	cb.mu.Lock()
	cb.lastFailureTime = time.Now().Add(-2 * cb.timeout)
	cb.mu.Unlock()

	if cb.State() != CircuitHalfOpen {
		t.Fatalf("expected half-open, got %s", cb.State())
	}

	cb.RecordSuccess()
	if cb.State() != CircuitHalfOpen {
		t.Fatalf("expected still half-open after 1 success, got %s", cb.State())
	}
	cb.RecordSuccess()
	if cb.State() != CircuitClosed {
		t.Fatalf("expected closed after success threshold, got %s", cb.State())
	}
}

func TestCircuitBreakerExecuteHalfOpenSuccess(t *testing.T) {
	cb := NewCircuitBreaker(CircuitBreakerConfig{FailureThreshold: 1, SuccessThreshold: 1, TimeoutMs: 60000})
	cb.RecordFailure()
	cb.mu.Lock()
	cb.lastFailureTime = time.Now().Add(-2 * cb.timeout)
	cb.mu.Unlock()

	if err := cb.Execute(func() error { return nil }); err != nil {
		t.Fatalf("Execute failed: %v", err)
	}
	if cb.State() != CircuitClosed {
		t.Errorf("expected closed after half-open success, got %s", cb.State())
	}
}

func TestCircuitBreakerReset(t *testing.T) {
	cb := NewCircuitBreaker(CircuitBreakerConfig{FailureThreshold: 1, SuccessThreshold: 1, TimeoutMs: 60000})
	cb.RecordFailure()
	if cb.State() != CircuitOpen {
		t.Fatal("expected open")
	}
	cb.Reset()
	if cb.State() != CircuitClosed {
		t.Error("expected closed after Reset")
	}
	if err := cb.Execute(func() error { return nil }); err != nil {
		t.Errorf("Execute after reset failed: %v", err)
	}
}

func TestCircuitBreakerSuccessResetsFailureCount(t *testing.T) {
	cb := NewCircuitBreaker(CircuitBreakerConfig{FailureThreshold: 3, SuccessThreshold: 1, TimeoutMs: 60000})
	cb.RecordFailure()
	cb.RecordFailure()
	cb.RecordSuccess()
	if cb.failureCount != 0 {
		t.Errorf("expected failure count reset to 0, got %d", cb.failureCount)
	}
}

// ---- Rate limiter ----

func TestTokenBucketRateLimiterDefaults(t *testing.T) {
	rl := NewTokenBucketRateLimiter(RateLimiterConfig{})
	if rl.tokensPerSecond != 5 {
		t.Errorf("expected default 5 tokens/s, got %v", rl.tokensPerSecond)
	}
	if rl.burstSize != 10 {
		t.Errorf("expected default burst 10, got %d", rl.burstSize)
	}
}

func TestTokenBucketRateLimiterTryAcquire(t *testing.T) {
	rl := NewTokenBucketRateLimiter(RateLimiterConfig{TokensPerSecond: 100, BurstSize: 3})
	for i := 0; i < 3; i++ {
		if !rl.TryAcquire("") {
			t.Fatalf("expected acquire %d to succeed", i)
		}
	}
	if rl.TryAcquire("") {
		t.Error("expected acquire to fail when bucket empty")
	}
}

func TestTokenBucketRateLimiterRefills(t *testing.T) {
	rl := NewTokenBucketRateLimiter(RateLimiterConfig{TokensPerSecond: 1000, BurstSize: 1})
	if !rl.TryAcquire("") {
		t.Fatal("expected first acquire to succeed")
	}
	if rl.TryAcquire("") {
		t.Fatal("expected second acquire to fail")
	}
	time.Sleep(5 * time.Millisecond)
	if !rl.TryAcquire("") {
		t.Error("expected acquire to succeed after refill")
	}
}

func TestTokenBucketRateLimiterAcquireBlocks(t *testing.T) {
	rl := NewTokenBucketRateLimiter(RateLimiterConfig{TokensPerSecond: 1000, BurstSize: 1})
	rl.TryAcquire("")
	done := make(chan struct{})
	go func() {
		rl.Acquire("")
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("Acquire did not return after refill")
	}
}

func TestNoopRateLimiter(t *testing.T) {
	var rl RateLimiter = &NoopRateLimiter{}
	rl.Acquire("")
	if !rl.TryAcquire("") {
		t.Error("expected NoopRateLimiter to always allow")
	}
}

func TestEndpointRateLimiterRouter(t *testing.T) {
	r := NewEndpointRateLimiterRouter(RateLimiterConfig{
		TokensPerSecond: 100,
		BurstSize:       10,
		EndpointOverrides: map[string]RateLimiterConfig{
			"https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest": {
				TokensPerSecond: 1,
				BurstSize:       1,
			},
		},
	})

	// Exact override match.
	if !r.TryAcquire("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest") {
		t.Fatal("expected override limiter to allow first acquire")
	}
	if r.TryAcquire("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest") {
		t.Error("expected override limiter to be exhausted")
	}

	// Default limiter for other endpoints.
	if !r.TryAcquire("https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest") {
		t.Error("expected default limiter to allow acquire")
	}
}

func TestEndpointRateLimiterRouterPrefixMatch(t *testing.T) {
	r := NewEndpointRateLimiterRouter(RateLimiterConfig{
		TokensPerSecond: 100,
		BurstSize:       10,
		EndpointOverrides: map[string]RateLimiterConfig{
			"api.safaricom.co.ke/mpesa/stkpush": {
				TokensPerSecond: 1,
				BurstSize:       1,
			},
		},
	})
	if !r.TryAcquire("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest") {
		t.Fatal("expected prefix match to allow first acquire")
	}
	if r.TryAcquire("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest") {
		t.Error("expected prefix-matched limiter to be exhausted")
	}
}

func TestNormalizeEndpointKey(t *testing.T) {
	cases := map[string]string{
		"https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest": "api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
		"http://example.com/path/":                                    "example.com/path",
		"EXAMPLE.COM/PATH":                                            "example.com/path",
	}
	for in, want := range cases {
		if got := normalizeEndpointKey(in); got != want {
			t.Errorf("normalizeEndpointKey(%q) = %q, want %q", in, got, want)
		}
	}
}

// ---- Tracing ----

func TestNoopTracer(t *testing.T) {
	var tr Tracer = &NoopTracer{}
	span := tr.StartSpan("op", map[string]interface{}{"k": "v"})
	span.SetAttribute("a", 1)
	span.AddEvent("ev", map[string]interface{}{"k": "v"})
	span.AddEvent("ev2", nil)
	span.SetStatus("error", "msg")
	span.SetStatus("ok", "")
	span.RecordError(errors.New("boom"))
	span.End()
}

func TestOpenTelemetryTracerDefaults(t *testing.T) {
	tr := NewOpenTelemetryTracer("", "")
	span := tr.StartSpan("op", nil)
	span.End()
}

func TestOpenTelemetryTracerWithAttributes(t *testing.T) {
	tr := NewOpenTelemetryTracer("test-svc", "1.0.0")
	span := tr.StartSpan("op", map[string]interface{}{"http.method": "POST"})
	span.SetAttribute("http.status", 200)
	span.AddEvent("event", map[string]interface{}{"k": "v"})
	span.SetStatus("error", "boom")
	span.RecordError(errors.New("boom"))
	span.End()
}

func TestNewTracer(t *testing.T) {
	tr := NewTracer(NewNoopLogger())
	if tr == nil {
		t.Fatal("expected non-nil tracer")
	}
}

// ---- Metrics ----

func TestNoopMetricsCollector(t *testing.T) {
	var mc MetricsCollector = &NoopMetricsCollector{}
	mc.Increment("requests_total", map[string]string{"op": "x"}, 1)
	mc.Gauge("g", 1.0, nil)
	mc.Timing("t", 100, nil)
	mc.Histogram("h", 1.0, nil)
}

func TestPrometheusMetricsCollector(t *testing.T) {
	pm := NewPrometheusMetricsCollector("")
	defer func() {
		for _, c := range pm.counters {
			prometheus.Unregister(c)
		}
		for _, g := range pm.gauges {
			prometheus.Unregister(g)
		}
		for _, h := range pm.histograms {
			prometheus.Unregister(h)
		}
	}()

	pm.Increment("requests_total", map[string]string{"operation": "stkpush", "environment": "sandbox", "status_code": "200"}, 1)
	pm.Increment("unknown_metric", nil, 1) // no-op
	pm.Gauge("circuit_breaker_state", 1, map[string]string{"service": "mpesa"})
	pm.Gauge("unknown_gauge", 1, nil) // no-op
	pm.Timing("request_duration_seconds", 250, map[string]string{"operation": "stkpush", "environment": "sandbox"})
	pm.Histogram("request_duration_seconds", 0.5, map[string]string{"operation": "stkpush", "environment": "sandbox"})
	pm.Histogram("unknown_histogram", 1, nil) // no-op
}

func TestPrometheusMetricsCollectorCustomPrefix(t *testing.T) {
	pm := NewPrometheusMetricsCollector("custom_")
	defer func() {
		for _, c := range pm.counters {
			prometheus.Unregister(c)
		}
		for _, g := range pm.gauges {
			prometheus.Unregister(g)
		}
		for _, h := range pm.histograms {
			prometheus.Unregister(h)
		}
	}()
	pm.Increment("requests_total", map[string]string{"operation": "op", "environment": "sandbox", "status_code": "200"}, 1)
}

// ---- Audit ----

type recordingLogger struct {
	mu   sync.Mutex
	msgs []string
}

func (r *recordingLogger) log(level, msg string, kv ...interface{}) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.msgs = append(r.msgs, level+": "+msg)
}

func (r *recordingLogger) Debug(msg string, kv ...interface{}) { r.log("DEBUG", msg, kv...) }
func (r *recordingLogger) Info(msg string, kv ...interface{})  { r.log("INFO", msg, kv...) }
func (r *recordingLogger) Warn(msg string, kv ...interface{})  { r.log("WARN", msg, kv...) }
func (r *recordingLogger) Error(msg string, kv ...interface{}) { r.log("ERROR", msg, kv...) }

func (r *recordingLogger) contains(sub string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, m := range r.msgs {
		if strings.Contains(m, sub) {
			return true
		}
	}
	return false
}

func TestAuditLogger(t *testing.T) {
	rl := &recordingLogger{}
	a := NewAuditLogger(rl)

	a.Audit("payment.created", map[string]interface{}{"amount": 100})
	if !rl.contains("[AUDIT] payment.created") {
		t.Error("expected audit event to be logged")
	}

	a.LogRequest("POST", "https://api.example.com", "req-1", 200)
	if !rl.contains("[AUDIT] api_request") {
		t.Error("expected api_request audit event")
	}

	a.LogError("MpesaAPIError", "bad request", "req-2")
	if !rl.contains("[AUDIT] api_error") {
		t.Error("expected api_error audit event")
	}
}

// ---- StructuredLogger ----

func TestStructuredLoggerLevelFiltering(t *testing.T) {
	var buf bytes.Buffer
	l := NewStructuredLogger(LevelWarn, "test-svc")
	l.SetOutput(&buf)

	l.Debug("debug msg")
	l.Info("info msg")
	l.Warn("warn msg", "key", "value")
	l.Error("error msg")

	out := buf.String()
	if strings.Contains(out, "debug msg") || strings.Contains(out, "info msg") {
		t.Error("expected debug/info messages to be filtered out")
	}
	if !strings.Contains(out, `"level":"WARN"`) || !strings.Contains(out, "warn msg") {
		t.Error("expected warn message to be logged")
	}
	if !strings.Contains(out, `"level":"ERROR"`) || !strings.Contains(out, "error msg") {
		t.Error("expected error message to be logged")
	}
	if !strings.Contains(out, `"service":"test-svc"`) {
		t.Error("expected service field")
	}
	if !strings.Contains(out, `"key":"value"`) {
		t.Error("expected metadata key/value")
	}
}

func TestStructuredLoggerSetMinLevel(t *testing.T) {
	var buf bytes.Buffer
	l := NewStructuredLogger(LevelError, "svc")
	l.SetOutput(&buf)
	l.SetMinLevel(LevelDebug)
	l.Debug("now visible")
	if !strings.Contains(buf.String(), "now visible") {
		t.Error("expected debug message after lowering min level")
	}
}

func TestStructuredLoggerOddKeysAndNonStringKeys(t *testing.T) {
	var buf bytes.Buffer
	l := NewStructuredLogger(LevelInfo, "svc")
	l.SetOutput(&buf)
	l.Info("msg", 42, "value", "lonely")
	out := buf.String()
	if !strings.Contains(out, `"42":"value"`) {
		t.Errorf("expected non-string key to be stringified, got %s", out)
	}
	if !strings.Contains(out, `"lonely":null`) {
		t.Errorf("expected odd trailing key to map to null, got %s", out)
	}
}

func TestStructuredLoggerChild(t *testing.T) {
	var buf bytes.Buffer
	l := NewStructuredLogger(LevelInfo, "parent")
	l.SetOutput(&buf)
	child := l.Child("child")
	child.Info("hello")
	if !strings.Contains(buf.String(), `"service":"parent.child"`) {
		t.Errorf("expected child service name, got %s", buf.String())
	}
}

// ---- Idempotency ----

func TestInMemoryIdempotencyStore(t *testing.T) {
	s := NewInMemoryIdempotencyStore()
	defer s.Dispose()

	got, err := s.Get("missing")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if got != nil {
		t.Errorf("expected nil for missing key, got %v", got)
	}

	if err := s.Set("k", []byte("data"), 60000); err != nil {
		t.Fatalf("Set failed: %v", err)
	}
	got, err = s.Get("k")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if string(got.([]byte)) != "data" {
		t.Errorf("expected data, got %v", got)
	}

	if err := s.Set("expired", "v", -1); err != nil {
		t.Fatalf("Set failed: %v", err)
	}
	got, err = s.Get("expired")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if got != nil {
		t.Errorf("expected nil for expired key, got %v", got)
	}
}

func TestInMemoryIdempotencyStoreCleanupAndDispose(t *testing.T) {
	s := NewInMemoryIdempotencyStore()
	_ = s.Set("old", "v", -3600000)
	_ = s.Set("fresh", "v", 3600000)
	s.cleanup()

	s.mu.RLock()
	_, oldExists := s.cache["old"]
	_, freshExists := s.cache["fresh"]
	s.mu.RUnlock()
	if oldExists {
		t.Error("expected expired entry cleaned up")
	}
	if !freshExists {
		t.Error("expected fresh entry to remain")
	}

	s.Dispose()
	s.mu.RLock()
	_, freshExists = s.cache["fresh"]
	s.mu.RUnlock()
	if freshExists {
		t.Error("expected cache emptied after Dispose")
	}
}

func TestGenerateIdempotencyKey(t *testing.T) {
	key := GenerateIdempotencyKey("POST", "https://api.example.com/x", map[string]interface{}{"a": 1})
	if !strings.HasPrefix(key, "mpesa-idem-") {
		t.Errorf("unexpected key prefix: %s", key)
	}
	if key != GenerateIdempotencyKey("POST", "https://api.example.com/x", map[string]interface{}{"a": 1}) {
		t.Error("expected deterministic key")
	}
	keyNil := GenerateIdempotencyKey("GET", "https://api.example.com/x", nil)
	if !strings.HasPrefix(keyNil, "mpesa-idem-") {
		t.Errorf("unexpected key for nil body: %s", keyNil)
	}
}

// ---- types.go unmarshal helpers ----

func TestExpiresInUnmarshalInt(t *testing.T) {
	var e ExpiresIn
	if err := json.Unmarshal([]byte(`3599`), &e); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	if e != 3599 {
		t.Errorf("expected 3599, got %d", e)
	}
}

func TestExpiresInUnmarshalString(t *testing.T) {
	var e ExpiresIn
	if err := json.Unmarshal([]byte(`"3599"`), &e); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	if e != 3599 {
		t.Errorf("expected 3599, got %d", e)
	}
}

func TestExpiresInUnmarshalInvalid(t *testing.T) {
	var e ExpiresIn
	if err := json.Unmarshal([]byte(`"abc"`), &e); err == nil {
		t.Error("expected error for invalid expires_in")
	}
}

func TestC2BResponseUnmarshalTypoKey(t *testing.T) {
	var c C2BResponse
	if err := json.Unmarshal([]byte(`{"OriginatorCoversationID":"doc-key","ResponseCode":"0"}`), &c); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	if c.OriginatorConversationID != "doc-key" {
		t.Errorf("expected doc-key from typo key, got %q", c.OriginatorConversationID)
	}
}

func TestC2BResponseUnmarshalCanonicalKeyWins(t *testing.T) {
	var c C2BResponse
	if err := json.Unmarshal([]byte(`{"OriginatorConversationID":"canon","OriginatorCoversationID":"typo","ResponseCode":"0"}`), &c); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	if c.OriginatorConversationID != "canon" {
		t.Errorf("expected canonical key to win, got %q", c.OriginatorConversationID)
	}
}

func TestC2BResponseUnmarshalInvalid(t *testing.T) {
	var c C2BResponse
	if err := json.Unmarshal([]byte(`{invalid`), &c); err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestPullTransactionsRegisterResponseUnmarshalSpacedKeys(t *testing.T) {
	var r PullTransactionsRegisterResponse
	if err := json.Unmarshal([]byte(`{"ResponseRefID":"r1","Response Status":"1001","ShortCode":"174379","Response Description":"Shortcode already Registered!"}`), &r); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	if r.ResponseStatus != "1001" {
		t.Errorf("expected 1001 from spaced key, got %q", r.ResponseStatus)
	}
	if r.ResponseDescription != "Shortcode already Registered!" {
		t.Errorf("expected description from spaced key, got %q", r.ResponseDescription)
	}
}

func TestPullTransactionsRegisterResponseUnmarshalCanonicalKeysWin(t *testing.T) {
	var r PullTransactionsRegisterResponse
	if err := json.Unmarshal([]byte(`{"ResponseRefID":"r1","ResponseStatus":"1000","Response Status":"1001","ShortCode":"174379","ResponseDescription":"ok","Response Description":"spaced"}`), &r); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	if r.ResponseStatus != "1000" {
		t.Errorf("expected canonical key to win, got %q", r.ResponseStatus)
	}
	if r.ResponseDescription != "ok" {
		t.Errorf("expected canonical description to win, got %q", r.ResponseDescription)
	}
}

// ---- loggers ----

func TestNewNoopLogger(t *testing.T) {
	l := NewNoopLogger()
	l.Debug("d", "k", "v")
	l.Info("i")
	l.Warn("w")
	l.Error("e")
}

func TestNewStdLogger(t *testing.T) {
	var buf bytes.Buffer
	l := NewStdLogger(log.New(&buf, "", 0))
	l.Debug("d", "k", "v")
	l.Info("i")
	l.Warn("w")
	l.Error("e")
	out := buf.String()
	if !strings.Contains(out, "level DEBUG") || !strings.Contains(out, "level ERROR") {
		t.Errorf("expected level markers in output, got %s", out)
	}
}