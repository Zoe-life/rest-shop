/**
 * @module controllers/auth
 * @description Authentication controller for email verification and password reset
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { logInfo, logError } = require('../utils/logger');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

/**
 * Request email verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.requestEmailVerification = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if user exists
            return res.status(200).json({
                message: 'If an account exists with this email, a verification link has been sent.'
            });
        }

        if (user.emailVerified) {
            return res.status(400).json({
                message: 'Email is already verified'
            });
        }

        // Generate verification token
        const token = crypto.randomBytes(32).toString('hex');
        user.emailVerificationToken = token;
        user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        await user.save();

        // Send verification email
        await sendVerificationEmail(user.email, token);

        logInfo('Email verification requested', { userId: user._id, email: user.email });

        res.status(200).json({
            message: 'Verification email sent successfully'
        });
    } catch (error) {
        logError('Email verification request failed', error);
        res.status(500).json({
            message: 'Failed to send verification email'
        });
    }
};

/**
 * Verify email with token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                message: 'Invalid or expired verification token'
            });
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        logInfo('Email verified successfully', { userId: user._id, email: user.email });

        res.status(200).json({
            message: 'Email verified successfully'
        });
    } catch (error) {
        logError('Email verification failed', error);
        res.status(500).json({
            message: 'Email verification failed'
        });
    }
};

/**
 * Request password reset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if user exists
            return res.status(200).json({
                message: 'If an account exists with this email, a password reset link has been sent.'
            });
        }

        // Generate reset token
        const token = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = token;
        user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
        await user.save();

        // Send reset email
        await sendPasswordResetEmail(user.email, token);

        logInfo('Password reset requested', { userId: user._id, email: user.email });

        res.status(200).json({
            message: 'Password reset email sent successfully'
        });
    } catch (error) {
        logError('Password reset request failed', error);
        res.status(500).json({
            message: 'Failed to send password reset email'
        });
    }
};

/**
 * Reset password with token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long'
            });
        }

        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                message: 'Invalid or expired reset token'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        logInfo('Password reset successfully', { userId: user._id, email: user.email });

        res.status(200).json({
            message: 'Password reset successfully'
        });
    } catch (error) {
        logError('Password reset failed', error);
        res.status(500).json({
            message: 'Password reset failed'
        });
    }
};
