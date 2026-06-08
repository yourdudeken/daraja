package webhooks

import (
	"math"
	"sync"
	"time"

	"github.com/yourdudeken/mpesa-sdk/go/types"
)

type DeliveryRecord struct {
	Event     string
	Payload   interface{}
	Attempts  int
	LastError string
}

type RetryQueue struct {
	mu              sync.Mutex
	queue           []*DeliveryRecord
	deadLetterQueue []*DeliveryRecord
	processing      bool
	logger          types.Logger
	maxRetries      int
}

func NewRetryQueue(logger types.Logger, maxRetries int) *RetryQueue {
	if logger == nil {
		logger = types.NewNoopLogger()
	}
	if maxRetries == 0 {
		maxRetries = 3
	}
	return &RetryQueue{
		logger:     logger,
		maxRetries: maxRetries,
	}
}

func (rq *RetryQueue) Enqueue(event string, payload interface{}) {
	rq.mu.Lock()
	rq.queue = append(rq.queue, &DeliveryRecord{Event: event, Payload: payload})
	rq.logger.Warn("Webhook enqueued for retry", "event", event)
	if !rq.processing {
		rq.processing = true
		go rq.processQueue()
	}
	rq.mu.Unlock()
}

func (rq *RetryQueue) processQueue() {
	for {
		rq.mu.Lock()
		if len(rq.queue) == 0 {
			rq.processing = false
			rq.mu.Unlock()
			return
		}
		record := rq.queue[0]
		rq.queue = rq.queue[1:]
		rq.mu.Unlock()

		record.Attempts++
		rq.logger.Info("Retrying webhook delivery",
			"event", record.Event,
			"attempt", record.Attempts,
		)

		if record.Attempts >= rq.maxRetries {
			rq.logger.Error("Webhook delivery failed, moving to DLQ",
				"event", record.Event,
				"attempts", record.Attempts,
			)
			rq.mu.Lock()
			rq.deadLetterQueue = append(rq.deadLetterQueue, record)
			rq.mu.Unlock()
		} else {
			backoff := time.Duration(math.Min(
				float64(1000)*math.Pow(2, float64(record.Attempts-1)),
				30000,
			)) * time.Millisecond
			rq.logger.Warn("Webhook retry failed, re-enqueuing",
				"event", record.Event,
				"attempt", record.Attempts,
				"backoff_ms", backoff.Milliseconds(),
			)
			time.Sleep(backoff)
			rq.mu.Lock()
			rq.queue = append(rq.queue, record)
			rq.mu.Unlock()
		}
	}
}

func (rq *RetryQueue) GetDeadLetterQueue() []*DeliveryRecord {
	rq.mu.Lock()
	defer rq.mu.Unlock()
	result := make([]*DeliveryRecord, len(rq.deadLetterQueue))
	copy(result, rq.deadLetterQueue)
	return result
}
