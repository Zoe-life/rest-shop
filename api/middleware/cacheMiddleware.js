/**
 * @module middleware/cacheMiddleware
 * @description Middleware for caching API responses
 */

const cacheService = require('../services/cacheService');
const { logInfo } = require('../../utils/logger');

/**
 * Cache middleware factory
 * @param {Object} options - Cache options
 * @param {number} options.ttl - Time to live in seconds (default: 300)
 * @param {Function} options.keyGenerator - Function to generate cache key
 * @returns {Function} Express middleware
 */
exports.cacheMiddleware = (options = {}) => {
    const {
        ttl = 300,
        keyGenerator = (req) => `cache:${req.method}:${req.originalUrl}`
    } = options;

    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Skip caching if explicitly disabled
        if (req.query.nocache === 'true') {
            return next();
        }

        try {
            const cacheKey = keyGenerator(req);
            const cachedData = await cacheService.get(cacheKey);

            if (cachedData) {
                logInfo('Serving from cache', { key: cacheKey });
                return res.status(200).json(cachedData);
            }

            // Store original res.json
            const originalJson = res.json.bind(res);

            // Override res.json to cache the response
            res.json = function (data) {
                // Only cache successful responses
                if (res.statusCode === 200) {
                    cacheService.set(cacheKey, data, ttl).catch(err => {
                        // Silent fail - don't break the request
                    });
                }
                return originalJson(data);
            };

            next();
        } catch (error) {
            // Don't break the request if caching fails
            next();
        }
    };
};

/**
 * Invalidate cache for a specific pattern
 * @param {string} pattern - Cache key pattern
 * @returns {Function} Express middleware
 */
exports.invalidateCache = (pattern) => {
    return async (req, res, next) => {
        try {
            await cacheService.delPattern(pattern);
            logInfo('Cache invalidated', { pattern });
        } catch (error) {
            // Silent fail
        }
        next();
    };
};
