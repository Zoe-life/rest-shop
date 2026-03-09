/**
 * @module routes/metrics
 * @description Prometheus metrics endpoint.
 *
 * The endpoint is secured by a bearer token (METRICS_TOKEN env var).
 * In development, the token check is skipped when METRICS_TOKEN is not set so
 * that local testing is frictionless.
 *
 * In production, always set METRICS_TOKEN to a strong random secret and
 * configure your Prometheus scrape job with that token:
 *
 *   scrape_configs:
 *     - job_name: rest-shop
 *       bearer_token: <your METRICS_TOKEN>
 *       static_configs:
 *         - targets: ['your-render-host:443']
 */

const express = require('express');
const router = express.Router();
const { register } = require('../middleware/metrics');
const { logWarn } = require('../utils/logger');

/**
 * Bearer-token guard for the metrics endpoint.
 * Allows unauthenticated access only in non-production environments without
 * a configured token (i.e. local development convenience).
 */
function requireMetricsToken(req, res, next) {
    const token = process.env.METRICS_TOKEN;
    const isProduction = process.env.NODE_ENV === 'production';

    // If no token is configured and we're not in production, allow access
    if (!token && !isProduction) return next();

    const authHeader = req.headers.authorization || '';
    const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!provided || provided !== token) {
        logWarn('[Metrics] Unauthorized access attempt to /metrics', {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

/**
 * GET /metrics
 * Returns Prometheus-format metrics.
 */
router.get('/', requireMetricsToken, async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).end(err.message);
    }
});

module.exports = router;
