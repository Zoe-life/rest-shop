/**
 * @module utils/logger
 * @description Secure logging utility that prevents sensitive data exposure
 */

/**
 * Fields that should be redacted from logs
 */
const SENSITIVE_FIELDS = [
    'password',
    'hash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'privateKey'
];

/**
 * Recursively redact sensitive fields from an object
 * @param {*} obj - Object to redact
 * @returns {*} Redacted object
 */
function redactSensitiveData(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => redactSensitiveData(item));
    }

    const redacted = {};
    for (const [key, value] of Object.entries(obj)) {
        if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
            redacted[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            redacted[key] = redactSensitiveData(value);
        } else {
            redacted[key] = value;
        }
    }
    return redacted;
}

/**
 * Log information message with sensitive data redaction
 * @param {string} message - Log message
 * @param {Object} data - Data to log (optional)
 */
function logInfo(message, data = null) {
    const timestamp = new Date().toISOString();
    if (data) {
        const safeData = redactSensitiveData(data);
        console.log(`[${timestamp}] INFO: ${message}`, JSON.stringify(safeData, null, 2));
    } else {
        console.log(`[${timestamp}] INFO: ${message}`);
    }
}

/**
 * Log error message with sensitive data redaction
 * @param {string} message - Log message
 * @param {Error|Object} error - Error object or data to log
 */
function logError(message, error = null) {
    const timestamp = new Date().toISOString();
    if (error) {
        // Log error message and stack trace, but redact sensitive data from error object
        const errorInfo = {
            message: error.message || 'Unknown error',
            stack: error.stack || 'No stack trace',
            code: error.code || undefined
        };
        console.error(`[${timestamp}] ERROR: ${message}`, JSON.stringify(errorInfo, null, 2));
    } else {
        console.error(`[${timestamp}] ERROR: ${message}`);
    }
}

/**
 * Log warning message
 * @param {string} message - Log message
 * @param {Object} data - Data to log (optional)
 */
function logWarn(message, data = null) {
    const timestamp = new Date().toISOString();
    if (data) {
        const safeData = redactSensitiveData(data);
        console.warn(`[${timestamp}] WARN: ${message}`, JSON.stringify(safeData, null, 2));
    } else {
        console.warn(`[${timestamp}] WARN: ${message}`);
    }
}

module.exports = {
    logInfo,
    logError,
    logWarn,
    redactSensitiveData
};
