package client

import (
	"context"
)

type BatchRequest struct {
	Method string
	URL    string
	Body   interface{}
}

type BatchResult struct {
	Data []byte
	Err  error
}

func (c *Client) ExecuteBatch(ctx context.Context, requests []BatchRequest, concurrency int) []BatchResult {
	if concurrency <= 0 {
		concurrency = 3
	}

	results := make([]BatchResult, 0, len(requests))

	for i := 0; i < len(requests); i += concurrency {
		end := i + concurrency
		if end > len(requests) {
			end = len(requests)
		}
		chunk := requests[i:end]

		type chResult struct {
			index int
			data  []byte
			err   error
		}
		ch := make(chan chResult, len(chunk))

		for _, req := range chunk {
			r := req
			go func() {
				data, err := c.doRequest(ctx, r.Method, r.URL, r.Body)
				ch <- chResult{data: data, err: err}
			}()
		}

		for range chunk {
			res := <-ch
			results = append(results, BatchResult{Data: res.data, Err: res.err})
		}
	}

	return results
}
