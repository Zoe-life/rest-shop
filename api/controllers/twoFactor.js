/**
 * @module controllers/twoFactor
 * @description Two-factor authentication controller
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/user');
const { logInfo, logError } = require('../../utils/logger');

/**
 * Setup 2FA - Generate secret and QR code
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.setup2FA = async (req, res) => {
    try {
        const userId = req.userData.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        if (user.twoFactorEnabled) {
            return res.status(400).json({
                message: '2FA is already enabled'
            });
        }

        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `REST Shop (${user.email})`,
            length: 32
        });

        // Store secret temporarily (not enabled yet)
        user.twoFactorSecret = secret.base32;
        await user.save();

        // Generate QR code
        const qrCode = await QRCode.toDataURL(secret.otpauth_url);

        logInfo('2FA setup initiated', { userId: user._id });

        res.status(200).json({
            message: '2FA setup initiated',
            secret: secret.base32,
            qrCode
        });
    } catch (error) {
        logError('2FA setup failed', error);
        res.status(500).json({
            message: '2FA setup failed'
        });
    }
};

/**
 * Verify and enable 2FA
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.enable2FA = async (req, res) => {
    try {
        const userId = req.userData.userId;
        const { token } = req.body;

        const user = await User.findById(userId);

        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({
                message: 'Please setup 2FA first'
            });
        }

        // Verify token
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 2
        });

        if (!verified) {
            return res.status(400).json({
                message: 'Invalid verification code'
            });
        }

        // Generate backup codes
        const backupCodes = [];
        for (let i = 0; i < 10; i++) {
            const code = Math.random().toString(36).substring(2, 10).toUpperCase();
            backupCodes.push(code);
        }

        user.twoFactorEnabled = true;
        user.twoFactorBackupCodes = backupCodes;
        await user.save();

        logInfo('2FA enabled', { userId: user._id });

        res.status(200).json({
            message: '2FA enabled successfully',
            backupCodes
        });
    } catch (error) {
        logError('2FA enable failed', error);
        res.status(500).json({
            message: '2FA enable failed'
        });
    }
};

/**
 * Verify 2FA token during login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verify2FA = async (req, res) => {
    try {
        const { userId, token } = req.body;

        const user = await User.findById(userId);

        if (!user || !user.twoFactorEnabled) {
            return res.status(400).json({
                message: 'Invalid request'
            });
        }

        // Check if it's a backup code
        const backupCodeIndex = user.twoFactorBackupCodes.indexOf(token);
        if (backupCodeIndex !== -1) {
            // Remove used backup code
            user.twoFactorBackupCodes.splice(backupCodeIndex, 1);
            await user.save();
            
            logInfo('2FA verified with backup code', { userId: user._id });
            return res.status(200).json({
                message: 'Verified with backup code',
                verified: true,
                backupCodesRemaining: user.twoFactorBackupCodes.length
            });
        }

        // Verify TOTP token
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 2
        });

        if (!verified) {
            logError('2FA verification failed', { userId: user._id });
            return res.status(400).json({
                message: 'Invalid verification code'
            });
        }

        logInfo('2FA verified successfully', { userId: user._id });

        res.status(200).json({
            message: '2FA verified successfully',
            verified: true
        });
    } catch (error) {
        logError('2FA verification error', error);
        res.status(500).json({
            message: '2FA verification failed'
        });
    }
};

/**
 * Disable 2FA
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.disable2FA = async (req, res) => {
    try {
        const userId = req.userData.userId;
        const { password } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        // Verify password
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(401).json({
                message: 'Invalid password'
            });
        }

        user.twoFactorEnabled = false;
        user.twoFactorSecret = undefined;
        user.twoFactorBackupCodes = [];
        await user.save();

        logInfo('2FA disabled', { userId: user._id });

        res.status(200).json({
            message: '2FA disabled successfully'
        });
    } catch (error) {
        logError('2FA disable failed', error);
        res.status(500).json({
            message: '2FA disable failed'
        });
    }
};
