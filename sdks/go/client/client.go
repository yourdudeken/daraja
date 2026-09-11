package client

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/yourdudeken/daraja/sdks/go/errors"
	"github.com/yourdudeken/daraja/sdks/go/types"
	"github.com/yourdudeken/daraja/sdks/go/validation"
)

func (c *Client) RotateCredentials(consumerKey, consumerSecret string) {
	c.config.ConsumerKey = consumerKey
	c.config.ConsumerSecret = consumerSecret
	c.tokenManager.Invalidate()
	c.logger.Info("Credentials rotated")
}

func generateRequestID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "mpesa-unknown"
	}
	return "mpesa-" + hex.EncodeToString(b)
}

var retryableStatusCodes = map[int]bool{
	408: true, 429: true,
	500: true, 502: true, 503: true, 504: true,
}

type TokenManager struct {
	mu             sync.RWMutex
	token          string
	expiresAt      time.Time
	endpoint       string
	consumerKey    string
	consumerSecret string
	httpClient     *http.Client
	logger         types.Logger
	sharedCache    types.SharedTokenCache
}

func NewTokenManager(endpoint, consumerKey, consumerSecret string, httpClient *http.Client, logger types.Logger, sharedCache types.SharedTokenCache) *TokenManager {
	return &TokenManager{
		endpoint:       endpoint,
		consumerKey:    consumerKey,
		consumerSecret: consumerSecret,
		httpClient:     httpClient,
		logger:         logger,
		sharedCache:    sharedCache,
	}
}

func (tm *TokenManager) SetAuthEndpoint(endpoint string) {
	tm.mu.Lock()
	defer tm.mu.Unlock()
	tm.endpoint = endpoint
}

func (tm *TokenManager) GetToken(ctx context.Context) (string, error) {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	if tm.token != "" && time.Now().Before(tm.expiresAt) {
		return tm.token, nil
	}

	if tm.sharedCache != nil {
		cacheKey := types.BuildTokenCacheKey(tm.consumerKey)
		cached, err := tm.sharedCache.Get(ctx, cacheKey)
		if err == nil && cached != "" {
			tm.token = cached
			tm.expiresAt = time.Now().Add(5 * time.Minute)
			return cached, nil
		}
	}

	req, err := http.NewRequestWithContext(ctx, "GET", tm.endpoint, nil)
	if err != nil {
		return "", err
	}

	q := req.URL.Query()
	q.Add("grant_type", "client_credentials")
	req.URL.RawQuery = q.Encode()
	req.SetBasicAuth(tm.consumerKey, tm.consumerSecret)

	tm.logger.Debug("Fetching new access token")

	resp, err := tm.httpClient.Do(req)
	if err != nil {
		return "", errors.NewAPIConnectionError("Failed to get access token",
			errors.WithCause(err))
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var tokenResp types.AccessTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", err
	}

	tm.token = tokenResp.AccessToken
	tm.expiresAt = time.Now().Add(time.Duration(tokenResp.ExpiresIn-60) * time.Second)

	if tm.sharedCache != nil {
		cacheKey := types.BuildTokenCacheKey(tm.consumerKey)
		ttl := time.Duration(tokenResp.ExpiresIn-60) * time.Second
		_ = tm.sharedCache.Set(ctx, cacheKey, tm.token, ttl)
	}

	tm.logger.Debug("Access token acquired",
		"expires_in", tokenResp.ExpiresIn,
	)

	return tm.token, nil
}

func (c *Client) GetConfig() types.MpesaConfig {
	return c.config
}

func (c *Client) Logger() types.Logger {
	return c.logger
}

func (c *Client) GetAccessToken(ctx context.Context) (string, error) {
	return c.tokenManager.GetToken(ctx)
}

func (tm *TokenManager) Invalidate() {
	tm.mu.Lock()
	defer tm.mu.Unlock()
	tm.token = ""
	tm.expiresAt = time.Time{}
}

type Client struct {
	config           types.MpesaConfig
	httpClient       *http.Client
	tokenManager     *TokenManager
	endpoints        environmentEndpoints
	logger           types.Logger
	circuitBreaker   *types.CircuitBreaker
	rateLimiter      types.RateLimiter
	tracer           types.Tracer
	idempotencyStore types.IdempotencyStore
}

func NewClient(config types.MpesaConfig) *Client {
	if config.Timeout == 0 {
		config.Timeout = 30 * time.Second
	}
	if config.SecurityCredential == "" && config.InitiatorPassword != "" {
		certPEM, err := GetCertificatePEM(config.Environment)
		if err == nil {
			cred, err := GenerateSecurityCredential(config.InitiatorPassword, []byte(certPEM))
			if err == nil {
				config.SecurityCredential = cred
			}
		}
	}
	if config.RetryConfig.MaxRetries == 0 {
		config.RetryConfig = types.RetryConfig{
			MaxRetries:  3,
			BaseDelayMs: 1000,
			MaxDelayMs:  30000,
		}
	}

	pool := config.ConnectionPoolConfig
	if pool.MaxIdleConns == 0 {
		pool.MaxIdleConns = 100
	}
	if pool.MaxConnsPerHost == 0 {
		pool.MaxConnsPerHost = 50
	}
	if pool.MaxIdleConnsPerHost == 0 {
		pool.MaxIdleConnsPerHost = 10
	}
	if pool.IdleConnTimeoutSec == 0 {
		pool.IdleConnTimeoutSec = 90
	}
	config.ConnectionPoolConfig = pool

	httpClient := &http.Client{
		Timeout: config.Timeout,
		Transport: &http.Transport{
			MaxIdleConns:        pool.MaxIdleConns,
			MaxConnsPerHost:     pool.MaxConnsPerHost,
			MaxIdleConnsPerHost: pool.MaxIdleConnsPerHost,
			IdleConnTimeout:     time.Duration(pool.IdleConnTimeoutSec) * time.Second,
		},
	}

	eps := getEndpoints(config.Environment, config.BaseURL)

	logger := config.Logger
	if logger == nil {
		logger = types.NewNoopLogger()
	}

	logger.Debug("Creating M-Pesa client",
		"environment", config.Environment,
		"timeout", config.Timeout.String(),
		"retry_max", config.RetryConfig.MaxRetries,
	)

	var rl types.RateLimiter
	if len(config.RateLimiterConfig.EndpointOverrides) > 0 {
		rl = types.NewEndpointRateLimiterRouter(config.RateLimiterConfig)
	} else if config.RateLimiterConfig.TokensPerSecond > 0 {
		rl = types.NewTokenBucketRateLimiter(config.RateLimiterConfig)
	} else {
		rl = &types.NoopRateLimiter{}
	}

	tracer := config.Tracer
	if tracer == nil {
		tracer = types.NewTracer(logger)
	}

	idempotencyStore := config.IdempotencyStore
	if idempotencyStore == nil && config.IdempotencyEnabled {
		idempotencyStore = types.NewInMemoryIdempotencyStore()
	}

	var sharedCache types.SharedTokenCache
	if config.SharedTokenCache != nil {
		sharedCache = config.SharedTokenCache
	}

	return &Client{
		config:         config,
		httpClient:     httpClient,
		circuitBreaker: types.NewCircuitBreaker(config.CircuitBreakerConfig),
		rateLimiter:    rl,
		tokenManager: NewTokenManager(
			eps.Auth,
			config.ConsumerKey,
			config.ConsumerSecret,
			httpClient,
			logger,
			sharedCache,
		),
		endpoints:        eps,
		logger:           logger,
		tracer:           tracer,
		idempotencyStore: idempotencyStore,
	}
}

func (c *Client) doRequest(ctx context.Context, method, url string, body interface{}) (respBody []byte, err error) {
	span := c.tracer.StartSpan("mpesa.http."+strings.ToLower(method), map[string]interface{}{
		"http.method": method,
		"http.url":    url,
		"rpc.system":  "mpesa",
	})
	defer func() {
		if err != nil {
			span.SetStatus("error", err.Error())
			span.RecordError(err)
		}
		span.End()
	}()

	requestID := generateRequestID()

	var idempotencyKey string
	if c.idempotencyStore != nil && method == "POST" {
		idempotencyKey = types.GenerateIdempotencyKey(method, url, body)
		if cached, err := c.idempotencyStore.Get(idempotencyKey); err == nil && cached != nil {
			c.logger.Debug("Idempotency cache hit",
				"key", idempotencyKey,
				"url", url,
			)
			if data, ok := cached.([]byte); ok {
				return data, nil
			}
		}
	}

	c.rateLimiter.Acquire(url)

	if c.circuitBreaker.State() == types.CircuitOpen {
		return nil, types.ErrCircuitBreakerOpen
	}

	defer func() {
		if err != nil {
			c.circuitBreaker.RecordFailure()
		} else {
			c.circuitBreaker.RecordSuccess()
		}
	}()

	c.logger.Debug("Sending request",
		"method", method,
		"url", url,
		"request_id", requestID,
	)

	var lastErr error
	for attempt := 0; attempt <= c.config.RetryConfig.MaxRetries; attempt++ {
		if attempt > 0 {
			c.logger.Warn("Retrying request",
				"method", method,
				"url", url,
				"attempt", attempt,
				"max_retries", c.config.RetryConfig.MaxRetries,
				"request_id", requestID,
			)
		}
		token, err := c.tokenManager.GetToken(ctx)
		if err != nil {
			return nil, err
		}

		var reqBodyReader io.Reader
		var bodyData []byte
		if body != nil {
			bodyData, err = json.Marshal(body)
			if err != nil {
				return nil, errors.NewValidationError("Failed to marshal request body",
					errors.WithCause(err))
			}
			reqBodyReader = bytes.NewReader(bodyData)
		}

		req, err := http.NewRequestWithContext(ctx, method, url, reqBodyReader)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		req.Header.Set("X-Request-ID", requestID)
		if idempotencyKey != "" {
			req.Header.Set("X-Idempotency-Key", idempotencyKey)
		}

		if len(bodyData) > 0 {
			req.ContentLength = int64(len(bodyData))
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = errors.NewAPIConnectionError("Request failed",
				errors.WithCause(err),
				errors.WithRequestID(requestID))
			if attempt < c.config.RetryConfig.MaxRetries {
				select {
				case <-ctx.Done():
					return nil, ctx.Err()
				default:
				}
				delay := calculateBackoffDuration(attempt, c.config.RetryConfig)
				time.Sleep(delay)
				continue
			}
			return nil, lastErr
		}

		respBody, err = io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return nil, err
		}

		if retryableStatusCodes[resp.StatusCode] && attempt < c.config.RetryConfig.MaxRetries {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			default:
			}
			var delay time.Duration
			if resp.StatusCode == 429 {
				retryAfter := resp.Header.Get("Retry-After")
				if retryAfter == "0" {
					delay = calculateBackoffDuration(attempt, c.config.RetryConfig)
				} else {
					delay = 5 * time.Second
				}
			} else {
				delay = calculateBackoffDuration(attempt, c.config.RetryConfig)
			}
			c.logger.Warn("Retryable status code, backing off",
				"status", resp.StatusCode,
				"attempt", attempt,
				"delay_ms", delay.Milliseconds(),
				"request_id", requestID,
			)
			time.Sleep(delay)
			continue
		}

		if resp.StatusCode == 401 {
			c.tokenManager.Invalidate()
			c.logger.Error("Authentication failed, token invalidated",
				"status", resp.StatusCode,
				"request_id", requestID,
			)
			return nil, errors.NewAuthenticationError("",
				errors.WithStatusCode(resp.StatusCode),
				errors.WithRequestID(requestID),
				errors.WithRawResponse(string(respBody)))
		}

		if resp.StatusCode == 429 {
			c.logger.Error("Rate limit exceeded",
				"status", resp.StatusCode,
				"request_id", requestID,
			)
			return nil, errors.NewRateLimitError("", 60,
				errors.WithStatusCode(resp.StatusCode),
				errors.WithRequestID(requestID),
				errors.WithRawResponse(string(respBody)))
		}

		if resp.StatusCode >= 400 {
			contentType := resp.Header.Get("Content-Type")
			if !strings.Contains(contentType, "application/json") && !strings.Contains(contentType, "application/problem+json") {
				return nil, fmt.Errorf("expected JSON response, got Content-Type: %q (status %d): %s",
					contentType, resp.StatusCode, string(respBody))
			}

			var errResp struct {
				RequestID    string `json:"requestId"`
				ErrorCode    string `json:"errorCode"`
				ErrorMessage string `json:"errorMessage"`
			}
			json.Unmarshal(respBody, &errResp)
			c.logger.Error("API error response",
				"status", resp.StatusCode,
				"error_code", errResp.ErrorCode,
				"error_message", errResp.ErrorMessage,
				"request_id", requestID,
			)
			return nil, errors.NewMpesaAPIError(errResp.ErrorMessage, errResp.ErrorCode,
				errors.WithStatusCode(resp.StatusCode),
				errors.WithRequestID(errResp.RequestID),
				errors.WithRawResponse(string(respBody)))
		}

		if idempotencyKey != "" {
			c.idempotencyStore.Set(idempotencyKey, respBody, 86400_000)
		}
		c.logger.Debug("Request successful",
			"method", method,
			"url", url,
			"status", resp.StatusCode,
			"request_id", requestID,
		)
		return respBody, nil
	}

	if lastErr != nil {
		return nil, lastErr
	}
	return nil, errors.NewAPIConnectionError("Request failed after retries",
		errors.WithRequestID(requestID))
}

func calculateBackoffDuration(attempt int, config types.RetryConfig) time.Duration {
	exponential := float64(config.BaseDelayMs) * math.Pow(2, float64(attempt))
	if exponential > float64(config.MaxDelayMs) {
		exponential = float64(config.MaxDelayMs)
	}
	return time.Duration(exponential) * time.Millisecond
}

// ---- STK Push ----
func (c *Client) STKPush(ctx context.Context, req types.STKPushRequest) (*types.STKPushResponse, error) {
	if err := validation.PositiveInt(req.Amount, "Amount"); err != nil {
		return nil, err
	}
	if err := validation.PhoneNumber(req.PhoneNumber, "PhoneNumber"); err != nil {
		return nil, err
	}
	if err := validation.ValidURL(req.CallBackURL, "CallBackURL"); err != nil {
		return nil, err
	}
	if err := validation.MaxLength(req.AccountReference, "AccountReference", 12); err != nil {
		return nil, err
	}
	if err := validation.MaxLength(req.TransactionDesc, "TransactionDesc", 13); err != nil {
		return nil, err
	}
	if err := validation.OneOf(string(req.TransactionType), "TransactionType",
		[]string{string(types.CustomerPayBillOnline), string(types.CustomerBuyGoodsOnline)}); err != nil {
		return nil, err
	}

	if req.Password == "" && c.config.Passkey != "" {
		timestamp := req.Timestamp
		if timestamp == "" {
			timestamp = GenerateTimestamp()
		}
		req.Password = GeneratePassword(req.BusinessShortCode, c.config.Passkey, timestamp)
		req.Timestamp = timestamp
	}

	respBody, err := c.doRequest(ctx, "POST", c.endpoints.STKPush, req)
	if err != nil {
		return nil, err
	}

	var resp types.STKPushResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) STKQuery(ctx context.Context, req types.STKQueryRequest) (*types.STKQueryResponse, error) {
	if req.Password == "" && c.config.Passkey != "" {
		timestamp := req.Timestamp
		if timestamp == "" {
			timestamp = GenerateTimestamp()
		}
		req.Password = GeneratePassword(req.BusinessShortCode, c.config.Passkey, timestamp)
		req.Timestamp = timestamp
	}

	respBody, err := c.doRequest(ctx, "POST", c.endpoints.STKQuery, req)
	if err != nil {
		return nil, err
	}

	var resp types.STKQueryResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- C2B ----
func (c *Client) C2BRegisterURL(ctx context.Context, req types.C2BRegisterURLRequest) (*types.C2BResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.C2BRegisterURL, req)
	if err != nil {
		return nil, err
	}

	var resp types.C2BResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) C2BSimulate(ctx context.Context, req types.C2BSimulateRequest) (*types.C2BResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.C2BSimulate, req)
	if err != nil {
		return nil, err
	}

	var resp types.C2BResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- B2C ----
func (c *Client) B2C(ctx context.Context, req types.B2CRequest) (*types.B2CResponse, error) {
	if req.SecurityCredential == "" && c.config.SecurityCredential != "" {
		req.SecurityCredential = c.config.SecurityCredential
	}
	if req.InitiatorName == "" && c.config.InitiatorName != "" {
		req.InitiatorName = c.config.InitiatorName
	}
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.B2C, req)
	if err != nil {
		return nil, err
	}

	var resp types.B2CResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- Reversal ----
func (c *Client) Reversal(ctx context.Context, req types.ReversalRequest) (*types.ReversalResponse, error) {
	if req.SecurityCredential == "" && c.config.SecurityCredential != "" {
		req.SecurityCredential = c.config.SecurityCredential
	}
	if req.Initiator == "" && c.config.InitiatorName != "" {
		req.Initiator = c.config.InitiatorName
	}
	req.CommandID = "TransactionReversal"
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.Reversal, req)
	if err != nil {
		return nil, err
	}

	var resp types.ReversalResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- Transaction Status ----
func (c *Client) TransactionStatus(ctx context.Context, req types.TransactionStatusRequest) (*types.TransactionStatusResponse, error) {
	if req.SecurityCredential == "" && c.config.SecurityCredential != "" {
		req.SecurityCredential = c.config.SecurityCredential
	}
	if req.Initiator == "" && c.config.InitiatorName != "" {
		req.Initiator = c.config.InitiatorName
	}
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.TransactionStatus, req)
	if err != nil {
		return nil, err
	}

	var resp types.TransactionStatusResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- Account Balance ----
func (c *Client) AccountBalance(ctx context.Context, req types.AccountBalanceRequest) (*types.AccountBalanceResponse, error) {
	if req.SecurityCredential == "" && c.config.SecurityCredential != "" {
		req.SecurityCredential = c.config.SecurityCredential
	}
	if req.Initiator == "" && c.config.InitiatorName != "" {
		req.Initiator = c.config.InitiatorName
	}
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.AccountBalance, req)
	if err != nil {
		return nil, err
	}

	var resp types.AccountBalanceResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- Business Buy Goods ----
func (c *Client) BusinessBuyGoods(ctx context.Context, req types.BusinessBuyGoodsRequest) (*types.BusinessGoodsResponse, error) {
	if req.SecurityCredential == "" && c.config.SecurityCredential != "" {
		req.SecurityCredential = c.config.SecurityCredential
	}
	if req.Initiator == "" && c.config.InitiatorName != "" {
		req.Initiator = c.config.InitiatorName
	}
	req.CommandID = "BusinessBuyGoods"
	if req.SenderIdentifierType == "" {
		req.SenderIdentifierType = "4"
	}
	if req.RecieverIdentifierType == "" {
		req.RecieverIdentifierType = "4"
	}
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.B2B, req)
	if err != nil {
		return nil, err
	}

	var resp types.BusinessGoodsResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- Business Pay Bill ----
func (c *Client) BusinessPayBill(ctx context.Context, req types.BusinessPayBillRequest) (*types.BusinessGoodsResponse, error) {
	if req.SecurityCredential == "" && c.config.SecurityCredential != "" {
		req.SecurityCredential = c.config.SecurityCredential
	}
	if req.Initiator == "" && c.config.InitiatorName != "" {
		req.Initiator = c.config.InitiatorName
	}
	req.CommandID = "BusinessPayBill"
	if req.SenderIdentifierType == "" {
		req.SenderIdentifierType = "4"
	}
	if req.RecieverIdentifierType == "" {
		req.RecieverIdentifierType = "4"
	}
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.B2B, req)
	if err != nil {
		return nil, err
	}

	var resp types.BusinessGoodsResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- Query Org Info ----
func (c *Client) QueryOrgInfo(ctx context.Context, req types.QueryOrgInfoRequest) (*types.QueryOrgInfoResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.QueryOrgInfo, req)
	if err != nil {
		return nil, err
	}

	var resp types.QueryOrgInfoResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- IMSI ----
func (c *Client) IMSI(ctx context.Context, req types.IMSIRequest) (*types.IMSIResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.IMSI, req)
	if err != nil {
		return nil, err
	}

	var resp types.IMSIResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- B2C Account Top Up ----
func (c *Client) AccountTopUp(ctx context.Context, req types.B2CAccountTopUpRequest) (*types.B2CAccountTopUpResponse, error) {
	if req.SecurityCredential == "" && c.config.SecurityCredential != "" {
		req.SecurityCredential = c.config.SecurityCredential
	}
	if req.Initiator == "" && c.config.InitiatorName != "" {
		req.Initiator = c.config.InitiatorName
	}
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.B2CAccountTopUp, req)
	if err != nil {
		return nil, err
	}

	var resp types.B2CAccountTopUpResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- IoT SIM Management ----
func (c *Client) IoTGetAllSIMs(ctx context.Context, req types.IoTGetAllSIMsRequest) (*types.IoTGetAllSIMsResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.IoTAllSIMs, req)
	if err != nil {
		return nil, err
	}

	var resp types.IoTGetAllSIMsResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) IoTQueryLifeCycle(ctx context.Context, req types.IoTQueryLifeCycleRequest) (*types.IoTQueryLifeCycleResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.IoTQueryLifeCycle, req)
	if err != nil {
		return nil, err
	}

	var resp types.IoTQueryLifeCycleResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) IoTQueryCustomerInfo(ctx context.Context, req types.IoTQueryCustomerInfoRequest) (*types.IoTQueryCustomerInfoResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.IoTQueryCustomerInfo, req)
	if err != nil {
		return nil, err
	}

	var resp types.IoTQueryCustomerInfoResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) IoTSimActivation(ctx context.Context, req types.IoTSimActivationRequest) (*types.IoTSimActivationResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.IoTSimActivation, req)
	if err != nil {
		return nil, err
	}

	var resp types.IoTSimActivationResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) IoTGetActivationTrends(ctx context.Context, req types.IoTGetActivationTrendsRequest) (*types.IoTGetActivationTrendsResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.IoTActivationTrends, req)
	if err != nil {
		return nil, err
	}

	var resp types.IoTGetActivationTrendsResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) IoTRenameAsset(ctx context.Context, req types.IoTRenameAssetRequest) (*types.IoTRenameAssetResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.IoTRenameAsset, req)
	if err != nil {
		return nil, err
	}

	var resp types.IoTRenameAssetResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) IoTSuspendUnsuspend(ctx context.Context, req types.IoTSuspendUnsuspendRequest) (*types.IoTSuspendUnsuspendResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.IoTSuspendUnsuspend, req)
	if err != nil {
		return nil, err
	}

	var resp types.IoTSuspendUnsuspendResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) IoTSearchMessages(ctx context.Context, req types.IoTSearchMessagesRequest) (*types.IoTSearchMessagesResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.IoTSearchMessages, req)
	if err != nil {
		return nil, err
	}

	var resp types.IoTSearchMessagesResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) IoTFilterMessages(ctx context.Context, req types.IoTFilterMessagesRequest) (*types.IoTFilterMessagesResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.IoTFilterMessages, req)
	if err != nil {
		return nil, err
	}

	var resp types.IoTFilterMessagesResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) IoTDeleteMessageThread(ctx context.Context, req types.IoTDeleteMessageThreadRequest) (*types.IoTDeleteMessageThreadResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.IoTDeleteThread, req)
	if err != nil {
		return nil, err
	}

	var resp types.IoTDeleteMessageThreadResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) IoTGetAllMessages(ctx context.Context, req types.IoTGetAllMessagesRequest) (*types.IoTGetAllMessagesResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.IoTAllMessages, req)
	if err != nil {
		return nil, err
	}

	var resp types.IoTGetAllMessagesResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) IoTSendSingleMessage(ctx context.Context, req types.IoTSendSingleMessageRequest) (*types.IoTSendSingleMessageResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.IoTSendSingleMessage, req)
	if err != nil {
		return nil, err
	}

	var resp types.IoTSendSingleMessageResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) IoTDeleteMessage(ctx context.Context, req types.IoTDeleteMessageRequest) (*types.IoTDeleteMessageResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.IoTDeleteMessage, req)
	if err != nil {
		return nil, err
	}

	var resp types.IoTDeleteMessageResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- B2Pochi ----
func (c *Client) B2Pochi(ctx context.Context, req types.B2PochiRequest) (*types.B2PochiResponse, error) {
	if req.SecurityCredential == "" && c.config.SecurityCredential != "" {
		req.SecurityCredential = c.config.SecurityCredential
	}
	if req.InitiatorName == "" && c.config.InitiatorName != "" {
		req.InitiatorName = c.config.InitiatorName
	}
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.B2Pochi, req)
	if err != nil {
		return nil, err
	}

	var resp types.B2PochiResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- Lipa na Bonga ----
func (c *Client) LipaNaBongaCalculate(ctx context.Context, req types.LipaNaBongaCalculateRequest) (*types.LipaNaBongaCalculateResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.LipaNaBongaCalculate, req)
	if err != nil {
		return nil, err
	}

	var resp types.LipaNaBongaCalculateResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) LipaNaBongaRedeem(ctx context.Context, req types.LipaNaBongaRedeemRequest) (*types.LipaNaBongaRedeemResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.LipaNaBongaRedeem, req)
	if err != nil {
		return nil, err
	}

	var resp types.LipaNaBongaRedeemResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- Pull Transactions ----
func (c *Client) PullTransactionsRegister(ctx context.Context, req types.PullTransactionsRegisterRequest) (*types.PullTransactionsRegisterResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.PullTransactionsRegister, req)
	if err != nil {
		return nil, err
	}

	var resp types.PullTransactionsRegisterResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) PullTransactionsQuery(ctx context.Context, req types.PullTransactionsQueryRequest) (*types.PullTransactionsQueryResponse, error) {
	respBody, err := c.doRequest(ctx, "GET", c.endpoints.PullTransactionsQuery, req)
	if err != nil {
		return nil, err
	}

	var resp types.PullTransactionsQueryResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- Swap ----
func (c *Client) Swap(ctx context.Context, req types.SwapRequest) (*types.SwapResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.Swap, req)
	if err != nil {
		return nil, err
	}

	var resp types.SwapResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- Bill Manager ----
func (c *Client) BillManagerOptin(ctx context.Context, req types.BillManagerOptinRequest) (*types.BillManagerOptinResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.BillManagerOptin, req)
	if err != nil {
		return nil, err
	}

	var resp types.BillManagerOptinResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) BillManagerSingleInvoice(ctx context.Context, req types.BillManagerSingleInvoiceRequest) (*types.BillManagerInvoiceResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.BillManagerSingleInvoice, req)
	if err != nil {
		return nil, err
	}

	var resp types.BillManagerInvoiceResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) BillManagerBulkInvoice(ctx context.Context, req types.BillManagerBulkInvoiceRequest) (*types.BillManagerInvoiceResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.BillManagerBulkInvoice, req)
	if err != nil {
		return nil, err
	}

	var resp types.BillManagerInvoiceResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) BillManagerReconciliation(ctx context.Context, req types.BillManagerReconciliationRequest) (*types.BillManagerReconciliationResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.BillManagerReconciliation, req)
	if err != nil {
		return nil, err
	}

	var resp types.BillManagerReconciliationResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) BillManagerCancelSingle(ctx context.Context, req types.BillManagerCancelSingleRequest) (*types.BillManagerCancelResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.BillManagerCancelSingle, req)
	if err != nil {
		return nil, err
	}

	var resp types.BillManagerCancelResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) BillManagerCancelBulk(ctx context.Context, req types.BillManagerCancelBulkRequest) (*types.BillManagerCancelResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.BillManagerCancelBulk, req)
	if err != nil {
		return nil, err
	}

	var resp types.BillManagerCancelResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) BillManagerChangeOptin(ctx context.Context, req types.BillManagerChangeOptinRequest) (*types.BillManagerChangeOptinResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.BillManagerChangeOptin, req)
	if err != nil {
		return nil, err
	}

	var resp types.BillManagerChangeOptinResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- B2B Express ----
func (c *Client) B2BExpress(ctx context.Context, req types.B2BExpressRequest) (*types.B2BExpressResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.B2BExpress, req)
	if err != nil {
		return nil, err
	}

	var resp types.B2BExpressResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- M-Pesa Ratiba (Standing Order) ----
func (c *Client) CreateStandingOrder(ctx context.Context, req types.RatibaRequest) (*types.RatibaResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.Ratiba, req)
	if err != nil {
		return nil, err
	}

	var resp types.RatibaResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- Tax Remittance ----
func (c *Client) TaxRemittance(ctx context.Context, req types.TaxRemittanceRequest) (*types.TaxRemittanceResponse, error) {
	if req.SecurityCredential == "" && c.config.SecurityCredential != "" {
		req.SecurityCredential = c.config.SecurityCredential
	}
	if req.Initiator == "" && c.config.InitiatorName != "" {
		req.Initiator = c.config.InitiatorName
	}
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.TaxRemittance, req)
	if err != nil {
		return nil, err
	}

	var resp types.TaxRemittanceResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- Dynamic QR ----
func (c *Client) DynamicQR(ctx context.Context, req types.DynamicQRRequest) (*types.DynamicQRResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.DynamicQR, req)
	if err != nil {
		return nil, err
	}

	var resp types.DynamicQRResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- MobileCenter (Mobile Data Bundles) ----
func (c *Client) MobileCenterFetchOffers(ctx context.Context, req types.MobileCenterFetchOffersRequest) (*types.MobileCenterFetchOffersResponse, error) {
	u, err := url.Parse(c.endpoints.MobileCenterFetchOffers)
	if err != nil {
		return nil, err
	}
	q := u.Query()
	q.Set("msisdn", req.Msisdn)
	u.RawQuery = q.Encode()

	respBody, err := c.doRequest(ctx, "GET", u.String(), nil)
	if err != nil {
		return nil, err
	}

	var resp types.MobileCenterFetchOffersResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) MobileCenterPurchase(ctx context.Context, req types.MobileCenterPurchaseRequest) (*types.MobileCenterPurchaseResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.MobileCenterPurchase, req)
	if err != nil {
		return nil, err
	}

	var resp types.MobileCenterPurchaseResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) MobileCenterStatus(ctx context.Context, req types.MobileCenterStatusRequest) (*types.MobileCenterStatusResponse, error) {
	u, err := url.Parse(c.endpoints.MobileCenterStatus)
	if err != nil {
		return nil, err
	}
	q := u.Query()
	q.Set("id", req.ID)
	q.Set("serviceAccountId", req.ServiceAccountID)
	u.RawQuery = q.Encode()

	respBody, err := c.doRequest(ctx, "GET", u.String(), nil)
	if err != nil {
		return nil, err
	}

	var resp types.MobileCenterStatusResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- Age On Network ----
func (c *Client) AgeOnNetwork(ctx context.Context, req types.AgeOnNetworkRequest) (*types.AgeOnNetworkResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.AgeOnNetwork, req)
	if err != nil {
		return nil, err
	}

	var resp types.AgeOnNetworkResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- Mobile Number Validation ----
func (c *Client) MobileNumberValidation(ctx context.Context, req types.MobileNumberValidationRequest) (*types.MobileNumberValidationResponse, error) {
	respBody, err := c.doRequest(ctx, "POST", c.endpoints.MobileNumberValidation, req)
	if err != nil {
		return nil, err
	}

	var resp types.MobileNumberValidationResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// ---- Callback Parsing ----
func ParseSTKCallback(payload types.STKCallbackPayload) types.STKCallbackResult {
	cb := payload.Body.StkCallback
	result := types.STKCallbackResult{
		Success:           cb.ResultCode == 0,
		MerchantRequestID: cb.MerchantRequestID,
		CheckoutRequestID: cb.CheckoutRequestID,
		ResultCode:        cb.ResultCode,
		ResultDescription: cb.ResultDesc,
	}

	if cb.CallbackMetadata != nil {
		for _, item := range cb.CallbackMetadata.Item {
			switch item.Name {
			case "Amount":
				if v, ok := item.Value.(float64); ok {
					result.Amount = &v
				}
			case "MpesaReceiptNumber":
				if v, ok := item.Value.(string); ok {
					result.ReceiptNumber = &v
				}
			case "TransactionDate":
				if v, ok := item.Value.(string); ok {
					result.TransactionDate = &v
				}
			case "PhoneNumber":
				if v, ok := item.Value.(string); ok {
					result.PhoneNumber = &v
				}
			}
		}
	}

	return result
}

func ParseB2BExpressCallback(payload types.B2BExpressCallbackPayload) types.B2BExpressCallbackResult {
	result := types.B2BExpressCallbackResult{
		Success:           payload.ResultCode == "0",
		ResultCode:        payload.ResultCode,
		ResultDescription: payload.ResultDesc,
		RequestID:         payload.RequestID,
	}

	if payload.Amount != "" {
		v := payload.Amount
		result.Amount = &v
	}
	if payload.ResultType != "" {
		v := payload.ResultType
		result.ResultType = &v
	}
	if payload.ConversationID != "" {
		v := payload.ConversationID
		result.ConversationID = &v
	}
	if payload.TransactionID != "" {
		v := payload.TransactionID
		result.TransactionID = &v
	}
	if payload.Status != "" {
		v := payload.Status
		result.Status = &v
	}
	if payload.PaymentReference != "" {
		v := payload.PaymentReference
		result.PaymentReference = &v
	}

	return result
}
