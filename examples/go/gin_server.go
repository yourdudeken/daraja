package main

import (
	"context"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/yourdudeken/mpesa-sdk/client"
	"github.com/yourdudeken/mpesa-sdk/types"
	"github.com/yourdudeken/mpesa-sdk/webhooks"
)

func main() {
	r := gin.Default()

	mpesaClient := client.NewClient(types.MpesaConfig{
		ConsumerKey:    os.Getenv("MPESA_CONSUMER_KEY"),
		ConsumerSecret: os.Getenv("MPESA_CONSUMER_SECRET"),
		Environment:    types.Sandbox,
		Passkey:        os.Getenv("MPESA_PASSKEY"),
	})

	wh := webhooks.NewManager()

	wh.On(webhooks.EventSTKCallback, func(et webhooks.EventType, payload interface{}) {
		if result, ok := payload.(types.STKCallbackResult); ok {
			if result.Success {
				gin.DefaultWriter.Write([]byte(
					fmt.Sprintf("Payment: %s KES %.0f\n", *result.ReceiptNumber, *result.Amount),
				))
			}
		}
	})

	r.POST("/api/stkpush", func(c *gin.Context) {
		var req types.STKPushRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		resp, err := mpesaClient.STKPush(context.Background(), req)
		if err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"success": true, "data": resp})
	})

	r.POST("/mpesa/callback", func(c *gin.Context) {
		body, _ := c.GetRawData()
		wh.HandleSTKCallback(body)
		c.JSON(200, gin.H{"ResultCode": "0", "ResultDesc": "Accepted"})
	})

	r.Run(":8080")
}
