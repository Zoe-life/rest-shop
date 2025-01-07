/**
 * @module routes/user
 * @description User authentication and management routes
 */

const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user');
const checkAuth = require('../middleware/check-auth');
const rateLimit = require('express-rate-limit');

/**
 * Rate limiter configuration for login attempts
 * @constant {RateLimit}
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // limit each IP to 5 login attempts per windowMs
});

/**
 * @route POST /signup
 * @description Register a new user
 * @access Public
 * @middleware Rate limiter (5 requests per hour)
 */
router.post('/signup', rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }), UserController.user_signup);

/**
 * @route POST /login
 * @description Authenticate a user and generate JWT token
 * @access Public
 * @middleware Rate limiter (5 requests per 15 minutes)
 */
router.post('/login', loginLimiter, UserController.user_login);

/**
 * @route DELETE /:userId
 * @description Delete a user account
 * @access Private
 * @middleware Authentication required
 * @param {string} userId - The ID of the user to delete
 */
router.delete('/:userId', checkAuth, UserController.user_delete);

module.exports = router;