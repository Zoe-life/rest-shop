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
const { generateOAuthState, verifyOAuthState } = require('../utils/oauthState');
const { createCode, consumeCode } = require('../utils/authCodeStore');
const User = require('../models/user');

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
router.get('/google', (req, res, next) => {
    // Generate an HMAC-signed state value for CSRF protection (RFC 6749 §10.12).
    // The state is self-verifying at callback time — no cookie is needed.
    // This avoids the cross-domain cookie problem that occurs when OAuth initiation
    // passes through the Cloudflare Worker proxy but the provider callback goes
    // directly to the Node.js backend on a different origin.
    const state = generateOAuthState();
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
        state
    })(req, res, next);
});

/**
 * @route GET /auth/google/callback
 * @description Google OAuth 2.0 callback - Secure token handling
 * @access Public
 */
router.get('/google/callback',
    (req, res, next) => {
        // Verify the HMAC-signed state to prevent CSRF (RFC 6749 §10.12).
        // We use a stateless HMAC check instead of a cookie so that this works
        // correctly even when the initiation request travelled through a different
        // origin (e.g. the Cloudflare Worker proxy) than the callback.
        if (!verifyOAuthState(req.query.state)) {
            logAuthFailure({
                outcome: 'failure',
                reason: 'OAuth state verification failed (possible CSRF attack)',
                metadata: { provider: 'google' }
            });
            return res.redirect('/auth/failure');
        }
        next();
    },
    passport.authenticate('google', { 
        failureRedirect: '/auth/failure',
        session: false 
    }),
    async (req, res) => {
        try {
            // Issue a short-lived, single-use exchange code instead of a real JWT.
            // The real JWT is never placed in the URL, keeping it out of browser
            // history, server logs, and Referer headers (see POST /auth/exchange).
            const code = createCode(req.user._id);

            logInfo('OAuth exchange code issued', { userId: req.user._id, provider: 'google' });

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/auth/success?code=${code}`);
        } catch (error) {
            logError('Google OAuth callback error', error);
            logAuthFailure({
                email: req.user?.email,
                outcome: 'failure',
                reason: 'Exchange code generation failed',
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
router.get('/microsoft', (req, res, next) => {
    // Generate an HMAC-signed state value for CSRF protection (RFC 6749 §10.12).
    // Stateless — no cookie required. See /auth/google for full rationale.
    const state = generateOAuthState();
    passport.authenticate('microsoft', {
        scope: ['user.read'],
        session: false,
        state
    })(req, res, next);
});

/**
 * @route GET /auth/microsoft/callback
 * @description Microsoft OAuth 2.0 callback - Secure token handling
 * @access Public
 */
router.get('/microsoft/callback',
    (req, res, next) => {
        // Verify the HMAC-signed state to prevent CSRF (RFC 6749 §10.12).
        // Stateless — no cookie required. See /auth/google/callback for full rationale.
        if (!verifyOAuthState(req.query.state)) {
            logAuthFailure({
                outcome: 'failure',
                reason: 'OAuth state verification failed (possible CSRF attack)',
                metadata: { provider: 'microsoft' }
            });
            return res.redirect('/auth/failure');
        }
        next();
    },
    passport.authenticate('microsoft', { 
        failureRedirect: '/auth/failure',
        session: false 
    }),
    async (req, res) => {
        try {
            // Issue a short-lived, single-use exchange code instead of a real JWT.
            // See the Google callback and POST /auth/exchange for full rationale.
            const code = createCode(req.user._id);

            logInfo('OAuth exchange code issued', { userId: req.user._id, provider: 'microsoft' });

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/auth/success?code=${code}`);
        } catch (error) {
            logError('Microsoft OAuth callback error', error);
            logAuthFailure({
                email: req.user?.email,
                outcome: 'failure',
                reason: 'Exchange code generation failed',
                metadata: { provider: 'microsoft' }
            });
            res.redirect('/auth/failure');
        }
    }
);

/**
 * @route POST /auth/exchange
 * @description Exchange a single-use code for a real JWT.
 *
 * The code is a short-lived (30 s) random token kept in an in-memory Map after
 * OAuth authentication.  The frontend sends it here immediately after being
 * redirected, receives the JWT in the JSON response body, and the code is
 * deleted so it can never be reused.  This keeps the real JWT out of browser
 * history, server logs, and Referer headers.
 *
 * @access Public
 */
router.post('/exchange', async (req, res) => {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: 'Exchange code is required' });
    }

    try {
        // consumeCode atomically retrieves and removes the entry (single-use guarantee).
        const userId = consumeCode(code);

        if (!userId) {
            logAuthFailure({
                outcome: 'failure',
                reason: 'Invalid or expired OAuth exchange code'
            });
            return res.status(401).json({ message: 'Invalid or expired exchange code' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        const token = generateToken(user, req);

        logInfo('JWT issued via exchange code', { userId: user._id, email: user.email });

        // Decode the token to report the accurate expiry derived from the JWT itself.
        const decoded = jwt.decode(token);
        res.status(200).json({
            token,
            expiresAt: new Date(decoded.exp * 1000).toISOString()
        });
    } catch (error) {
        logError('Auth exchange error', error);
        res.status(500).json({ message: 'Authentication exchange failed' });
    }
});

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
