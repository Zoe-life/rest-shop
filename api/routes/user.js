/**
 * @module routes/user
 * @description User authentication and management routes
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const UserController = require('../controllers/user');
const AuthController = require('../controllers/auth');
const TwoFactorController = require('../controllers/twoFactor');
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
 * @route GET /user/profile
 * @description Get current user's profile
 * @access Private
 * @middleware Authentication required
 */
router.get('/profile', checkAuth, UserController.user_get_profile);

/**
 * @route PATCH /user/profile
 * @description Update current user's profile (displayName)
 * @access Private
 * @middleware Authentication required, Input validation
 */
router.patch(
    '/profile',
    checkAuth,
    [
        body('displayName')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Display name must be between 1 and 100 characters'),
        require('../middleware/security').handleValidationErrors
    ],
    UserController.user_update_profile
);

/**
 * @route PUT /user/profile/password
 * @description Change current user's password (local accounts only)
 * @access Private
 * @middleware Authentication required, Input validation
 */
router.put(
    '/profile/password',
    checkAuth,
    [
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        body('newPassword')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])[^\s]+$/)
            .withMessage('Password must contain uppercase, lowercase, number, and special character'),
        require('../middleware/security').handleValidationErrors
    ],
    UserController.user_change_password
);

/**
 * @route DELETE /:userId
 * @description Delete a user account
 * @access Private
 * @middleware Authentication required, ObjectId validation
 * @param {string} userId - The ID of the user to delete
 */
router.delete('/:userId', checkAuth, validateObjectId('userId'), UserController.user_delete);

/**
 * @route POST /request-verification
 * @description Request email verification link
 * @access Public
 */
router.post('/request-verification', authLimiter, AuthController.requestEmailVerification);

/**
 * @route GET /verify-email/:token
 * @description Verify email with token
 * @access Public
 */
router.get('/verify-email/:token', AuthController.verifyEmail);

/**
 * @route POST /request-password-reset
 * @description Request password reset link
 * @access Public
 */
router.post('/request-password-reset', authLimiter, AuthController.requestPasswordReset);

/**
 * @route POST /reset-password/:token
 * @description Reset password with token
 * @access Public
 * @middleware Rate limiter to prevent brute-force token attacks
 */
router.post('/reset-password/:token', authLimiter, AuthController.resetPassword);

/**
 * @route POST /2fa/setup
 * @description Setup 2FA for user account
 * @access Private
 */
router.post('/2fa/setup', checkAuth, TwoFactorController.setup2FA);

/**
 * @route POST /2fa/enable
 * @description Enable 2FA after verification
 * @access Private
 */
router.post('/2fa/enable', checkAuth, TwoFactorController.enable2FA);

/**
 * @route POST /2fa/verify
 * @description Verify 2FA token
 * @access Public
 */
router.post('/2fa/verify', TwoFactorController.verify2FA);

/**
 * @route POST /2fa/disable
 * @description Disable 2FA
 * @access Private
 */
router.post('/2fa/disable', checkAuth, TwoFactorController.disable2FA);

module.exports = router;