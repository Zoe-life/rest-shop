/**
 * @module routes/auth
 * @description OAuth 2.0 authentication routes for Google and Microsoft
 */

const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const { logInfo, logError } = require('../utils/logger');
const { logTokenGenerated, logAuthFailure } = require('../utils/auditLogger');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Safely extract IP address from request
 * @param {Object} req - Express request object
 * @returns {string} IP address or 'unknown'
 */
function getClientIp(req) {
    return req.ip || 
           (req.connection && req.connection.remoteAddress) || 
           (req.socket && req.socket.remoteAddress) || 
           'unknown';
}

/**
 * Safely extract user agent from request
 * @param {Object} req - Express request object
 * @returns {string} User agent or 'unknown'
 */
function getUserAgent(req) {
    if (typeof req.get === 'function') {
        return req.get('user-agent') || 'unknown';
    }
    return (req.headers && req.headers['user-agent']) || 'unknown';
}

/**
 * Generate JWT token for authenticated user
 * @param {Object} user - User object
 * @param {Object} req - Request object for logging
 * @returns {string} JWT token
 */
const generateToken = (user, req = null) => {
    const token = jwt.sign(
        {
            email: user.email,
            userId: user._id,
            role: user.role
        },
        process.env.JWT_KEY,
        {
            expiresIn: "1h"
        }
    );
    
    // Log token generation for audit trail
    if (req) {
        logInfo('JWT token generated', { userId: user._id, email: user.email });
        logTokenGenerated({
            userId: user._id.toString(),
            email: user.email,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            outcome: 'success'
        });
    }
    
    return token;
};

/**
 * @route GET /auth/google
 * @description Initiate Google OAuth 2.0 authentication
 * @access Public
 */
router.get('/google',
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        session: false 
    })
);

/**
 * @route GET /auth/google/callback
 * @description Google OAuth 2.0 callback - Secure token handling
 * @access Public
 */
router.get('/google/callback',
    passport.authenticate('google', { 
        failureRedirect: '/auth/failure',
        session: false 
    }),
    (req, res) => {
        try {
            // Generate JWT token
            const token = generateToken(req.user, req);
            
            // Pass token as a URL query parameter so the frontend can read it
            // regardless of which domain set the OAuth callback (avoids cross-domain
            // cookie issues when the backend and the Cloudflare Worker proxy are on
            // different origins).
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/auth/success?token=${encodeURIComponent(token)}`);
        } catch (error) {
            logError('Google OAuth callback error', error);
            logAuthFailure({
                email: req.user?.email,
                outcome: 'failure',
                reason: 'Token generation failed',
                metadata: { provider: 'google' }
            });
            res.redirect('/auth/failure');
        }
    }
);

/**
 * @route GET /auth/microsoft
 * @description Initiate Microsoft OAuth 2.0 authentication
 * @access Public
 */
router.get('/microsoft',
    passport.authenticate('microsoft', { 
        scope: ['user.read'],
        session: false 
    })
);

/**
 * @route GET /auth/microsoft/callback
 * @description Microsoft OAuth 2.0 callback - Secure token handling
 * @access Public
 */
router.get('/microsoft/callback',
    passport.authenticate('microsoft', { 
        failureRedirect: '/auth/failure',
        session: false 
    }),
    (req, res) => {
        try {
            // Generate JWT token
            const token = generateToken(req.user, req);
            
            // Pass token as a URL query parameter so the frontend can read it
            // regardless of which domain set the OAuth callback (avoids cross-domain
            // cookie issues when the backend and the Cloudflare Worker proxy are on
            // different origins).
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/auth/success?token=${encodeURIComponent(token)}`);
        } catch (error) {
            logError('Microsoft OAuth callback error', error);
            logAuthFailure({
                email: req.user?.email,
                outcome: 'failure',
                reason: 'Token generation failed',
                metadata: { provider: 'microsoft' }
            });
            res.redirect('/auth/failure');
        }
    }
);

/**
 * @route GET /auth/failure
 * @description OAuth authentication failure page
 * @access Public
 */
router.get('/failure', (req, res) => {
    logAuthFailure({
        outcome: 'failure',
        reason: 'OAuth authentication unsuccessful'
    });
    res.status(401).json({
        message: 'Authentication failed'
    });
});

/**
 * @route GET /auth/logout
 * @description Logout endpoint - Clear auth cookie
 * @access Public
 */
router.get('/logout', (req, res) => {
    // Clear the auth cookie
    res.clearCookie('authToken', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax'
    });
    
    res.status(200).json({
        message: 'Logged out successfully'
    });
});

/**
 * @route GET /auth/token
 * @description Get token from cookie or verify token from Authorization header
 * @access Public (but requires cookie or valid Authorization header to be present)
 * @note Cookie flow: called from the same-origin frontend after OAuth redirect.
 *       Header flow: clients may send "Authorization: Bearer <token>" to verify
 *       and retrieve token metadata.
 */
router.get('/token', (req, res) => {
    // Prefer Authorization: Bearer header when present
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else {
        token = req.cookies?.authToken;
    }

    if (!token) {
        return res.status(401).json({
            message: 'No authentication token found'
        });
    }
    
    // Verify the token is valid before returning it
    try {
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        
        // Return token to frontend (so it can be used in Authorization headers)
        // After frontend retrieves token, it should call /auth/logout to clear cookie
        res.status(200).json({
            token: token,
            expiresAt: new Date(decoded.exp * 1000).toISOString()
        });
    } catch (error) {
        // Token is invalid or expired; only clear the cookie when it was the source
        if (!authHeader) {
            res.clearCookie('authToken', {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'none' : 'lax'
            });
        }
        return res.status(401).json({
            message: 'Invalid or expired token'
        });
    }
});

module.exports = router;
