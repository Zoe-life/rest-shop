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
 * API rate limiter - created at module load time (app initialization)
 */
const apiLimiter = process.env.NODE_ENV === 'test'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
    });

/**
 * Authentication rate limiter - created at module load time (app initialization)
 */
const authLimiter = process.env.NODE_ENV === 'test'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: 'Too many authentication attempts, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
    });

/**
 * Signup rate limiter - created at module load time (app initialization)
 */
const signupLimiter = process.env.NODE_ENV === 'test'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 5,
        message: 'Too many accounts created, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
    });

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
