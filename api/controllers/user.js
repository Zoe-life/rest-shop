/**
 * @module controllers/user
 * @description User authentication and management controller
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { logInfo, logError } = require('../../utils/logger');
const { logUserSignup, logUserLogin, logAuthFailure, logUserDeleted } = require('../../utils/auditLogger');

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
                
                res.status(201).json({
                    message: 'User created'
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
                    expiresIn: "1h"
                }
            );
            
            // Log successful login with audit trail
            logInfo('User logged in successfully', { userId: user[0]._id, email: user[0].email });
            logUserLogin({
                userId: user[0]._id.toString(),
                email: user[0].email,
                ipAddress: getClientIp(req),
                userAgent: getUserAgent(req),
                outcome: 'success'
            });
            
            return res.status(200).json({
                message: 'Auth successful',
                token: token
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