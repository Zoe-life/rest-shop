/**
 * @module utils/auditLogger
 * @description Audit logging system for security-critical events
 */

const fs = require('fs');
const path = require('path');

/**
 * Audit event types
 */
const AuditEventTypes = {
    USER_SIGNUP: 'USER_SIGNUP',
    USER_LOGIN: 'USER_LOGIN',
    USER_LOGOUT: 'USER_LOGOUT',
    OAUTH_LOGIN: 'OAUTH_LOGIN',
    AUTH_FAILURE: 'AUTH_FAILURE',
    TOKEN_GENERATED: 'TOKEN_GENERATED',
    USER_DELETED: 'USER_DELETED',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE'
};

/**
 * Detect if running in Cloudflare Workers environment
 * workerd is the runtime used by Cloudflare Workers
 */
const isCloudflareWorker = typeof process !== 'undefined' && 
                           typeof process.versions?.workerd !== 'undefined';

/**
 * Audit log directory with security checks
 * Note: File system operations are only available in Node.js, not in Cloudflare Workers
 */
let AUDIT_LOG_DIR = null;
let AUDIT_LOG_FILE = null;

if (!isCloudflareWorker && typeof __filename !== 'undefined') {
    // Only set up file paths in Node.js environment where __filename is available
    // Use __filename to get the path to this module, then go up one level
    const utilsDir = path.dirname(__filename);
    const projectRoot = path.dirname(utilsDir);
    const DEFAULT_LOG_DIR = path.join(projectRoot, 'logs');
    
    AUDIT_LOG_DIR = (() => {
        const envLogDir = process.env.AUDIT_LOG_DIR;
        if (!envLogDir) return DEFAULT_LOG_DIR;
        
        // Validate and sanitize the log directory path
        const resolvedPath = path.resolve(envLogDir);
        const basePath = path.resolve(projectRoot);
        
        // Ensure the log directory is within the application directory
        if (!resolvedPath.startsWith(basePath)) {
            console.warn('AUDIT_LOG_DIR outside app directory, using default');
            return DEFAULT_LOG_DIR;
        }
        
        return resolvedPath;
    })();
    
    AUDIT_LOG_FILE = path.join(AUDIT_LOG_DIR, 'audit.log');
}

/**
 * Ensure audit log directory exists with secure permissions
 */
function ensureLogDirectory() {
    if (isCloudflareWorker || !AUDIT_LOG_DIR) return;
    
    if (!fs.existsSync(AUDIT_LOG_DIR)) {
        // Create directory with restricted permissions (owner only)
        fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true, mode: 0o700 });
    }
}

/**
 * Write audit log entry asynchronously
 * @param {Object} entry - Audit log entry
 */
function writeAuditLog(entry) {
    try {
        // In Cloudflare Workers, only console logging is available
        if (isCloudflareWorker || !AUDIT_LOG_FILE) {
            return; // Console logging is handled in logAuditEvent
        }
        
        ensureLogDirectory();
        const logLine = JSON.stringify(entry) + '\n';
        
        // Use async append to avoid blocking the event loop
        fs.appendFile(AUDIT_LOG_FILE, logLine, 'utf8', (err) => {
            if (err) {
                console.error('Failed to write audit log:', err.message);
            }
        });
    } catch (error) {
        console.error('Failed to write audit log:', error.message);
    }
}

/**
 * Log an audit event
 * @param {string} eventType - Type of event (from AuditEventTypes)
 * @param {Object} details - Event details
 * @param {string} details.userId - User ID (if applicable)
 * @param {string} details.email - User email (if applicable)
 * @param {string} details.ipAddress - IP address
 * @param {string} details.userAgent - User agent
 * @param {string} details.outcome - Event outcome ('success' or 'failure')
 * @param {string} details.reason - Reason for failure (if applicable)
 * @param {Object} details.metadata - Additional metadata
 */
function logAuditEvent(eventType, details = {}) {
    const auditEntry = {
        timestamp: new Date().toISOString(),
        eventType,
        userId: details.userId || null,
        email: details.email || null,
        ipAddress: details.ipAddress || null,
        userAgent: details.userAgent || null,
        outcome: details.outcome || 'unknown',
        reason: details.reason || null,
        metadata: details.metadata || {}
    };

    // Write to audit log file
    writeAuditLog(auditEntry);

    // Also log to console for monitoring systems
    console.log(`[AUDIT] ${eventType}:`, JSON.stringify(auditEntry));
}

/**
 * Log user signup event
 * @param {Object} details - Event details
 */
function logUserSignup(details) {
    logAuditEvent(AuditEventTypes.USER_SIGNUP, details);
}

/**
 * Log user login event
 * @param {Object} details - Event details
 */
function logUserLogin(details) {
    logAuditEvent(AuditEventTypes.USER_LOGIN, details);
}

/**
 * Log OAuth login event
 * @param {Object} details - Event details
 */
function logOAuthLogin(details) {
    logAuditEvent(AuditEventTypes.OAUTH_LOGIN, details);
}

/**
 * Log authentication failure event
 * @param {Object} details - Event details
 */
function logAuthFailure(details) {
    logAuditEvent(AuditEventTypes.AUTH_FAILURE, details);
}

/**
 * Log token generation event
 * @param {Object} details - Event details
 */
function logTokenGenerated(details) {
    logAuditEvent(AuditEventTypes.TOKEN_GENERATED, details);
}

/**
 * Log user deletion event
 * @param {Object} details - Event details
 */
function logUserDeleted(details) {
    logAuditEvent(AuditEventTypes.USER_DELETED, details);
}

module.exports = {
    AuditEventTypes,
    logAuditEvent,
    logUserSignup,
    logUserLogin,
    logOAuthLogin,
    logAuthFailure,
    logTokenGenerated,
    logUserDeleted
};
