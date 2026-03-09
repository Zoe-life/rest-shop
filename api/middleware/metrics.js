/**
 * @module middleware/metrics
 * @description Prometheus metrics collection middleware for SRE observability.
 *
 * Collects:
 *  - HTTP request duration (histogram, labelled by method/route/status)
 *  - HTTP request total count (counter, labelled by method/route/status)
 *  - In-flight HTTP requests (gauge)
 *  - Database connection state (gauge, updated on each request)
 *
 * Usage:
 *   const { metricsMiddleware, register } = require('./middleware/metrics');
 *   app.use(metricsMiddleware);
 *   app.get('/metrics', metricsHandler);
 */

const client = require('prom-client');
const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
// Use the default registry so that prom-client's built-in default metrics
// (event-loop lag, GC, memory, CPU, etc.) are automatically included.
const register = client.register;

// Collect default Node.js runtime metrics (GC, event loop, memory, CPU…)
client.collectDefaultMetrics({ register });

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------

const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
});

const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

const httpRequestsInFlight = new client.Gauge({
    name: 'http_requests_in_flight',
    help: 'Number of HTTP requests currently being processed',
    registers: [register],
});

const dbConnectionState = new client.Gauge({
    name: 'mongodb_connection_state',
    help: 'MongoDB connection state (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)',
    registers: [register],
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise an Express route path to avoid high-cardinality label values.
 * Replaces concrete IDs with placeholders, e.g.
 *   /products/64abc123  →  /products/:id
 *   /user/me            →  /user/me   (unchanged)
 *
 * Static-asset paths (e.g. /uploads/<filename>) are collapsed to a single
 * generic label to prevent an unbounded number of Prometheus time series.
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
function normaliseRoute(req) {
    // Prefer the matched Express route pattern when available
    if (req.route && req.route.path) {
        const base = req.baseUrl || '';
        return base + req.route.path;
    }

    const fullPath = (req.originalUrl || '').split('?')[0]
        || ((req.baseUrl || '') + (req.path || req.url || ''))
        || 'unknown';

    // Collapse static-file upload paths to avoid per-filename time series
    if (fullPath.startsWith('/uploads/')) {
        return '/uploads/:filename';
    }

    // Fall back to the raw URL path with IDs replaced
    return fullPath
        .replace(/\/[0-9a-f]{24}/gi, '/:id')   // MongoDB ObjectIds
        .replace(/\/\d+/g, '/:id');             // Numeric IDs
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Express middleware that records Prometheus metrics for every HTTP request.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function metricsMiddleware(req, res, next) {
    // Skip the /metrics endpoint itself to avoid self-referential noise
    if (req.path === '/metrics') return next();

    const startTime = process.hrtime.bigint();
    httpRequestsInFlight.inc();

    // Update DB state gauge on each request (cheap read from Mongoose)
    dbConnectionState.set(mongoose.connection.readyState);

    res.on('finish', () => {
        const durationNs = Number(process.hrtime.bigint() - startTime);
        const durationSec = durationNs / 1e9;

        const labels = {
            method: req.method,
            route: normaliseRoute(req),
            status_code: String(res.statusCode),
        };

        httpRequestDuration.observe(labels, durationSec);
        httpRequestsTotal.inc(labels);
        httpRequestsInFlight.dec();
    });

    next();
}

module.exports = { metricsMiddleware, normaliseRoute, register };
