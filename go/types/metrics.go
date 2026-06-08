package types

import (
	"github.com/prometheus/client_golang/prometheus"
)

type MetricsCollector interface {
	Increment(metric string, tags map[string]string, value int)
	Gauge(metric string, value float64, tags map[string]string)
	Timing(metric string, durationMs float64, tags map[string]string)
	Histogram(metric string, value float64, tags map[string]string)
}

type NoopMetricsCollector struct{}

func (n *NoopMetricsCollector) Increment(_ string, _ map[string]string, _ int)     {}
func (n *NoopMetricsCollector) Gauge(_ string, _ float64, _ map[string]string)     {}
func (n *NoopMetricsCollector) Timing(_ string, _ float64, _ map[string]string)    {}
func (n *NoopMetricsCollector) Histogram(_ string, _ float64, _ map[string]string) {}

type PrometheusMetricsCollector struct {
	counters   map[string]*prometheus.CounterVec
	gauges     map[string]*prometheus.GaugeVec
	histograms map[string]*prometheus.HistogramVec
}

func NewPrometheusMetricsCollector(prefix string) *PrometheusMetricsCollector {
	if prefix == "" {
		prefix = "mpesa_"
	}
	pm := &PrometheusMetricsCollector{
		counters:   make(map[string]*prometheus.CounterVec),
		gauges:     make(map[string]*prometheus.GaugeVec),
		histograms: make(map[string]*prometheus.HistogramVec),
	}

	pm.addCounter("requests_total", "Total number of API requests", []string{"operation", "environment", "status_code"})
	pm.addCounter("requests_success_total", "Successful requests", []string{"operation", "environment"})
	pm.addCounter("requests_failed_total", "Failed requests", []string{"operation", "environment", "error_code"})
	pm.addHistogram("request_duration_seconds", "Request duration distribution", []string{"operation", "environment"}, prometheus.DefBuckets)
	pm.addCounter("token_refreshes_total", "Total OAuth token refreshes", []string{"status"})
	pm.addGauge("circuit_breaker_state", "Circuit breaker state (0=closed, 1=open, 2=half-open)", []string{"service"})
	pm.addCounter("circuit_breaker_failures_total", "Total circuit breaker failures", []string{"service"})
	pm.addCounter("retry_attempts_total", "Total retry attempts", []string{"operation"})
	pm.addCounter("retry_success_total", "Successful retries", []string{"operation"})
	pm.addCounter("errors_total", "Total errors", []string{"error_type", "operation"})
	pm.addCounter("api_errors_total", "API-specific errors", []string{"error_code", "operation"})
	pm.addCounter("network_errors_total", "Network errors", []string{"operation"})
	pm.addCounter("webhook_processed_total", "Total webhooks processed", []string{"webhook_type"})
	pm.addCounter("webhook_success_total", "Successful webhooks", []string{"webhook_type"})
	pm.addCounter("webhook_failed_total", "Failed webhooks", []string{"webhook_type"})
	pm.addCounter("webhook_retried_total", "Webhooks that were retried", []string{"webhook_type"})
	pm.addCounter("webhook_dlq_total", "Webhooks moved to DLQ", []string{"webhook_type"})
	pm.addGauge("webhook_dlq_items", "Current DLQ item count", nil)

	return pm
}

func (pm *PrometheusMetricsCollector) addCounter(name, help string, labels []string) {
	opts := prometheus.CounterOpts{Name: name, Help: help}
	pm.counters[name] = prometheus.NewCounterVec(opts, labels)
	prometheus.MustRegister(pm.counters[name])
}

func (pm *PrometheusMetricsCollector) addGauge(name, help string, labels []string) {
	opts := prometheus.GaugeOpts{Name: name, Help: help}
	pm.gauges[name] = prometheus.NewGaugeVec(opts, labels)
	prometheus.MustRegister(pm.gauges[name])
}

func (pm *PrometheusMetricsCollector) addHistogram(name, help string, labels []string, buckets []float64) {
	opts := prometheus.HistogramOpts{Name: name, Help: help, Buckets: buckets}
	pm.histograms[name] = prometheus.NewHistogramVec(opts, labels)
	prometheus.MustRegister(pm.histograms[name])
}

func (pm *PrometheusMetricsCollector) Increment(metric string, tags map[string]string, value int) {
	if c, ok := pm.counters[metric]; ok {
		c.With(tags).Add(float64(value))
	}
}

func (pm *PrometheusMetricsCollector) Gauge(metric string, value float64, tags map[string]string) {
	if g, ok := pm.gauges[metric]; ok {
		g.With(tags).Set(value)
	}
}

func (pm *PrometheusMetricsCollector) Timing(metric string, durationMs float64, tags map[string]string) {
	pm.Histogram(metric, durationMs/1000.0, tags)
}

func (pm *PrometheusMetricsCollector) Histogram(metric string, value float64, tags map[string]string) {
	if h, ok := pm.histograms[metric]; ok {
		h.With(tags).Observe(value)
	}
}
