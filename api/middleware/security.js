/**
 * @module middleware/security
 * @description Security middleware configuration
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const xss = require('xss');

/**
 * Configure Helmet for security headers
 */
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    frameguard: {
        action: 'deny'
    },
    noSniff: true,
    xssFilter: true
});

/**
 * Cache for rate limiter instances to avoid recreating them on every request
 */
let apiLimiterInstance = null;
let authLimiterInstance = null;
let signupLimiterInstance = null;

/**
 * Factory function for API rate limiter
 * Lazily initialized to avoid async operations in global scope (Cloudflare Workers requirement)
 */
function getApiLimiter() {
    if (!apiLimiterInstance) {
        apiLimiterInstance = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // Limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again later.',
            standardHeaders: true,
            legacyHeaders: false,
        });
    }
    return apiLimiterInstance;
}

/**
 * Factory function for authentication rate limiter
 * Lazily initialized to avoid async operations in global scope (Cloudflare Workers requirement)
 */
function getAuthLimiter() {
    if (!authLimiterInstance) {
        authLimiterInstance = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5, // Limit each IP to 5 requests per windowMs
            message: 'Too many authentication attempts, please try again later.',
            standardHeaders: true,
            legacyHeaders: false,
        });
    }
    return authLimiterInstance;
}

/**
 * Factory function for signup rate limiter
 * Lazily initialized to avoid async operations in global scope (Cloudflare Workers requirement)
 */
function getSignupLimiter() {
    if (!signupLimiterInstance) {
        signupLimiterInstance = rateLimit({
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 5, // Limit each IP to 5 signups per hour
            message: 'Too many accounts created, please try again later.',
            standardHeaders: true,
            legacyHeaders: false,
        });
    }
    return signupLimiterInstance;
}

/**
 * Middleware wrapper for API rate limiter
 */
const apiLimiter = (req, res, next) => {
    return getApiLimiter()(req, res, next);
};

/**
 * Middleware wrapper for authentication rate limiter
 */
const authLimiter = (req, res, next) => {
    return getAuthLimiter()(req, res, next);
};

/**
 * Middleware wrapper for signup rate limiter
 */
const signupLimiter = (req, res, next) => {
    return getSignupLimiter()(req, res, next);
};

/**
 * Validation error handler middleware
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

/**
 * Sanitize input to prevent XSS and injection attacks
 * Uses the 'xss' library for comprehensive XSS protection
 */
const sanitizeInput = (req, res, next) => {
    // Sanitize body
    if (req.body) {
        for (let key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = xss(req.body[key].trim());
            }
        }
    }
    
    // Sanitize query parameters
    if (req.query) {
        for (let key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = xss(req.query[key].trim());
            }
        }
    }
    
    next();
};

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = (paramName) => {
    return param(paramName)
        .isMongoId()
        .withMessage(`Invalid ${paramName} format`);
};

/**
 * User validation rules
 */
const userValidation = {
    signup: [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
        handleValidationErrors
    ],
    login: [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        body('password')
            .notEmpty()
            .withMessage('Password is required'),
        handleValidationErrors
    ]
};

/**
 * Product validation rules
 */
const productValidation = {
    create: [
        body('name')
            .trim()
            .isLength({ min: 1, max: 200 })
            .withMessage('Product name must be between 1 and 200 characters'),
        body('price')
            .isFloat({ min: 0 })
            .withMessage('Price must be a positive number'),
        handleValidationErrors
    ],
    update: [
        body('name')
            .optional()
            .trim()
            .isLength({ min: 1, max: 200 })
            .withMessage('Product name must be between 1 and 200 characters'),
        body('price')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Price must be a positive number'),
        handleValidationErrors
    ]
};

/**
 * Order validation rules
 */
const orderValidation = {
    create: [
        body('productId')
            .isMongoId()
            .withMessage('Invalid product ID format'),
        body('quantity')
            .isInt({ min: 1, max: 100 })
            .withMessage('Quantity must be between 1 and 100'),
        handleValidationErrors
    ]
};

module.exports = {
    helmetConfig,
    apiLimiter,
    authLimiter,
    signupLimiter,
    sanitizeInput,
    validateObjectId,
    userValidation,
    productValidation,
    orderValidation,
    handleValidationErrors
};
