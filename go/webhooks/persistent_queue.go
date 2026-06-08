package webhooks

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/yourdudeken/mpesa-sdk/go/types"
	_ "modernc.org/sqlite"
)

type PersistentDeliveryRecord struct {
	ID          int
	Event       string
	Payload     interface{}
	Attempts    int
	LastError   string
	CreatedAt   string
	NextRetryAt string
}

type PersistentRetryQueue struct {
	mu             sync.Mutex
	db             *sql.DB
	webhookManager *Manager
	logger         types.Logger
	maxRetries     int
	dbPath         string
	processing     bool
}

type persistentRow struct {
	ID          int
	Event       string
	Payload     string
	Attempts    int
	LastError   sql.NullString
	MaxRetries  int
	CreatedAt   string
	NextRetryAt string
}

func NewPersistentRetryQueue(webhookManager *Manager, options ...PersistentRetryQueueOption) *PersistentRetryQueue {
	opts := persistentRetryQueueOptions{
		dbPath:     filepath.Join(getDefaultDir(), "mpesa-webhook-queue.db"),
		logger:     types.NewNoopLogger(),
		maxRetries: 3,
	}
	if len(options) > 0 {
		options[0](&opts)
	}
	return &PersistentRetryQueue{
		webhookManager: webhookManager,
		logger:         opts.logger,
		maxRetries:     opts.maxRetries,
		dbPath:         opts.dbPath,
	}
}

type PersistentRetryQueueOption func(*persistentRetryQueueOptions)

type persistentRetryQueueOptions struct {
	dbPath     string
	logger     types.Logger
	maxRetries int
}

func WithPersistentDBPath(path string) PersistentRetryQueueOption {
	return func(o *persistentRetryQueueOptions) { o.dbPath = path }
}

func WithPersistentLogger(logger types.Logger) PersistentRetryQueueOption {
	return func(o *persistentRetryQueueOptions) { o.logger = logger }
}

func WithPersistentMaxRetries(max int) PersistentRetryQueueOption {
	return func(o *persistentRetryQueueOptions) { o.maxRetries = max }
}

func getDefaultDir() string {
	dir, err := os.Getwd()
	if err != nil {
		return "."
	}
	return dir
}

func (rq *PersistentRetryQueue) Init() error {
	rq.mu.Lock()
	defer rq.mu.Unlock()

	if err := os.MkdirAll(filepath.Dir(rq.dbPath), 0755); err != nil {
		return fmt.Errorf("failed to create db directory: %w", err)
	}

	db, err := sql.Open("sqlite", rq.dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		return fmt.Errorf("failed to set WAL mode: %w", err)
	}

	queueTable := `CREATE TABLE IF NOT EXISTS webhook_queue (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		event TEXT NOT NULL,
		payload TEXT NOT NULL,
		attempts INTEGER NOT NULL DEFAULT 0,
		max_retries INTEGER NOT NULL DEFAULT 3,
		last_error TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		next_retry_at TEXT NOT NULL DEFAULT (datetime('now'))
	)`
	if _, err := db.Exec(queueTable); err != nil {
		return fmt.Errorf("failed to create queue table: %w", err)
	}

	dlqTable := `CREATE TABLE IF NOT EXISTS webhook_dlq (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		event TEXT NOT NULL,
		payload TEXT NOT NULL,
		attempts INTEGER NOT NULL DEFAULT 0,
		last_error TEXT,
		created_at TEXT NOT NULL,
		failed_at TEXT NOT NULL DEFAULT (datetime('now'))
	)`
	if _, err := db.Exec(dlqTable); err != nil {
		return fmt.Errorf("failed to create dlq table: %w", err)
	}

	rq.db = db
	rq.logger.Info("Persistent queue initialized", "path", rq.dbPath)
	return nil
}

func (rq *PersistentRetryQueue) Enqueue(event string, payload interface{}) {
	rq.mu.Lock()
	defer rq.mu.Unlock()

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		rq.logger.Error("Failed to marshal payload", "error", err.Error())
		return
	}

	if _, err := rq.db.Exec(
		"INSERT INTO webhook_queue (event, payload, max_retries) VALUES (?, ?, ?)",
		event, string(payloadJSON), rq.maxRetries,
	); err != nil {
		rq.logger.Error("Failed to enqueue webhook", "error", err.Error())
		return
	}

	rq.logger.Warn("Webhook enqueued for retry", "event", event)

	if !rq.processing {
		rq.processing = true
		go rq.processQueue()
	}
}

func (rq *PersistentRetryQueue) processQueue() {
	for {
		rq.mu.Lock()
		row := rq.db.QueryRow(`
			SELECT id, event, payload, attempts, COALESCE(last_error, ''), max_retries, created_at, next_retry_at
			FROM webhook_queue
			WHERE next_retry_at <= datetime('now')
			ORDER BY id ASC
			LIMIT 1
		`)

		var pr persistentRow
		err := row.Scan(&pr.ID, &pr.Event, &pr.Payload, &pr.Attempts, &pr.LastError, &pr.MaxRetries, &pr.CreatedAt, &pr.NextRetryAt)
		if err == sql.ErrNoRows {
			rq.processing = false
			rq.mu.Unlock()
			return
		}
		if err != nil {
			rq.logger.Error("Failed to query queue", "error", err.Error())
			rq.processing = false
			rq.mu.Unlock()
			return
		}

		rq.db.Exec("DELETE FROM webhook_queue WHERE id = ?", pr.ID)
		rq.mu.Unlock()

		newAttempts := pr.Attempts + 1
		var payload interface{}
		json.Unmarshal([]byte(pr.Payload), &payload)

		rq.webhookManager.Emit(EventType(pr.Event), payload)
		rq.logger.Info("Retrying webhook delivery",
			"event", pr.Event,
			"attempt", newAttempts,
		)

		rq.mu.Lock()
		if newAttempts >= rq.maxRetries {
			rq.db.Exec(
				"INSERT INTO webhook_dlq (event, payload, attempts, last_error, created_at) VALUES (?, ?, ?, ?, ?)",
				pr.Event, pr.Payload, newAttempts, pr.LastError.String, pr.CreatedAt,
			)
			rq.logger.Error("Webhook delivery failed, moved to DLQ",
				"event", pr.Event,
				"attempts", newAttempts,
			)
		} else {
			backoffMs := math.Min(
				float64(1000)*math.Pow(2, float64(newAttempts-1)),
				30000,
			)
			nextRetry := time.Now().Add(time.Duration(backoffMs) * time.Millisecond).Format("2006-01-02 15:04:05")
			rq.db.Exec(
				"INSERT INTO webhook_queue (event, payload, attempts, last_error, max_retries, next_retry_at) VALUES (?, ?, ?, ?, ?, ?)",
				pr.Event, pr.Payload, newAttempts, pr.LastError.String, rq.maxRetries, nextRetry,
			)
			rq.logger.Warn("Webhook retry failed, re-enqueued",
				"event", pr.Event,
				"attempt", newAttempts,
				"backoff_ms", backoffMs,
			)
			time.Sleep(time.Duration(backoffMs) * time.Millisecond)
		}
		rq.mu.Unlock()
	}
}

func (rq *PersistentRetryQueue) GetDeadLetterQueue() []PersistentDeliveryRecord {
	rq.mu.Lock()
	defer rq.mu.Unlock()

	rows, err := rq.db.Query("SELECT id, event, payload, attempts, COALESCE(last_error, ''), created_at, next_retry_at FROM webhook_dlq ORDER BY id ASC")
	if err != nil {
		rq.logger.Error("Failed to query DLQ", "error", err.Error())
		return nil
	}
	defer rows.Close()

	var results []PersistentDeliveryRecord
	for rows.Next() {
		var id int
		var event, payload, createdAt, nextRetryAt string
		var attempts int
		var lastError string
		if err := rows.Scan(&id, &event, &payload, &attempts, &lastError, &createdAt, &nextRetryAt); err != nil {
			continue
		}
		var payloadObj interface{}
		json.Unmarshal([]byte(payload), &payloadObj)
		results = append(results, PersistentDeliveryRecord{
			ID:          id,
			Event:       event,
			Payload:     payloadObj,
			Attempts:    attempts,
			LastError:   lastError,
			CreatedAt:   createdAt,
			NextRetryAt: nextRetryAt,
		})
	}
	return results
}

func (rq *PersistentRetryQueue) GetQueueSize() int {
	rq.mu.Lock()
	defer rq.mu.Unlock()

	var count int
	rq.db.QueryRow("SELECT COUNT(*) FROM webhook_queue").Scan(&count)
	return count
}

func (rq *PersistentRetryQueue) Close() error {
	rq.mu.Lock()
	defer rq.mu.Unlock()

	if rq.db != nil {
		return rq.db.Close()
	}
	return nil
}
