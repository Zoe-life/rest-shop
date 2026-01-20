/**
 * @module routes/auth
 * @description OAuth 2.0 authentication routes for Google, Microsoft, and Apple
 */

const express = require('express');
const router = express.Router();
const passport = require('../../config/passport');
const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for authenticated user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateToken = (user) => {
    return jwt.sign(
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
 * @description Google OAuth 2.0 callback
 * @access Public
 */
router.get('/google/callback',
    passport.authenticate('google', { 
        failureRedirect: '/auth/failure',
        session: false 
    }),
    (req, res) => {
        // Generate JWT token
        const token = generateToken(req.user);
        
        // Redirect to frontend with token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/auth/success?token=${token}`);
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
 * @description Microsoft OAuth 2.0 callback
 * @access Public
 */
router.get('/microsoft/callback',
    passport.authenticate('microsoft', { 
        failureRedirect: '/auth/failure',
        session: false 
    }),
    (req, res) => {
        // Generate JWT token
        const token = generateToken(req.user);
        
        // Redirect to frontend with token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/auth/success?token=${token}`);
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
 * @description Apple OAuth 2.0 callback
 * @access Public
 */
router.post('/apple/callback',
    passport.authenticate('apple', { 
        failureRedirect: '/auth/failure',
        session: false 
    }),
    (req, res) => {
        // Generate JWT token
        const token = generateToken(req.user);
        
        // Redirect to frontend with token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/auth/success?token=${token}`);
    }
);

/**
 * @route GET /auth/failure
 * @description OAuth authentication failure page
 * @access Public
 */
router.get('/failure', (req, res) => {
    res.status(401).json({
        message: 'Authentication failed',
        error: 'OAuth authentication was unsuccessful'
    });
});

/**
 * @route GET /auth/logout
 * @description Logout endpoint (client should delete token)
 * @access Public
 */
router.get('/logout', (req, res) => {
    res.status(200).json({
        message: 'Logged out successfully',
        note: 'Please delete your JWT token on the client side'
    });
});

module.exports = router;
