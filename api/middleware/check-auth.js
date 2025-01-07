/**
 * @module middleware/check-auth
 * @description Authentication middleware to verify JWT tokens
 */

const jwt = require('jsonwebtoken');

/**
 * Authentication middleware
 * @function checkAuth
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 * @throws {401} - Unauthorized if token is missing, invalid, or expired
 * 
 * @description
 * Validates JWT token from Authorization header.
 * Expects token in format: "Bearer <token>"
 * Adds decoded user data to request object if valid.
 */
module.exports = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                message: 'No auth token provided'
            });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({
                message: 'Invalid token format'
            });
        }

        /**
         * @typedef {Object} DecodedToken
         * @property {string} userId - ID of the authenticated user
         * @property {string} email - Email of the authenticated user
         * @property {string} role - Role of the authenticated user
         */
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        req.userData = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Token expired'
            });
        }
        return res.status(401).json({
            message: 'Auth failed'
        });
    }
};