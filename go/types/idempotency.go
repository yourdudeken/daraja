package types

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sync"
	"time"
)

type IdempotencyStore interface {
	Get(key string) (interface{}, error)
	Set(key string, value interface{}, ttlMs int) error
}

type idempotencyEntry struct {
	data      interface{}
	expiresAt time.Time
}

type InMemoryIdempotencyStore struct {
	mu    sync.RWMutex
	cache map[string]*idempotencyEntry
	done  chan struct{}
}

func NewInMemoryIdempotencyStore() *InMemoryIdempotencyStore {
	s := &InMemoryIdempotencyStore{
		cache: make(map[string]*idempotencyEntry),
		done:  make(chan struct{}),
	}
	go s.cleanupLoop()
	return s
}

func (s *InMemoryIdempotencyStore) Get(key string) (interface{}, error) {
	s.mu.RLock()
	entry, ok := s.cache[key]
	s.mu.RUnlock()
	if !ok {
		return nil, nil
	}
	if time.Now().After(entry.expiresAt) {
		s.mu.Lock()
		delete(s.cache, key)
		s.mu.Unlock()
		return nil, nil
	}
	return entry.data, nil
}

func (s *InMemoryIdempotencyStore) Set(key string, value interface{}, ttlMs int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cache[key] = &idempotencyEntry{
		data:      value,
		expiresAt: time.Now().Add(time.Duration(ttlMs) * time.Millisecond),
	}
	return nil
}

func (s *InMemoryIdempotencyStore) cleanupLoop() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			s.cleanup()
		case <-s.done:
			return
		}
	}
}

func (s *InMemoryIdempotencyStore) cleanup() {
	now := time.Now()
	s.mu.Lock()
	defer s.mu.Unlock()
	for k, v := range s.cache {
		if now.After(v.expiresAt) {
			delete(s.cache, k)
		}
	}
}

func (s *InMemoryIdempotencyStore) Dispose() {
	close(s.done)
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cache = make(map[string]*idempotencyEntry)
}

func GenerateIdempotencyKey(method, url string, body interface{}) string {
	var bodyBytes []byte
	if body != nil {
		bodyBytes, _ = json.Marshal(body)
	}
	h := sha256.Sum256([]byte(method + ":" + url + ":" + string(bodyBytes)))
	return "mpesa-idem-" + hex.EncodeToString(h[:8])
}
