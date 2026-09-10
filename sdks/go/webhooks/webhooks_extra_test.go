package webhooks

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"path/filepath"
	"testing"
	"time"

	"github.com/yourdudeken/daraja/sdks/go/types"
)

func TestManagerRecoversFromHandlerPanic(t *testing.T) {
	m := NewManager(noopLogger{})
	m.On(EventB2CResult, func(EventType, interface{}) {
		panic("handler blew up")
	})

	// Must not panic.
	m.Emit(EventB2CResult, map[string]string{"k": "v"})
}

func TestManagerHandleSTKCallbackInvalidJSON(t *testing.T) {
	m := NewManager(noopLogger{})
	// Must not panic.
	m.HandleSTKCallback(json.RawMessage(`{invalid`))
}

func TestManagerHandleResultCallbackReversal(t *testing.T) {
	m := NewManager(noopLogger{})
	var received EventType
	m.On(EventReversalResult, func(e EventType, _ interface{}) { received = e })

	m.HandleResultCallback(json.RawMessage(`{"Result":{"ResultParameters":{"ResultParameter":[{"Key":"OriginalTransactionID","Value":"AX1234"}]}}}`))
	if received != EventReversalResult {
		t.Errorf("expected reversal:result, got %q", received)
	}
}

func TestManagerHandleResultCallbackNoParamsDefaultsToB2C(t *testing.T) {
	m := NewManager(noopLogger{})
	var received EventType
	m.On(EventB2CResult, func(e EventType, _ interface{}) { received = e })

	m.HandleResultCallback(json.RawMessage(`{"Result":{"ResultCode":0,"ResultDesc":"ok"}}`))
	if received != EventB2CResult {
		t.Errorf("expected b2c:result, got %q", received)
	}
}

func TestManagerHandleResultCallbackInvalidJSON(t *testing.T) {
	m := NewManager(noopLogger{})
	m.HandleResultCallback(json.RawMessage(`{invalid`))
}

func TestManagerLogger(t *testing.T) {
	l := noopLogger{}
	m := NewManager(l)
	if m.Logger() == nil {
		t.Error("expected non-nil logger")
	}
	m2 := NewManager()
	if m2.Logger() == nil {
		t.Error("expected default logger")
	}
}

func TestVerifySignatureValid(t *testing.T) {
	secret := "webhook-secret"
	payload := []byte(`{"Body":{"stkCallback":{"ResultCode":0}}}`)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	sig := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	if !VerifySignature(payload, sig, secret) {
		t.Error("expected signature to verify")
	}
	if VerifySignature(payload, sig, "wrong-secret") {
		t.Error("expected signature to fail with wrong secret")
	}
}

func TestVerifySignatureHexFallback(t *testing.T) {
	secret := "webhook-secret"
	payload := []byte("payload")

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	hexSig := hex.EncodeToString(mac.Sum(nil))

	if !VerifySignature(payload, hexSig, secret) {
		t.Error("expected hex-encoded signature to verify via fallback")
	}
}

func TestVerifySignatureInvalidBase64(t *testing.T) {
	if VerifySignature([]byte("payload"), "!!!not-base64!!!", "secret") {
		t.Error("expected invalid signature to fail")
	}
}

// ---- RetryQueue ----

func TestRetryQueueDefaults(t *testing.T) {
	rq := NewRetryQueue(nil, 0)
	if rq.maxRetries != 3 {
		t.Errorf("expected default maxRetries 3, got %d", rq.maxRetries)
	}
	if rq.logger == nil {
		t.Error("expected default logger")
	}
}

func TestRetryQueueMovesToDLQ(t *testing.T) {
	rq := NewRetryQueue(noopLogger{}, 1)
	rq.Enqueue("b2c:result", map[string]string{"k": "v"})

	deadline := time.Now().Add(2 * time.Second)
	for {
		dlq := rq.GetDeadLetterQueue()
		if len(dlq) == 1 {
			if dlq[0].Event != "b2c:result" {
				t.Errorf("expected event b2c:result, got %q", dlq[0].Event)
			}
			if dlq[0].Attempts != 1 {
				t.Errorf("expected 1 attempt, got %d", dlq[0].Attempts)
			}
			return
		}
		if time.Now().After(deadline) {
			t.Fatal("timed out waiting for record to reach DLQ")
		}
		time.Sleep(10 * time.Millisecond)
	}
}

func TestRetryQueueEmptyDLQ(t *testing.T) {
	rq := NewRetryQueue(noopLogger{}, 3)
	if got := rq.GetDeadLetterQueue(); len(got) != 0 {
		t.Errorf("expected empty DLQ, got %d records", len(got))
	}
}

// ---- PersistentRetryQueue ----

func TestPersistentRetryQueueOptions(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "queue.db")
	rq := NewPersistentRetryQueue(
		NewManager(noopLogger{}),
		WithPersistentDBPath(dbPath),
		WithPersistentLogger(noopLogger{}),
		WithPersistentMaxRetries(1),
	)
	if rq.dbPath != dbPath {
		t.Errorf("expected dbPath %s, got %s", dbPath, rq.dbPath)
	}
	if rq.maxRetries != 1 {
		t.Errorf("expected maxRetries 1, got %d", rq.maxRetries)
	}
}

func TestPersistentRetryQueueInitAndClose(t *testing.T) {
	rq := NewPersistentRetryQueue(
		NewManager(noopLogger{}),
		WithPersistentDBPath(filepath.Join(t.TempDir(), "queue.db")),
	)
	if err := rq.Init(); err != nil {
		t.Fatalf("Init failed: %v", err)
	}
	if err := rq.Close(); err != nil {
		t.Fatalf("Close failed: %v", err)
	}
}

func TestPersistentRetryQueueEnqueueToDLQ(t *testing.T) {
	m := NewManager(noopLogger{})
	rq := NewPersistentRetryQueue(
		m,
		WithPersistentDBPath(filepath.Join(t.TempDir(), "queue.db")),
		WithPersistentMaxRetries(1),
	)
	if err := rq.Init(); err != nil {
		t.Fatalf("Init failed: %v", err)
	}
	defer rq.Close()

	rq.Enqueue("b2c:result", map[string]string{"k": "v"})

	deadline := time.Now().Add(3 * time.Second)
	for {
		dlq := rq.GetDeadLetterQueue()
		if len(dlq) == 1 {
			if dlq[0].Event != "b2c:result" {
				t.Errorf("expected event b2c:result, got %q", dlq[0].Event)
			}
			return
		}
		if time.Now().After(deadline) {
			t.Fatal("timed out waiting for record to reach persistent DLQ")
		}
		time.Sleep(20 * time.Millisecond)
	}
}

func TestPersistentRetryQueueQueueSize(t *testing.T) {
	rq := NewPersistentRetryQueue(
		NewManager(noopLogger{}),
		WithPersistentDBPath(filepath.Join(t.TempDir(), "queue.db")),
	)
	if err := rq.Init(); err != nil {
		t.Fatalf("Init failed: %v", err)
	}
	defer rq.Close()

	if got := rq.GetQueueSize(); got != 0 {
		t.Errorf("expected queue size 0, got %d", got)
	}
}

func TestPersistentRetryQueueEnqueueUnmarshalablePayload(t *testing.T) {
	rq := NewPersistentRetryQueue(
		NewManager(noopLogger{}),
		WithPersistentDBPath(filepath.Join(t.TempDir(), "queue.db")),
	)
	if err := rq.Init(); err != nil {
		t.Fatalf("Init failed: %v", err)
	}
	defer rq.Close()

	// A channel cannot be marshaled to JSON; Enqueue must log and skip.
	rq.Enqueue("b2c:result", make(chan int))
	if got := rq.GetQueueSize(); got != 0 {
		t.Errorf("expected queue size 0 after failed marshal, got %d", got)
	}
}

func TestPersistentRetryQueueDefaultOptions(t *testing.T) {
	rq := NewPersistentRetryQueue(NewManager(noopLogger{}))
	if rq.maxRetries != 3 {
		t.Errorf("expected default maxRetries 3, got %d", rq.maxRetries)
	}
	if rq.dbPath == "" {
		t.Error("expected default db path")
	}
}

func TestPersistentRetryQueueEmitDeliversToManager(t *testing.T) {
	m := NewManager(noopLogger{})
	delivered := make(chan EventType, 1)
	m.On(EventB2CResult, func(e EventType, _ interface{}) {
		delivered <- e
	})

	rq := NewPersistentRetryQueue(
		m,
		WithPersistentDBPath(filepath.Join(t.TempDir(), "queue.db")),
		WithPersistentMaxRetries(1),
	)
	if err := rq.Init(); err != nil {
		t.Fatalf("Init failed: %v", err)
	}
	defer rq.Close()

	rq.Enqueue("b2c:result", map[string]string{"k": "v"})

	select {
	case e := <-delivered:
		if e != EventB2CResult {
			t.Errorf("expected b2c:result, got %q", e)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("timed out waiting for webhook delivery")
	}
}

var _ = types.NewNoopLogger // keep import used if helpers change