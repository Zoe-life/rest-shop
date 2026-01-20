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
 * Audit log directory
 */
const AUDIT_LOG_DIR = process.env.AUDIT_LOG_DIR || path.join(__dirname, '../logs');
const AUDIT_LOG_FILE = path.join(AUDIT_LOG_DIR, 'audit.log');

/**
 * Ensure audit log directory exists
 */
function ensureLogDirectory() {
    if (!fs.existsSync(AUDIT_LOG_DIR)) {
        fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true });
    }
}

/**
 * Write audit log entry
 * @param {Object} entry - Audit log entry
 */
function writeAuditLog(entry) {
    try {
        ensureLogDirectory();
        const logLine = JSON.stringify(entry) + '\n';
        fs.appendFileSync(AUDIT_LOG_FILE, logLine, 'utf8');
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
