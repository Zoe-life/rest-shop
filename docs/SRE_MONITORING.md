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
| Latency (p99) | < 1 000 ms | p99 > 1 s for 5 min |
| Latency (p50) | < 200 ms | p50 > 250 ms for 5 min |
| DB connectivity | ≥ 99.9% | `mongodb_connection_state != 1` for 1 min |
| Error rate (5xx) | < 1% | 5xx rate > 1% for 5 min |

All SLO alert rules are defined in [`monitoring/prometheus.rules.yml`](../monitoring/prometheus.rules.yml).

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

`METRICS_TOKEN` is automatically synced to Render.com on every deploy (via `ci-cd.yml` → `sync_render_env.py`). Add it as a GitHub Secret named `METRICS_TOKEN`.

Generate a token:
```bash
openssl rand -hex 32
```

---

## 5. Monitoring Files at a Glance

| File | Purpose |
|------|---------|
| `monitoring/prometheus.yml` | Prometheus config – scrapes the **production** Render.com API (HTTPS + bearer token) |
| `monitoring/prometheus.local.yml` | Prometheus config – scrapes the API running locally (`host.docker.internal:3001`) |
| `monitoring/prometheus.prod.yml` | Prometheus config for `docker-compose.prod-monitoring.yml` (env-var substitution) |
| `monitoring/prometheus.rules.yml` | Alert rules: availability, latency, database, saturation |
| `monitoring/grafana-agent.yml` | Grafana Agent config – scrapes Render.com API and pushes to Grafana Cloud |
| `monitoring/grafana/dashboards/rest-shop.json` | Pre-built Grafana SRE overview dashboard |
| `monitoring/grafana/provisioning/` | Auto-provisioning configs for Grafana |
| `docker-compose.monitoring.yml` | **Local dev** – Prometheus + Grafana (API runs separately on port 3001) |
| `docker-compose.prod-monitoring.yml` | **Production self-hosted** – external Prometheus + Grafana pointing at Render.com |
| `.github/workflows/production-health-check.yml` | Scheduled GitHub Actions health check (every 15 min) |

---

## 6. Local Development Setup

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

## 7. Production Setup

### Option A – Grafana Cloud with Grafana Agent (recommended, free tier)

Grafana Cloud manages Prometheus, Grafana, and alerting with no infrastructure to run. Grafana Agent runs anywhere (cheap VPS, home server, even GitHub Codespaces) and pushes metrics to the cloud.

**Step 1 – Sign up for Grafana Cloud**

1. Go to https://grafana.com/auth/sign-up/create-user (free tier: 10 000 series, 50 GB logs).
2. Create a stack. Note your **Prometheus remote-write URL**, **user ID**, and **API key**.

**Step 2 – Configure secrets**

Add these as GitHub Secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `METRICS_TOKEN` | Output of `openssl rand -hex 32` |
| `BACKEND_API_URL` | Your Render.com API URL, e.g. `https://rest-shop-api.onrender.com` |

**Step 3 – Run Grafana Agent**

Edit `monitoring/grafana-agent.yml` with your Grafana Cloud credentials, then run:

```bash
# Export required variables
export RENDER_HOST=rest-shop-api.onrender.com
export METRICS_TOKEN=<your-metrics-token>
export GRAFANA_CLOUD_PROM_URL=https://prometheus-prod-xx.grafana.net/api/prom/push
export GRAFANA_CLOUD_USER=<numeric-user-id>
export GRAFANA_CLOUD_API_KEY=<api-key>

# Run with Docker
docker run --rm \
  -e RENDER_HOST -e METRICS_TOKEN \
  -e GRAFANA_CLOUD_PROM_URL -e GRAFANA_CLOUD_USER -e GRAFANA_CLOUD_API_KEY \
  -v "$(pwd)/monitoring/grafana-agent.yml:/etc/agent/agent.yml" \
  grafana/agent:latest \
  --config.file=/etc/agent/agent.yml
```

**Step 4 – Import the dashboard**

In Grafana Cloud, go to **Dashboards → Import** and upload `monitoring/grafana/dashboards/rest-shop.json`.

---

### Option B – Self-hosted Prometheus + Grafana on a VPS

Use `docker-compose.prod-monitoring.yml` to run Prometheus and Grafana on any machine with Docker. Prometheus scrapes the Render.com API over HTTPS.

```bash
# Set required environment variables
export METRICS_TOKEN=<your-metrics-token>
export RENDER_HOST=rest-shop-api.onrender.com
export GF_SECURITY_ADMIN_PASSWORD=<strong-password>

# Start the stack
docker compose -f docker-compose.prod-monitoring.yml up -d
```

Open Grafana at `http://<your-vps-ip>:3000` (bind behind Nginx/Caddy with TLS in real production).

The `monitoring/prometheus.prod.yml` config uses environment variable substitution for the host and token.

---

### Option C – Self-hosted via `monitoring/prometheus.yml`

If you run Prometheus directly (no Docker Compose), edit `monitoring/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'rest-shop-api'
    static_configs:
      - targets: ['rest-shop-api.onrender.com']
    scheme: https
    metrics_path: '/metrics'
    authorization:
      type: Bearer
      credentials: '<your-METRICS_TOKEN>'
```

---

### Option D – Datadog (paid)

1. Install the Datadog Agent and enable the [Prometheus/OpenMetrics integration](https://docs.datadoghq.com/integrations/guide/prometheus-host-collection/).
2. Point it at `https://<your-render-host>/metrics` with the bearer token.
3. Datadog will ingest all Prometheus metrics automatically.

---

## 8. Automated Production Health Checks (GitHub Actions)

`.github/workflows/production-health-check.yml` runs **every 15 minutes** and checks:

- `GET /health` – database and app status
- `GET /metrics` – metrics endpoint availability (with `METRICS_TOKEN` if configured)

The workflow fails (visible in the GitHub Actions tab) if either endpoint returns a non-200 status. No additional infrastructure is required.

**GitHub Secrets required:**

| Secret | Required |
|--------|----------|
| `BACKEND_API_URL` | Yes |
| `METRICS_TOKEN` | Optional (skips auth if not set) |

---

## 9. Alerting Rules

All alerting rules are in [`monitoring/prometheus.rules.yml`](../monitoring/prometheus.rules.yml):

| Alert | Severity | Condition |
|-------|----------|-----------|
| `APIDown` | critical | Prometheus cannot scrape `/metrics` for 2 min |
| `HighErrorRate` | critical | 5xx rate > 1% for 5 min |
| `HighClientErrorRate` | warning | 4xx rate > 10% for 10 min |
| `HighLatencyP99` | warning | p99 > 1 s for 5 min |
| `HighLatencyP50` | warning | p50 > 250 ms for 5 min |
| `DatabaseDisconnected` | critical | `mongodb_connection_state != 1` for 1 min |
| `HighMemoryUsage` | warning | RSS > 400 MiB for 5 min |
| `HighEventLoopLag` | warning | Event loop lag > 100 ms for 5 min |
| `HighInFlightRequests` | warning | In-flight > 50 for 5 min |

To route alerts to Slack or PagerDuty, configure Grafana Alerting (cloud or self-hosted) or Alertmanager.

---

## 10. Log Aggregation

The application already writes structured JSON error logs to `logs/app-error.log`.

For centralised log aggregation:

| Tool | Notes |
|------|-------|
| **Grafana Loki** | Free tier on Grafana Cloud; use Promtail to tail the log file |
| **Datadog Logs** | Datadog Agent can tail log files automatically |
| **Render.com Logs** | Available in the Render dashboard; exportable via log drains |

To send Render.com logs to an external system, configure a **Log Drain** in the Render dashboard under your service → **Log Streams**.

---

## 11. Future Enhancements (OpenTelemetry)

For distributed tracing (useful once the system has multiple services):

1. Add `@opentelemetry/sdk-node` and instrument the Express app.
2. Export traces to **Grafana Tempo** (free tier on Grafana Cloud) or Datadog APM.
3. Correlate traces with Prometheus metrics and Loki logs using `trace_id`.

This would give full **observability pillars**: Metrics ✅ · Logs ✅ · Traces 🔷 (future).
