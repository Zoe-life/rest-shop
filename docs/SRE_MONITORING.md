# SRE Monitoring & Observability Guide

## Tool Audit & Recommendation

This document covers the SRE (Site Reliability Engineering) observability strategy for the REST Shop API, including a tool audit and implementation details.

---

## 1. Tool Audit

### Evaluated Options

| Tool | Type | Cost | Pros | Cons | Verdict |
|------|------|------|------|------|---------|
| **Prometheus + Grafana** | Self-hosted / Cloud | Free (self-hosted) / Grafana Cloud free tier | Open-source, vendor-neutral, industry standard, excellent Node.js support, works with any monitoring backend | Requires hosting (Docker or Grafana Cloud) | ✅ **Chosen** |
| **Datadog** | SaaS (managed) | ~$15–23/host/month | All-in-one (logs, metrics, APM, traces), easy setup, great Node.js APM | Cost grows quickly; vendor lock-in | 🔶 Good paid alternative |
| **New Relic** | SaaS (managed) | Free tier available | Generous free tier (100 GB/month), full-stack observability, APM | Less flexible than Prometheus for custom metrics | 🔶 Good free-tier alternative |
| **Grafana Cloud** | Managed Prometheus + Grafana | Free tier (10k series / 50 GB logs) | Fully managed, same dashboards/PromQL, no infra to run | Paid beyond free tier | ✅ Recommended for production |
| **OpenTelemetry** | Standard (vendor-neutral) | Free | Unified traces, metrics, logs; works with any backend | Higher setup complexity | 🔷 Future enhancement |

### Decision

**Prometheus + Grafana** is the best fit for this application because:

1. **Vendor-neutral** – Prometheus is the CNCF standard. Metrics exposed via `/metrics` can be consumed by Datadog, New Relic, Grafana Cloud, or any Prometheus-compatible system without changing application code.
2. **Cost** – Grafana Cloud's free tier (10 000 active series, 50 GB logs, 50 GB traces) covers a production application at this scale with no cost.
3. **Node.js support** – `prom-client` is the official, widely-used Prometheus client library. It auto-instruments GC, event-loop lag, memory, handles, and file descriptors.
4. **Render.com compatibility** – Just expose `/metrics` via HTTP; Prometheus or Grafana Cloud scrapes it on a schedule.
5. **Extensibility** – Adding distributed tracing (OpenTelemetry → Grafana Tempo) or log aggregation (Grafana Loki) later is seamless.

---

## 2. Signals & SLIs Implemented

The following **Service-Level Indicators (SLIs)** are now collected:

### HTTP Traffic (Golden Signals)

| Metric | Prometheus Name | Description |
|--------|----------------|-------------|
| **Latency** | `http_request_duration_seconds` | Histogram; labelled by method, route, status code |
| **Traffic** | `http_requests_total` | Counter; labelled by method, route, status code |
| **Errors** | `http_requests_total{status_code=~"5.."}` | 5xx counter derived from traffic metric |
| **Saturation** | `http_requests_in_flight` | Gauge of concurrent requests |

### Database

| Metric | Prometheus Name | Description |
|--------|----------------|-------------|
| **Connection state** | `mongodb_connection_state` | 0=disconnected, 1=connected, 2=connecting, 3=disconnecting |

### Node.js Runtime (auto-collected by `prom-client`)

| Metric | Description |
|--------|-------------|
| `process_resident_memory_bytes` | RSS memory |
| `nodejs_heap_size_used_bytes` / `nodejs_heap_size_total_bytes` | V8 heap |
| `nodejs_eventloop_lag_seconds` | Event-loop saturation |
| `nodejs_gc_duration_seconds` | GC pause time |
| `nodejs_active_handles_total` | Open file/socket handles |
| `process_cpu_seconds_total` | CPU usage |

---

## 3. Suggested SLOs

| SLO | Target | Alert threshold |
|-----|--------|-----------------|
| Availability | ≥ 99.5% (monthly) | Error rate > 0.5% for 5 min |
| Latency (p99) | < 1 000 ms | p99 > 800 ms for 5 min |
| Latency (p50) | < 200 ms | p50 > 150 ms for 5 min |
| DB connectivity | ≥ 99.9% | `mongodb_connection_state != 1` for 1 min |
| Error rate (5xx) | < 1% | 5xx rate > 1% for 5 min |

---

## 4. `/metrics` Endpoint

The API now exposes a Prometheus-compatible metrics endpoint:

```
GET /metrics
Authorization: Bearer <METRICS_TOKEN>
```

### Authentication

| Environment | Behaviour |
|-------------|-----------|
| Development (no `METRICS_TOKEN`) | Open access (convenient for local work) |
| Production | `METRICS_TOKEN` **must** be set; requests without a matching bearer token receive `401` |

Set `METRICS_TOKEN` in Render.com → Environment → Add variable.

---

## 5. Local Development Setup

### Prerequisites

- Docker + Docker Compose  
- API running locally (`cd api && npm start`)

### Start the monitoring stack

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3000 | admin / admin |
| Prometheus | http://localhost:9090 | – |
| API metrics | http://localhost:3001/metrics | – (no token in dev) |

The pre-built **REST Shop – SRE Overview** dashboard is auto-provisioned in Grafana under the *REST Shop* folder.

### Verify Prometheus is scraping

1. Open http://localhost:9090/targets
2. The `rest-shop-api` job should show **UP**.

---

## 6. Production Setup (Grafana Cloud)

### Option A – Grafana Cloud (recommended, free tier)

1. Sign up at https://grafana.com/auth/sign-up/create-user
2. Create a stack (free tier includes Prometheus, Loki, Tempo).
3. In **Connections → Add new connection → Prometheus**, click **Send metrics from your app**.
4. Follow the Grafana Agent or remote-write setup (or use the Prometheus remote-write endpoint).
5. Set the scrape URL and bearer token from Grafana Cloud in your environment.

Alternatively, use Grafana Cloud's **HTTP metrics ingest API** with the `prom-client` remote-write option.

### Option B – Self-hosted Prometheus on a VPS / Docker

Update `monitoring/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'rest-shop-api'
    static_configs:
      - targets: ['<your-render-host>:443']
    scheme: https
    bearer_token: '<your-METRICS_TOKEN>'
    metrics_path: '/metrics'
```

Import `monitoring/grafana/dashboards/rest-shop.json` into your Grafana instance.

### Option C – Datadog (paid)

If you prefer Datadog:

1. Install the Datadog Agent and enable the [Prometheus/OpenMetrics integration](https://docs.datadoghq.com/integrations/guide/prometheus-host-collection/).
2. Point it at `https://<your-render-host>/metrics` with the bearer token.
3. Datadog will ingest all Prometheus metrics automatically.

---

## 7. Alerting

Configure alerting rules in Prometheus (`prometheus.rules.yml`) and route them via **Grafana Alerting** or **Alertmanager** to Slack, PagerDuty, email, etc.

Example alert rules:

```yaml
# monitoring/prometheus.rules.yml
groups:
  - name: rest-shop.rules
    rules:
      - alert: HighErrorRate
        expr: |
          100 * sum(rate(http_requests_total{status_code=~"5.."}[5m]))
            / sum(rate(http_requests_total[5m])) > 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High 5xx error rate ({{ $value | printf \"%.1f\" }}%)"

      - alert: HighLatencyP99
        expr: |
          histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "p99 latency above 1 second ({{ $value | printf \"%.2f\" }}s)"

      - alert: DatabaseDisconnected
        expr: mongodb_connection_state != 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB disconnected (state={{ $value }})"
```

---

## 8. Log Aggregation

The application already writes structured JSON error logs to `logs/app-error.log`.

For centralised log aggregation:

| Tool | Notes |
|------|-------|
| **Grafana Loki** | Free tier on Grafana Cloud; tail the log file with Promtail |
| **Datadog Logs** | Datadog Agent can tail log files automatically |
| **Render.com Logs** | Available directly in the Render dashboard; exportable via log drains |

To send Render.com logs to an external system, configure a **Log Drain** in the Render dashboard under your service → **Log Streams**.

---

## 9. Future Enhancements (OpenTelemetry)

For distributed tracing (useful once the system has multiple services):

1. Add `@opentelemetry/sdk-node` and instrument the Express app.
2. Export traces to **Grafana Tempo** (free tier on Grafana Cloud) or Datadog APM.
3. Correlate traces with Prometheus metrics and Loki logs using `trace_id`.

This would give full **observability pillars**: Metrics ✅ · Logs ✅ · Traces 🔷 (future).
