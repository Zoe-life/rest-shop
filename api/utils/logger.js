/**
 * @module utils/logger
 * @description Secure logging utility that prevents sensitive data exposure.
 *
 * Security measures:
 *  - Sensitive fields are redacted before any output (console or file).
 *  - Stack traces are omitted in production to avoid leaking internal paths.
 *  - Error-level entries are written to logs/app-error.log (mode 0o600, dir 0o700)
 *    so the file is only readable by the process owner.
 *  - Log verbosity is controlled via the LOG_LEVEL env var (error|warn|info|debug).
 *    Defaults to "info" in production and "debug" in all other environments.
 */

const fs = require('fs');
const path = require('path');

/**
 * Numeric level map – lower number = higher priority
 * @type {Object.<string, number>}
 */
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

/**
 * Resolve the effective numeric log level from environment.
 * @returns {number}
 */
function resolveLogLevel() {
    const envLevel = (process.env.LOG_LEVEL || '').toLowerCase();
    if (envLevel in LOG_LEVELS) return LOG_LEVELS[envLevel];
    // Default: info in production, debug everywhere else
    return process.env.NODE_ENV === 'production' ? LOG_LEVELS.info : LOG_LEVELS.debug;
}

/**
 * Current log level – re-evaluated each call so changes to process.env take effect.
 */
function currentLevel() {
    return resolveLogLevel();
}

// ---------------------------------------------------------------------------
// Secure file logging for ERROR-level entries
// ---------------------------------------------------------------------------

const isCloudflareWorker = typeof process !== 'undefined' &&
                           typeof process.versions?.workerd !== 'undefined';

let APP_ERROR_LOG_FILE = null;

if (!isCloudflareWorker && typeof __filename !== 'undefined') {
    const utilsDir = path.dirname(__filename);
    const projectRoot = path.dirname(utilsDir);
    const logDir = process.env.APP_LOG_DIR
        ? (() => {
            const resolved = path.resolve(process.env.APP_LOG_DIR);
            // Prevent directory traversal: the resolved path must be inside the
            // project root.  We use path.relative() which handles '..' segments
            // correctly on all platforms (unlike a simple startsWith check).
            const relative = path.relative(path.resolve(projectRoot), resolved);
            if (relative.startsWith('..') || path.isAbsolute(relative)) {
                console.warn('APP_LOG_DIR outside project root, using default logs/');
                return path.join(projectRoot, 'logs');
            }
            return resolved;
        })()
        : path.join(projectRoot, 'logs');

    APP_ERROR_LOG_FILE = path.join(logDir, 'app-error.log');

    // Create log directory with owner-only permissions (rwx------) if absent
    try {
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
        }
        // Ensure the log file exists with 0o600 (owner rw only).
        // - If the file doesn't exist yet, create an empty one with the correct mode.
        // - If it already exists (e.g. from a previous run), chmod it to 0o600
        //   so that any file created with looser default umask is tightened.
        if (!fs.existsSync(APP_ERROR_LOG_FILE)) {
            fs.writeFileSync(APP_ERROR_LOG_FILE, '', { mode: 0o600 });
        } else {
            fs.chmodSync(APP_ERROR_LOG_FILE, 0o600);
        }
    } catch (e) {
        console.warn('Logger: could not initialise log file:', e.message);
        APP_ERROR_LOG_FILE = null;
    }
}

/**
 * Append a line to the error log file.
 * @param {string} line - JSON log entry
 */
function writeErrorLog(line) {
    if (!APP_ERROR_LOG_FILE) return;
    fs.appendFile(APP_ERROR_LOG_FILE, line + '\n', 'utf8', (err) => {
        if (err) console.error('Logger: failed to write app-error.log:', err.message);
    });
}

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
    'privateKey',
    'phoneNumber',
    'phone',
    'mpesaReceiptNumber',
    'transactionId',
    'checkoutRequestId'
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
    if (currentLevel() < LOG_LEVELS.info) return;
    const timestamp = new Date().toISOString();
    if (data) {
        const safeData = redactSensitiveData(data);
        console.log(`[${timestamp}] INFO: ${message}`, JSON.stringify(safeData, null, 2));
    } else {
        console.log(`[${timestamp}] INFO: ${message}`);
    }
}

/**
 * Log error message with sensitive data redaction.
 * Also writes to logs/app-error.log (owner-only readable) for persistent auditing.
 * @param {string} message - Log message
 * @param {Error|Object} error - Error object or data to log
 */
function logError(message, error = null) {
    if (currentLevel() < LOG_LEVELS.error) return;
    const timestamp = new Date().toISOString();
    let errorInfo = null;
    if (error) {
        errorInfo = {
            message: error.message || 'Unknown error',
            code: error.code || undefined
        };
        // Only include stack trace in non-production environments
        if (process.env.NODE_ENV !== 'production') {
            errorInfo.stack = error.stack || 'No stack trace';
        }
        console.error(`[${timestamp}] ERROR: ${message}`, JSON.stringify(errorInfo, null, 2));
    } else {
        console.error(`[${timestamp}] ERROR: ${message}`);
    }

    // Persist error-level entries to file
    writeErrorLog(JSON.stringify({
        timestamp,
        level: 'error',
        message,
        ...(errorInfo && { error: errorInfo })
    }));
}

/**
 * Log warning message
 * @param {string} message - Log message
 * @param {Object} data - Data to log (optional)
 */
function logWarn(message, data = null) {
    if (currentLevel() < LOG_LEVELS.warn) return;
    const timestamp = new Date().toISOString();
    if (data) {
        const safeData = redactSensitiveData(data);
        console.warn(`[${timestamp}] WARN: ${message}`, JSON.stringify(safeData, null, 2));
    } else {
        console.warn(`[${timestamp}] WARN: ${message}`);
    }
}

/**
 * Log debug message (only emitted when LOG_LEVEL=debug)
 * @param {string} message - Log message
 * @param {Object} data - Data to log (optional)
 */
function logDebug(message, data = null) {
    if (currentLevel() < LOG_LEVELS.debug) return;
    const timestamp = new Date().toISOString();
    if (data) {
        const safeData = redactSensitiveData(data);
        console.debug(`[${timestamp}] DEBUG: ${message}`, JSON.stringify(safeData, null, 2));
    } else {
        console.debug(`[${timestamp}] DEBUG: ${message}`);
    }
}

module.exports = {
    logInfo,
    logError,
    logWarn,
    logDebug,
    redactSensitiveData
};
