/**
 * @module controllers/user
 * @description User authentication and management controller
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { logInfo, logError } = require('../utils/logger');
const { logUserSignup, logUserLogin, logAuthFailure, logUserDeleted } = require('../utils/auditLogger');

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
 * Create a new user account
 * @async
 * @function user_signup
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email
 * @param {string} req.body.password - User's password
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {409} - If email already exists
 * @throws {500} - If server error occurs
 */
exports.user_signup = async (req, res, next) => {
    try {
        const user = await User.find({email: req.body.email}).exec();
        if (user.length >= 1) {
            return res.status(409).json({
                message: 'User email already exists'
            });
        }
        
        bcrypt.hash(req.body.password, 10, async (err, hash) => {
            if (err) {
                logError('Password hashing failed', err);
                return res.status(500).json({
                    message: 'Server error occurred during signup'
                });
            }
            const newUser = new User({
                _id: new mongoose.Types.ObjectId(),
                email: req.body.email,
                password: hash
            });
            try {
                const result = await newUser.save();
                
                // Log successful signup with audit trail
                logInfo('User created successfully', { userId: result._id, email: result.email });
                logUserSignup({
                    userId: result._id.toString(),
                    email: result.email,
                    ipAddress: getClientIp(req),
                    userAgent: getUserAgent(req),
                    outcome: 'success'
                });
                
                // Generate JWT token for the new user
                const token = jwt.sign(
                    {
                        email: result.email,
                        userId: result._id,
                        role: result.role
                    },
                    process.env.JWT_KEY,
                    {
                        expiresIn: process.env.JWT_EXPIRATION || "1h"
                    }
                );
                
                res.status(201).json({
                    message: 'User created',
                    token: token,
                    user: {
                        _id: result._id,
                        email: result.email,
                        role: result.role
                    }
                })
            } catch (err) {
                logError('User creation failed', err);
                logUserSignup({
                    email: req.body.email,
                    ipAddress: getClientIp(req),
                    userAgent: getUserAgent(req),
                    outcome: 'failure',
                    reason: err.code === 11000 ? 'Duplicate email' : 'Database error'
                });
                res.status(500).json({
                    message: 'Server error occurred during signup'
                });
            }
        });
    } catch (err) {
        logError('User signup error', err);
        logUserSignup({
            email: req.body.email,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            outcome: 'failure',
            reason: 'Unexpected error'
        });
        res.status(500).json({
            message: 'Server error occurred during signup'
        });
    }
};

/**
 * Authenticate user and generate JWT
 * @async
 * @function user_login
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email
 * @param {string} req.body.password - User's password
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {401} - If authentication fails
 * @throws {500} - If server error occurs
 */
exports.user_login = async (req, res, next) => {
    try {
        const email = req.body && req.body.email;
        if (typeof email !== 'string' || email.trim() === '') {
            logAuthFailure({
                email: email,
                ipAddress: getClientIp(req),
                userAgent: getUserAgent(req),
                outcome: 'failure',
                reason: 'Invalid email format'
            });
            return res.status(400).json({
                message: 'Invalid credentials'
            });
        }
        // normalize email to a trimmed string to avoid passing non-primitive values into the query
        req.body.email = email.trim();

        const user = await User.find({ email: req.body.email }).exec();
        if (user.length < 1) {
            return res.status(401).json({
                message: 'Auth failed'
            });
        }
        bcrypt.compare(req.body.password, user[0].password, (err, result) => {
            if (err || !result) {
                logAuthFailure({
                    email: req.body.email,
                    ipAddress: getClientIp(req),
                    userAgent: getUserAgent(req),
                    outcome: 'failure',
                    reason: 'Invalid credentials'
                });
                return res.status(401).json({
                    message: 'Auth failed'
                });
            }
            
            const token = jwt.sign(
                {
                    email: user[0].email,
                    userId: user[0]._id,
                    role: user[0].role
                },
                process.env.JWT_KEY,
                {
                    expiresIn: process.env.JWT_EXPIRATION || "1h"
                }
            );
            
            // Log successful login with audit trail (without exposing email in logs)
            logInfo('User logged in successfully', { userId: user[0]._id });
            logUserLogin({
                userId: user[0]._id.toString(),
                email: user[0].email,
                ipAddress: getClientIp(req),
                userAgent: getUserAgent(req),
                outcome: 'success'
            });
            
            return res.status(200).json({
                message: 'Auth successful',
                token: token,
                user: {
                    _id: user[0]._id,
                    email: user[0].email,
                    role: user[0].role
                }
            });
        });
    } catch (err) {
        logError('User login error', err);
        logAuthFailure({
            email: req.body && req.body.email,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            outcome: 'failure',
            reason: 'Server error'
        });
        res.status(500).json({
            message: 'Server error occurred during login'
        });
    }
};

/**
 * Get the current user's profile
 * @async
 * @function user_get_profile
 * @param {Object} req - Express request object (requires req.userData from checkAuth)
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 * @throws {404} - If user not found
 * @throws {500} - If server error occurs
 */
exports.user_get_profile = async (req, res) => {
    try {
        const user = await User.findById(req.userData.userId)
            .select('-password -twoFactorSecret -twoFactorBackupCodes -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires')
            .exec();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ user });
    } catch (err) {
        logError('Get profile error', err);
        res.status(500).json({ message: 'Server error occurred while fetching profile' });
    }
};

/**
 * Update the current user's profile (displayName)
 * @async
 * @function user_update_profile
 * @param {Object} req - Express request object (requires req.userData from checkAuth)
 * @param {Object} req.body.displayName - New display name
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 * @throws {404} - If user not found
 * @throws {500} - If server error occurs
 */
exports.user_update_profile = async (req, res) => {
    try {
        const { displayName, phone, bio, address } = req.body;

        // Build a $set payload from only the fields supplied in the request body.
        // Using $set with dot-notation for the address sub-document means individual
        // address fields can be updated without overwriting the whole object.
        const updates = {};
        if (displayName !== undefined) updates.displayName = displayName;
        if (phone !== undefined) updates.phone = phone;
        if (bio !== undefined) updates.bio = bio;
        if (address && typeof address === 'object') {
            if (address.street !== undefined) updates['address.street'] = address.street;
            if (address.city !== undefined) updates['address.city'] = address.city;
            if (address.state !== undefined) updates['address.state'] = address.state;
            if (address.postalCode !== undefined) updates['address.postalCode'] = address.postalCode;
            if (address.country !== undefined) updates['address.country'] = address.country;
        }

        const user = await User.findByIdAndUpdate(
            req.userData.userId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password -twoFactorSecret -twoFactorBackupCodes -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires')
         .exec();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        logInfo('User profile updated', { userId: user._id });
        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (err) {
        logError('Update profile error', err);
        res.status(500).json({ message: 'Server error occurred while updating profile' });
    }
};

/**
 * Upload or replace the current user's profile avatar
 * @async
 * @function user_upload_avatar
 * @param {Object} req - Express request object (requires req.userData from checkAuth, req.file from multer)
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 * @throws {400} - If no file is provided
 * @throws {404} - If user not found
 * @throws {500} - If server error occurs
 */
exports.user_upload_avatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }
        const user = await User.findByIdAndUpdate(
            req.userData.userId,
            { $set: { avatarUrl: req.file.path } },
            { new: true }
        ).select('-password -twoFactorSecret -twoFactorBackupCodes -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires')
         .exec();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        logInfo('User avatar updated', { userId: user._id });
        res.status(200).json({ message: 'Avatar updated successfully', user });
    } catch (err) {
        logError('Upload avatar error', err);
        res.status(500).json({ message: 'Server error occurred while uploading avatar' });
    }
};

/**
 * Change the current user's password (local accounts only)
 * @async
 * @function user_change_password
 * @param {Object} req - Express request object (requires req.userData from checkAuth)
 * @param {Object} req.body.currentPassword - Current password
 * @param {Object} req.body.newPassword - New password
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 * @throws {400} - If OAuth user or passwords don't match
 * @throws {404} - If user not found
 * @throws {500} - If server error occurs
 */
exports.user_change_password = async (req, res) => {
    try {
        const user = await User.findById(req.userData.userId).exec();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.provider && user.provider !== 'local') {
            return res.status(400).json({ message: 'Password change is not available for OAuth accounts' });
        }
        const match = await bcrypt.compare(req.body.currentPassword, user.password);
        if (!match) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        const hash = await bcrypt.hash(req.body.newPassword, 10);
        user.password = hash;
        await user.save();
        logInfo('User password changed', { userId: user._id });
        res.status(200).json({ message: 'Password changed successfully' });
    } catch (err) {
        logError('Change password error', err);
        res.status(500).json({ message: 'Server error occurred while changing password' });
    }
};

/**
 * Delete a user account
 * @async
 * @function user_delete
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.userId - ID of user to delete
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {500} - If server error occurs
 */
exports.user_delete = (req, res, next) => {
    // Security: Verify user can only delete their own account (unless admin)
    if (req.userData.userId !== req.params.userId && req.userData.role !== 'admin') {
        logError('Unauthorized user deletion attempt', { 
            requestedBy: req.userData.userId, 
            targetUser: req.params.userId 
        });
        return res.status(403).json({
            message: 'Forbidden: You can only delete your own account'
        });
    }

    User.deleteOne({ _id: req.params.userId })
    .exec()
    .then(result => {
        logInfo('User deleted successfully', { userId: req.params.userId });
        logUserDeleted({
            userId: req.params.userId,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            outcome: 'success'
        });
        res.status(200).json({
            message: 'User deleted'
        })
    })
    .catch(err => {
        logError('User deletion failed', err);
        logUserDeleted({
            userId: req.params.userId,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            outcome: 'failure',
            reason: 'Database error'
        });
        res.status(500).json({
            message: 'Server error occurred during user deletion'
        });
    });
};