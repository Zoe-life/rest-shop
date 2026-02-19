/**
 * @module middleware/check-auth
 * @description Authentication middleware to verify JWT tokens
 */

const jwt = require('jsonwebtoken');
const { logWarn } = require('../utils/logger');

/**
 * Safely extract the client IP for logging.
 * `req.ip` is Express-aware: if `trust proxy` is enabled (or the TRUST_PROXY
 * env var is set), Express unpacks X-Forwarded-For automatically so this
 * already returns the real client IP when running behind a reverse proxy.
 */
function getClientIp(req) {
    return req.ip ||
           (req.connection && req.connection.remoteAddress) ||
           (req.socket && req.socket.remoteAddress) ||
           'unknown';
}

/**
 * Authentication middleware
 * @function checkAuth
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 * @throws {401} - Unauthorized if token is missing, invalid, or expired
 *
 * @description
 * Validates JWT token from Authorization header.
 * Expects token in format: "Bearer <token>"
 * Adds decoded user data to request object if valid.
 */
module.exports = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            logWarn('Auth: missing Authorization header', {
                ip: getClientIp(req),
                path: req.originalUrl,
                method: req.method
            });
            return res.status(401).json({
                message: 'No auth token provided'
            });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            logWarn('Auth: invalid Authorization header format', {
                ip: getClientIp(req),
                path: req.originalUrl,
                method: req.method
            });
            return res.status(401).json({
                message: 'Invalid token format'
            });
        }

        /**
         * @typedef {Object} DecodedToken
         * @property {string} userId - ID of the authenticated user
         * @property {string} email - Email of the authenticated user
         * @property {string} role - Role of the authenticated user
         */
        const jwtKey = process.env.JWT_KEY;
        if (!jwtKey) {
            return res.status(500).json({
                message: 'JWT key not configured'
            });
        }
        const decoded = jwt.verify(token, jwtKey);
        req.userData = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            logWarn('Auth: token expired', {
                ip: getClientIp(req),
                path: req.originalUrl,
                method: req.method
            });
            return res.status(401).json({
                message: 'Token expired'
            });
        }
        logWarn('Auth: invalid token', {
            ip: getClientIp(req),
            path: req.originalUrl,
            method: req.method,
            errorName: error.name
        });
        return res.status(401).json({
            message: 'Auth failed'
        });
    }
};