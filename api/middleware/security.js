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
    if (process.env.NODE_ENV === 'test') {
        return (req, res, next) => next();
    }

    if (!apiLimiterInstance) {
        apiLimiterInstance = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 100,
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
    if (process.env.NODE_ENV === 'test') {
        return (req, res, next) => next();
    }

    if (!authLimiterInstance) {
        authLimiterInstance = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 5,
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
    if (process.env.NODE_ENV === 'test') {
        return (req, res, next) => next();
    }

    if (!signupLimiterInstance) {
        signupLimiterInstance = rateLimit({
            windowMs: 60 * 60 * 1000,
            max: 5,
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
 * Recursively sanitizes nested objects and arrays
 */
const sanitizeInput = (req, res, next) => {
    /**
     * Recursively sanitize values (handles nested objects and arrays)
     * @param {*} value - Value to sanitize
     * @returns {*} Sanitized value
     */
    const sanitizeValue = (value) => {
        if (typeof value === 'string') {
            return xss(value.trim());
        } else if (Array.isArray(value)) {
            return value.map(item => sanitizeValue(item));
        } else if (value !== null && typeof value === 'object') {
            const sanitizedObj = {};
            for (let key in value) {
                sanitizedObj[key] = sanitizeValue(value[key]);
            }
            return sanitizedObj;
        }
        return value;
    };

    // Sanitize body
    if (req.body) {
        req.body = sanitizeValue(req.body);
    }
    
    // Sanitize query parameters
    if (req.query) {
        req.query = sanitizeValue(req.query);
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
