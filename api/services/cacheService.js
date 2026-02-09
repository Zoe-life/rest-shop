/**
 * @module services/cacheService
 * @description Redis caching service for performance optimization
 */

const Redis = require('ioredis');
const { logInfo, logError, logWarn } = require('../utils/logger');

let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis connection
 * @returns {Object} Redis client instance
 */
const initializeRedis = () => {
    if (redisClient && isConnected) {
        return redisClient;
    }

    try {
        // Skip Redis in test environment if not explicitly enabled
        if (process.env.NODE_ENV === 'test' && !process.env.REDIS_URL) {
            logInfo('Redis disabled in test environment');
            return null;
        }

        const redisConfig = process.env.REDIS_URL 
            ? process.env.REDIS_URL
            : {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT) || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                maxRetriesPerRequest: 3
            };

        redisClient = new Redis(redisConfig);

        redisClient.on('connect', () => {
            isConnected = true;
            logInfo('Redis connected successfully');
        });

        redisClient.on('error', (err) => {
            isConnected = false;
            logError('Redis connection error', err);
        });

        redisClient.on('close', () => {
            isConnected = false;
            logWarn('Redis connection closed');
        });

        return redisClient;
    } catch (error) {
        logError('Failed to initialize Redis', error);
        return null;
    }
};

/**
 * Get cached data
 * @param {string} key - Cache key
 * @returns {Promise<any>} Cached data or null
 */
exports.get = async (key) => {
    try {
        if (!redisClient || !isConnected) {
            return null;
        }

        const data = await redisClient.get(key);
        if (data) {
            logInfo('Cache hit', { key });
            return JSON.parse(data);
        }
        logInfo('Cache miss', { key });
        return null;
    } catch (error) {
        logError('Cache get error', { key, error: error.message });
        return null;
    }
};

/**
 * Set cached data with expiration
 * @param {string} key - Cache key
 * @param {any} value - Data to cache
 * @param {number} ttl - Time to live in seconds (default: 300)
 * @returns {Promise<boolean>} Success status
 */
exports.set = async (key, value, ttl = 300) => {
    try {
        if (!redisClient || !isConnected) {
            return false;
        }

        const serialized = JSON.stringify(value);
        await redisClient.setex(key, ttl, serialized);
        logInfo('Cache set', { key, ttl });
        return true;
    } catch (error) {
        logError('Cache set error', { key, error: error.message });
        return false;
    }
};

/**
 * Delete cached data
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
exports.del = async (key) => {
    try {
        if (!redisClient || !isConnected) {
            return false;
        }

        await redisClient.del(key);
        logInfo('Cache deleted', { key });
        return true;
    } catch (error) {
        logError('Cache delete error', { key, error: error.message });
        return false;
    }
};

/**
 * Delete cached data matching a pattern
 * @param {string} pattern - Cache key pattern (e.g., 'products:*')
 * @returns {Promise<boolean>} Success status
 */
exports.delPattern = async (pattern) => {
    try {
        if (!redisClient || !isConnected) {
            return false;
        }

        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(...keys);
            logInfo('Cache pattern deleted', { pattern, count: keys.length });
        }
        return true;
    } catch (error) {
        logError('Cache pattern delete error', { pattern, error: error.message });
        return false;
    }
};

/**
 * Flush all cached data
 * @returns {Promise<boolean>} Success status
 */
exports.flushAll = async () => {
    try {
        if (!redisClient || !isConnected) {
            return false;
        }

        await redisClient.flushall();
        logInfo('Cache flushed');
        return true;
    } catch (error) {
        logError('Cache flush error', error);
        return false;
    }
};

/**
 * Get Redis client instance
 * @returns {Object} Redis client
 */
exports.getClient = () => {
    if (!redisClient) {
        return initializeRedis();
    }
    return redisClient;
};

/**
 * Check if Redis is connected
 * @returns {boolean} Connection status
 */
exports.isConnected = () => isConnected;

/**
 * Close Redis connection
 * @returns {Promise<void>}
 */
exports.disconnect = async () => {
    if (redisClient) {
        await redisClient.quit();
        isConnected = false;
        logInfo('Redis disconnected');
    }
};

// Initialize Redis on module load
initializeRedis();
