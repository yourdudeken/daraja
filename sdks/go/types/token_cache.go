package types

import (
	"context"
	"sync"
	"time"
)

type SharedTokenCache interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, token string, ttl time.Duration) error
}

type inMemoryEntry struct {
	token     string
	expiresAt time.Time
}

type InMemorySharedTokenCache struct {
	mu    sync.RWMutex
	cache map[string]*inMemoryEntry
	done  chan struct{}
}

func NewInMemorySharedTokenCache() *InMemorySharedTokenCache {
	c := &InMemorySharedTokenCache{
		cache: make(map[string]*inMemoryEntry),
		done:  make(chan struct{}),
	}
	go c.cleanupLoop()
	return c
}

func (c *InMemorySharedTokenCache) Get(_ context.Context, key string) (string, error) {
	c.mu.RLock()
	entry, ok := c.cache[key]
	c.mu.RUnlock()
	if !ok {
		return "", nil
	}
	if time.Now().After(entry.expiresAt) {
		c.mu.Lock()
		delete(c.cache, key)
		c.mu.Unlock()
		return "", nil
	}
	return entry.token, nil
}

func (c *InMemorySharedTokenCache) Set(_ context.Context, key string, token string, ttl time.Duration) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cache[key] = &inMemoryEntry{
		token:     token,
		expiresAt: time.Now().Add(ttl),
	}
	return nil
}

func (c *InMemorySharedTokenCache) cleanupLoop() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			c.cleanup()
		case <-c.done:
			return
		}
	}
}

func (c *InMemorySharedTokenCache) cleanup() {
	now := time.Now()
	c.mu.Lock()
	defer c.mu.Unlock()
	for k, v := range c.cache {
		if now.After(v.expiresAt) {
			delete(c.cache, k)
		}
	}
}

func (c *InMemorySharedTokenCache) Dispose() {
	close(c.done)
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cache = make(map[string]*inMemoryEntry)
}

type RedisClient interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error
	Close() error
}

type RedisTokenCache struct {
	client RedisClient
}

func NewRedisTokenCache(client RedisClient) *RedisTokenCache {
	return &RedisTokenCache{client: client}
}

func (c *RedisTokenCache) Get(ctx context.Context, key string) (string, error) {
	return c.client.Get(ctx, key)
}

func (c *RedisTokenCache) Set(ctx context.Context, key string, token string, ttl time.Duration) error {
	return c.client.Set(ctx, key, token, ttl)
}

func (c *RedisTokenCache) Close() error {
	return c.client.Close()
}

func BuildTokenCacheKey(consumerKey string) string {
	return "mpesa:token:" + consumerKey
}
