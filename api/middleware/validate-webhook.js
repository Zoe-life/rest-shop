/**
 * @module middleware/validate-webhook
 * @description Webhook validation middleware for secure callback handling
 */

const crypto = require('crypto');
const { logWarn, logError, logInfo } = require('../../utils/logger');

/**
 * Get client IP address from request
 * Only trusts x-forwarded-for if the request comes from a trusted proxy
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIP(req) {
    // In production with a trusted reverse proxy (like Cloudflare or AWS ELB),
    // use the leftmost IP in x-forwarded-for (the original client IP)
    // Otherwise, use the direct connection IP
    
    const trustProxy = process.env.TRUST_PROXY === 'true';
    
    if (trustProxy) {
        const forwardedFor = req.headers['x-forwarded-for'];
        if (forwardedFor) {
            // Get the first IP in the chain (original client)
            const ips = forwardedFor.split(',').map(ip => ip.trim());
            return ips[0];
        }
        
        const realIp = req.headers['x-real-ip'];
        if (realIp) {
            return realIp.trim();
        }
    }
    
    // Fallback to direct connection IP
    return req.ip || req.connection.remoteAddress || 'unknown';
}

/**
 * Validate M-Pesa webhook based on IP allowlist
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function validateMpesaWebhook(req, res, next) {
    const clientIP = getClientIP(req);

    // Get allowed IPs from environment variable
    const allowedIPsEnv = process.env.MPESA_ALLOWED_IPS;

    // In production, IP allowlist MUST be configured
    if (!allowedIPsEnv || allowedIPsEnv.trim() === '') {
        if (process.env.NODE_ENV === 'production') {
            logError('M-Pesa webhook IP allowlist not configured in production', {
                clientIP,
                environment: process.env.NODE_ENV
            });
            return res.status(403).json({
                message: 'Webhook access denied - configuration error'
            });
        }
        
        // In non-production, log warning but allow
        logWarn('M-Pesa webhook IP allowlist not configured', {
            clientIP,
            environment: process.env.NODE_ENV
        });
        return next();
    }

    // Parse allowed IPs
    const allowedIPs = allowedIPsEnv.split(',').map(ip => ip.trim()).filter(ip => ip);

    if (allowedIPs.length === 0) {
        logError('M-Pesa webhook IP allowlist is empty', {
            clientIP,
            environment: process.env.NODE_ENV
        });
        return res.status(403).json({
            message: 'Webhook access denied'
        });
    }

    // Check if client IP is in the allowlist
    if (!allowedIPs.includes(clientIP)) {
        logWarn('M-Pesa webhook request from unauthorized IP', {
            clientIP,
            allowedIPs: allowedIPs.length
        });
        return res.status(403).json({
            message: 'Webhook access denied'
        });
    }

    // IP is authorized
    logInfo('M-Pesa webhook IP validated', {
        clientIP
    });
    
    next();
}

/**
 * Validate webhook signature
 * @param {string} secret - Shared secret for HMAC validation
 * @returns {Function} Express middleware function
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

        try {
            // Compute expected signature
            const payload = JSON.stringify(req.body);
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');

            // Validate that both signatures are the same length to prevent timing attacks
            // and DoS from malformed signatures
            const signatureBuffer = Buffer.from(signature, 'hex');
            const expectedBuffer = Buffer.from(expectedSignature, 'hex');
            
            if (signatureBuffer.length !== expectedBuffer.length) {
                logWarn('Invalid webhook signature length', {
                    receivedLength: signatureBuffer.length,
                    expectedLength: expectedBuffer.length
                });
                return res.status(403).json({
                    message: 'Invalid webhook signature'
                });
            }

            // Compare signatures (constant-time comparison to prevent timing attacks)
            if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
                logWarn('Invalid webhook signature', {
                    receivedSignature: signature.substring(0, 10) + '...'
                });
                return res.status(403).json({
                    message: 'Invalid webhook signature'
                });
            }

            // Signature is valid
            next();
        } catch (error) {
            logError('Webhook signature validation error', error);
            return res.status(500).json({
                message: 'Error validating webhook signature'
            });
        }
    };
}

module.exports = {
    validateMpesaWebhook,
    validateWebhookSignature,
    getClientIP
};
