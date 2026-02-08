# Monitoring and Observability Guide

## Table of Contents
1. [Overview](#overview)
2. [Logging](#logging)
3. [Application Performance Monitoring (APM)](#application-performance-monitoring-apm)
4. [Distributed Tracing](#distributed-tracing)
5. [Custom Metrics](#custom-metrics)
6. [Alerting](#alerting)
7. [Health Checks](#health-checks)
8. [Dashboard Setup](#dashboard-setup)

---

## Overview

This guide covers monitoring and observability features for the REST Shop application, including logging, APM integration, distributed tracing, and alerting.

### Goals
- **Visibility**: Understand what the application is doing
- **Performance**: Track response times and resource usage
- **Reliability**: Detect and respond to issues quickly
- **Debugging**: Trace requests through the system

---

## Logging

### Current Implementation

The application uses a structured logging system via `utils/logger.js` and `utils/auditLogger.js`.

#### Logger Types

**1. Application Logger (`utils/logger.js`)**
```javascript
const { logInfo, logError, logWarn } = require('./utils/logger');

// Info logging
logInfo('User created successfully', { userId: user._id, email: user.email });

// Error logging
logError('Failed to create user', error);

// Warning logging
logWarn('Redis connection lost');
```

**2. Audit Logger (`utils/auditLogger.js`)**
```javascript
const { logUserSignup, logUserLogin, logAuthFailure } = require('./utils/auditLogger');

// Audit trail for security events
logUserSignup({
    userId: user._id.toString(),
    email: user.email,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    outcome: 'success'
});
```

### Log Levels
- **INFO**: Normal operations, successful actions
- **WARN**: Degraded state, recoverable errors
- **ERROR**: Failures requiring attention

### Log Format
Logs are output in JSON format for easy parsing:
```json
{
  "timestamp": "2026-02-08T21:00:00.000Z",
  "level": "INFO",
  "message": "User created successfully",
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com"
}
```

### Log Aggregation

**Recommended Tools:**
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana Loki**
- **Datadog**
- **Splunk**

**Docker Logging Example:**
```bash
docker run -d \
  --log-driver=json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  rest-shop
```

---

## Application Performance Monitoring (APM)

### Recommended APM Solutions

#### 1. New Relic

**Installation:**
```bash
npm install newrelic
```

**Configuration:**
Create `newrelic.js` in project root:
```javascript
'use strict'

exports.config = {
  app_name: ['REST Shop'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info'
  },
  allow_all_headers: true,
  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*'
    ]
  }
}
```

**Add to server.js (first line):**
```javascript
require('newrelic');
const http = require('http');
// ... rest of your code
```

#### 2. Datadog APM

**Installation:**
```bash
npm install dd-trace
```

**Configuration:**
Create `datadog.js`:
```javascript
const tracer = require('dd-trace').init({
  service: 'rest-shop',
  env: process.env.NODE_ENV || 'development',
  hostname: process.env.DD_AGENT_HOST || 'localhost',
  port: process.env.DD_AGENT_PORT || 8126,
  logInjection: true
});

module.exports = tracer;
```

**Add to server.js (first line):**
```javascript
require('./datadog');
const http = require('http');
// ... rest of your code
```

#### 3. Elastic APM

**Installation:**
```bash
npm install elastic-apm-node
```

**Configuration:**
```javascript
const apm = require('elastic-apm-node').start({
  serviceName: 'rest-shop',
  serverUrl: process.env.ELASTIC_APM_SERVER_URL,
  secretToken: process.env.ELASTIC_APM_SECRET_TOKEN,
  environment: process.env.NODE_ENV
});
```

### Key Metrics to Monitor

1. **Response Time**
   - Average: < 200ms
   - 95th percentile: < 500ms
   - 99th percentile: < 1000ms

2. **Throughput**
   - Requests per minute
   - Requests per endpoint

3. **Error Rate**
   - Target: < 1%
   - Alert threshold: > 5%

4. **Database Performance**
   - Query execution time
   - Connection pool utilization

5. **External API Calls**
   - Payment gateway response times
   - Email service performance

---

## Distributed Tracing

### Implementation

#### Add Trace IDs to Requests

Create `api/middleware/traceMiddleware.js`:
```javascript
const { v4: uuidv4 } = require('uuid');

exports.traceMiddleware = (req, res, next) => {
    // Generate or extract trace ID
    req.traceId = req.headers['x-trace-id'] || uuidv4();
    
    // Add to response headers
    res.setHeader('X-Trace-ID', req.traceId);
    
    // Add to logger context
    req.logContext = {
        traceId: req.traceId,
        method: req.method,
        path: req.path,
        ip: req.ip
    };
    
    next();
};
```

**Add to app.js:**
```javascript
const { traceMiddleware } = require('./api/middleware/traceMiddleware');
app.use(traceMiddleware);
```

#### Update Logger to Include Trace ID

Modify `utils/logger.js`:
```javascript
exports.logInfo = (message, data = {}, req = null) => {
    const logData = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message,
        ...data
    };
    
    if (req && req.traceId) {
        logData.traceId = req.traceId;
    }
    
    console.log(JSON.stringify(logData));
};
```

### Tracing Across Services

For microservices architecture, propagate trace IDs:

```javascript
// In service calls
const axios = require('axios');

async function callPaymentService(data, traceId) {
    return axios.post('https://payment-service/process', data, {
        headers: {
            'X-Trace-ID': traceId,
            'X-Parent-Span-ID': generateSpanId()
        }
    });
}
```

---

## Custom Metrics

### Implementation

Create `api/services/metricsService.js`:
```javascript
/**
 * Custom metrics collection service
 */

const metrics = {
    orderCreated: 0,
    orderCompleted: 0,
    paymentSuccess: 0,
    paymentFailed: 0,
    cacheHits: 0,
    cacheMisses: 0,
    activeUsers: 0
};

let startTime = Date.now();

/**
 * Increment a metric
 */
exports.incrementMetric = (metricName, value = 1) => {
    if (metrics.hasOwnProperty(metricName)) {
        metrics[metricName] += value;
    }
};

/**
 * Set a gauge metric
 */
exports.setMetric = (metricName, value) => {
    metrics[metricName] = value;
};

/**
 * Get all metrics
 */
exports.getMetrics = () => {
    const uptime = (Date.now() - startTime) / 1000;
    return {
        ...metrics,
        uptime,
        timestamp: new Date().toISOString()
    };
};

/**
 * Reset metrics
 */
exports.resetMetrics = () => {
    Object.keys(metrics).forEach(key => {
        if (typeof metrics[key] === 'number') {
            metrics[key] = 0;
        }
    });
    startTime = Date.now();
};
```

### Metrics Endpoint

Add to routes:
```javascript
// In app.js or a new metrics route
app.get('/metrics', (req, res) => {
    const metricsService = require('./api/services/metricsService');
    res.json(metricsService.getMetrics());
});
```

### Prometheus Integration (Optional)

```bash
npm install prom-client
```

```javascript
const client = require('prom-client');

// Create metrics
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code']
});

const orderCounter = new client.Counter({
    name: 'orders_created_total',
    help: 'Total number of orders created'
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});
```

---

## Alerting

### Alert Rules

#### 1. High Error Rate
```yaml
alert: HighErrorRate
condition: error_rate > 5%
duration: 5m
severity: critical
action: PagerDuty + Email
```

#### 2. Slow Response Time
```yaml
alert: SlowResponseTime
condition: p95_response_time > 1000ms
duration: 10m
severity: warning
action: Slack + Email
```

#### 3. Database Connection Issues
```yaml
alert: DatabaseConnectionFailed
condition: mongodb_connected == false
duration: 1m
severity: critical
action: PagerDuty + Email + SMS
```

#### 4. High Memory Usage
```yaml
alert: HighMemoryUsage
condition: memory_usage > 80%
duration: 5m
severity: warning
action: Slack
```

#### 5. Payment Gateway Failures
```yaml
alert: PaymentGatewayFailures
condition: payment_failure_rate > 10%
duration: 5m
severity: critical
action: PagerDuty + Email
```

### Alert Channels

**1. Email:**
```javascript
const nodemailer = require('nodemailer');

async function sendAlert(alert) {
    const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    await transporter.sendMail({
        from: 'alerts@rest-shop.com',
        to: 'team@rest-shop.com',
        subject: `[${alert.severity}] ${alert.name}`,
        text: alert.description
    });
}
```

**2. Slack:**
```javascript
const axios = require('axios');

async function sendSlackAlert(alert) {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
        text: `🚨 *${alert.severity.toUpperCase()}*: ${alert.name}`,
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: alert.description
                }
            }
        ]
    });
}
```

---

## Health Checks

### Current Implementation

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "environment": "production",
  "uptime": 3600,
  "timestamp": "2026-02-08T21:00:00.000Z"
}
```

### Enhanced Health Check

```javascript
app.get('/health', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            redis: cacheService.isConnected() ? 'connected' : 'disconnected',
            websocket: socketService.getConnectedUsersCount() > 0 ? 'active' : 'idle'
        },
        memory: {
            usage: process.memoryUsage().heapUsed / 1024 / 1024,
            total: process.memoryUsage().heapTotal / 1024 / 1024
        }
    };

    const isHealthy = health.services.database === 'connected';
    res.status(isHealthy ? 200 : 503).json(health);
});
```

### Liveness and Readiness Probes

**Kubernetes Configuration:**
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## Dashboard Setup

### Grafana Dashboard

**Recommended Panels:**

1. **Request Rate**
   - Metric: `http_requests_total`
   - Visualization: Graph

2. **Response Time**
   - Metric: `http_request_duration_seconds`
   - Visualization: Heatmap

3. **Error Rate**
   - Metric: `http_errors_total / http_requests_total * 100`
   - Visualization: Single Stat

4. **Active Users**
   - Metric: `websocket_connections`
   - Visualization: Gauge

5. **Database Query Performance**
   - Metric: `mongodb_query_duration`
   - Visualization: Graph

6. **Cache Hit Rate**
   - Metric: `cache_hits / (cache_hits + cache_misses) * 100`
   - Visualization: Single Stat

### CloudWatch Dashboard (AWS)

```javascript
// If deploying to AWS
const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

async function publishMetric(metricName, value) {
    await cloudwatch.putMetricData({
        Namespace: 'REST-Shop',
        MetricData: [
            {
                MetricName: metricName,
                Value: value,
                Unit: 'Count',
                Timestamp: new Date()
            }
        ]
    }).promise();
}
```

---

## Best Practices

### 1. Log Sensitive Data Handling
- Never log passwords, tokens, or API keys
- Redact sensitive information
- Use log levels appropriately

### 2. Performance Monitoring
- Monitor both successful and failed requests
- Track external API performance separately
- Set realistic SLAs based on historical data

### 3. Alert Fatigue
- Avoid too many alerts
- Set appropriate thresholds
- Use alert aggregation
- Implement on-call rotations

### 4. Security Monitoring
- Track failed login attempts
- Monitor for unusual patterns
- Log all authentication events
- Alert on security incidents

### 5. Cost Management
- Monitor logging costs
- Set log retention policies
- Use sampling for high-volume logs
- Archive old logs to cheaper storage

---

## Troubleshooting

### High CPU Usage
1. Check APM for slow endpoints
2. Review database query performance
3. Look for memory leaks
4. Check for infinite loops

### Memory Leaks
1. Enable Node.js memory profiling
2. Check for unclosed connections
3. Review event listener registrations
4. Use heap snapshots for analysis

### Slow Responses
1. Check database query times
2. Review external API calls
3. Check cache hit rates
4. Analyze middleware overhead

---

## Next Steps

1. **Implement APM**: Choose and integrate an APM solution
2. **Set Up Dashboards**: Create monitoring dashboards
3. **Configure Alerts**: Define alert rules and channels
4. **Test Alerting**: Verify alerts are working
5. **Document Runbooks**: Create incident response procedures
6. **Regular Reviews**: Schedule monthly metric reviews
