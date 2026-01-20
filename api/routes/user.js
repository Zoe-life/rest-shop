/**
 * @module routes/user
 * @description User authentication and management routes
 */

const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user');
const checkAuth = require('../middleware/check-auth');
const { 
    authLimiter, 
    signupLimiter, 
    userValidation,
    validateObjectId 
} = require('../middleware/security');

/**
 * @route POST /signup
 * @description Register a new user
 * @access Public
 * @middleware Rate limiter (5 requests per hour), Input validation
 */
router.post('/signup', signupLimiter, userValidation.signup, UserController.user_signup);

/**
 * @route POST /login
 * @description Authenticate a user and generate JWT token
 * @access Public
 * @middleware Rate limiter (5 requests per 15 minutes), Input validation
 */
router.post('/login', authLimiter, userValidation.login, UserController.user_login);

/**
 * @route DELETE /:userId
 * @description Delete a user account
 * @access Private
 * @middleware Authentication required, ObjectId validation
 * @param {string} userId - The ID of the user to delete
 */
router.delete('/:userId', checkAuth, validateObjectId('userId'), UserController.user_delete);

module.exports = router;