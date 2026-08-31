package middleware

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/yourdudeken/daraja-sdk/packages/go/client"
	"github.com/yourdudeken/daraja-sdk/packages/go/types"
	"github.com/yourdudeken/daraja-sdk/packages/go/webhooks"
)

const version = "0.2.0"

func GinWebhookHandler(m *webhooks.Manager, secret string, mpesaClient *client.Client, startTime ...time.Time) gin.HandlerFunc {
	start := time.Now()
	if len(startTime) > 0 {
		start = startTime[0]
	}
	return func(c *gin.Context) {
		if mpesaClient != nil && c.Request.Method == http.MethodGet && c.Request.URL.Path == "/mpesa/health" {
			ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
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

			respStatus := http.StatusOK
			if !tokenOK {
				respStatus = http.StatusServiceUnavailable
			}
			c.JSON(respStatus, gin.H{
				"status":    status,
				"version":   version,
				"timestamp": time.Now().UTC().Format(time.RFC3339),
				"goVersion": runtime.Version(),
				"uptime":    time.Since(start).Round(time.Second).String(),
				"tokenOk":   tokenOK,
			})
			return
		}

		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			m.Logger().Error("Failed to read webhook body", "error", err.Error())
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "failed to read body"})
			return
		}

		if secret != "" {
			signature := c.GetHeader("x-mpesa-signature")
			if signature == "" {
				m.Logger().Warn("Missing webhook signature header")
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing signature"})
				return
			}
			if !webhooks.VerifySignature(body, signature, secret) {
				m.Logger().Warn("Invalid webhook signature")
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid signature"})
				return
			}
		}

		var raw struct {
			Body struct {
				StkCallback *json.RawMessage `json:"stkCallback"`
			} `json:"Body"`
			Result          *json.RawMessage `json:"Result"`
			TransactionType *string          `json:"TransactionType"`
		}

		if err := json.Unmarshal(body, &raw); err != nil {
			m.Logger().Error("Failed to parse webhook payload", "error", err.Error())
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid JSON"})
			return
		}

		switch {
		case raw.Body.StkCallback != nil:
			m.Logger().Debug("Received STK callback")
			m.HandleSTKCallback(body)
		case raw.Result != nil:
			m.Logger().Debug("Received result callback")
			var result types.MpesaResult
			if err := json.Unmarshal(body, &result); err != nil {
				m.Logger().Error("Failed to parse result callback", "error", err.Error())
				c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid JSON"})
				return
			}
			if result.Result.ResultParameters != nil {
				keys := make(map[string]bool)
				for _, p := range result.Result.ResultParameters.ResultParameter {
					keys[p.Key] = true
				}
				switch {
				case keys["AccountBalance"]:
					m.Emit(webhooks.EventAccountBalance, result)
				case keys["TransactionStatus"]:
					m.Emit(webhooks.EventTransactionStatus, result)
				case keys["B2BRecipientPartyPublicName"] || keys["B2BSenderPartyPublicName"]:
					m.Emit(webhooks.EventB2BResult, result)
				case keys["OriginalTransactionID"]:
					m.Emit(webhooks.EventReversalResult, result)
				default:
					m.Emit(webhooks.EventB2CResult, result)
				}
			} else {
				m.Emit(webhooks.EventB2CResult, result)
			}
		case raw.TransactionType != nil:
			m.Logger().Debug("Received C2B", "type", *raw.TransactionType)
			var rawBody struct {
				TransID *string `json:"TransID"`
			}
			if err := json.Unmarshal(body, &rawBody); err == nil && rawBody.TransID != nil {
				m.Emit(webhooks.EventC2BConfirmation, body)
			} else {
				m.Emit(webhooks.EventC2BValidation, body)
			}
		default:
			m.Logger().Warn("Unknown webhook event type")
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "unknown event type"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"received": true})
	}
}
