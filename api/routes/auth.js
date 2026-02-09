/**
 * @module routes/auth
 * @description OAuth 2.0 authentication routes for Google, Microsoft, and Apple
 */

const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const { logInfo, logError } = require('../../utils/logger');
const { logTokenGenerated, logAuthFailure } = require('../utils/auditLogger');

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
            
            // Set token in HTTP-only cookie for security
            res.cookie('authToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // HTTPS only in production
                sameSite: 'lax',
                maxAge: 3600000 // 1 hour
            });
            
            // Redirect to frontend success page (token is in cookie, not URL)
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/auth/success`);
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
            
            // Set token in HTTP-only cookie for security
            res.cookie('authToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 3600000 // 1 hour
            });
            
            // Redirect to frontend success page (token is in cookie, not URL)
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/auth/success`);
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
 * @route GET /auth/apple
 * @description Initiate Apple OAuth 2.0 authentication
 * @access Public
 */
router.get('/apple',
    passport.authenticate('apple', { 
        scope: ['email', 'name'],
        session: false 
    })
);

/**
 * @route GET /auth/apple/callback
 * @description Apple OAuth 2.0 callback - Secure token handling
 * @access Public
 */
router.post('/apple/callback',
    passport.authenticate('apple', { 
        failureRedirect: '/auth/failure',
        session: false 
    }),
    (req, res) => {
        try {
            // Generate JWT token
            const token = generateToken(req.user, req);
            
            // Set token in HTTP-only cookie for security
            res.cookie('authToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 3600000 // 1 hour
            });
            
            // Redirect to frontend success page (token is in cookie, not URL)
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/auth/success`);
        } catch (error) {
            logError('Apple OAuth callback error', error);
            logAuthFailure({
                email: req.user?.email,
                outcome: 'failure',
                reason: 'Token generation failed',
                metadata: { provider: 'apple' }
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
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });
    
    res.status(200).json({
        message: 'Logged out successfully'
    });
});

/**
 * @route GET /auth/token
 * @description Get token from cookie - For frontend to retrieve token securely
 * @access Public (but requires cookie to be present)
 * @note This endpoint should only be called from the same-origin frontend after OAuth redirect
 */
router.get('/token', (req, res) => {
    const token = req.cookies?.authToken;
    
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
        // Token is invalid or expired
        res.clearCookie('authToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
        return res.status(401).json({
            message: 'Invalid or expired token'
        });
    }
});

module.exports = router;
