/**
 * @module middleware/validate-webhook
 * @description Middleware for validating webhook requests
 */

const { logWarn, logError } = require('../../utils/logger');
const crypto = require('crypto');

/**
 * Get client IP address from request
 * Handles various proxy scenarios
 * @param {Object} req - Express request object
 * @returns {string} - Client IP address
 */
function getClientIP(req) {
    // Check common proxy headers
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        // x-forwarded-for can contain multiple IPs, get the first one
        return forwarded.split(',')[0].trim();
    }
    
    const realIP = req.headers['x-real-ip'];
    if (realIP) {
        return realIP.trim();
    }
    
    // Fallback to connection remote address
    return req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           req.connection.socket?.remoteAddress ||
           'unknown';
}

/**
 * Validate M-Pesa webhook request
 * Implements IP allowlist validation
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function validateMpesaWebhook(req, res, next) {
    const clientIP = getClientIP(req);
    
    // Get allowed IPs from environment variable
    const allowedIPsEnv = process.env.MPESA_ALLOWED_IPS;
    
    // If no IPs are configured, log warning but allow the request
    // This is for development/testing - in production, IPs should be configured
    if (!allowedIPsEnv || allowedIPsEnv.trim() === '') {
        if (process.env.NODE_ENV === 'production') {
            logWarn('M-Pesa webhook IP allowlist not configured in production', {
                clientIP,
                environment: process.env.NODE_ENV
            });
        }
        // Allow request to proceed with warning
        return next();
    }
    
    // Parse allowed IPs
    const allowedIPs = allowedIPsEnv.split(',').map(ip => ip.trim()).filter(ip => ip);
    
    // Check if client IP is in allowlist
    if (!allowedIPs.includes(clientIP)) {
        logWarn('M-Pesa webhook request from unauthorized IP', {
            clientIP,
            allowedIPs: allowedIPs.length
        });
        
        return res.status(403).json({
            ResultCode: 1,
            ResultDesc: 'Access denied'
        });
    }
    
    // IP is authorized
    next();
}

/**
 * Validate webhook signature (generic implementation)
 * This can be extended for services that provide webhook signatures
 * 
 * @param {string} secret - Webhook secret
 * @returns {Function} - Middleware function
 */
function validateWebhookSignature(secret) {
    return (req, res, next) => {
        const signature = req.headers['x-webhook-signature'] || req.headers['x-signature'];
        
        if (!signature) {
            logWarn('Webhook signature missing', {
                headers: Object.keys(req.headers)
            });
            return res.status(401).json({
                message: 'Webhook signature required'
            });
        }
        
        // Compute expected signature
        const payload = JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
        
        // Compare signatures (constant-time comparison to prevent timing attacks)
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
            logWarn('Invalid webhook signature', {
                receivedSignature: signature.substring(0, 10) + '...'
            });
            return res.status(403).json({
                message: 'Invalid webhook signature'
            });
        }
        
        // Signature is valid
        next();
    };
}

module.exports = {
    validateMpesaWebhook,
    validateWebhookSignature,
    getClientIP
};
