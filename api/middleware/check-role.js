/**
 * @module middleware/check-role
 * @description Role-based access control middleware
 */

const { logWarn } = require('../utils/logger');

/**
 * Creates middleware for role-based access control
 * @function checkRole
 * @param {string[]} roles - Array of allowed roles for the route
 * @returns {Function} Express middleware function
 *
 * @example
 * // Allow only admin access
 * router.delete('/', checkRole(['admin']), deleteHandler);
 *
 * // Allow both admin and user access
 * router.get('/', checkRole(['admin', 'user']), getHandler);
 */
const checkRole = (roles) => {
    /**
     * Role checking middleware
     * @param {Object} req - Express request object
     * @param {Object} req.userData - User data from JWT token
     * @param {string} req.userData.role - User's role
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     * @returns {void}
     * @throws {401} - If no user data is present
     * @throws {403} - If user's role is not in allowed roles
     */
    return (req, res, next) => {
        if (!req.userData) {
            logWarn('RBAC: request has no user data', {
                path: req.originalUrl,
                method: req.method
            });
            return res.status(401).json({
                message: 'Auth failed - No user data'
            });
        }

        if (!roles.includes(req.userData.role)) {
            logWarn('RBAC: access denied – insufficient permissions', {
                userId: req.userData.userId,
                userRole: req.userData.role,
                requiredRoles: roles,
                path: req.originalUrl,
                method: req.method
            });
            return res.status(403).json({
                message: 'Forbidden - Insufficient permissions'
            });
        }

        next();
    };
};

module.exports = checkRole;