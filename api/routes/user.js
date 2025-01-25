/**
 * @module routes/user
 * @description User authentication and management routes
 */

const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user');
const checkAuth = require('../middleware/check-auth');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/product');

/**
 * Rate limiter configuration for login attempts
 * @constant {RateLimit}
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // limit each IP to 5 login attempts per windowMs
});

/**
 * Multer storage configuration
 */
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // Using path.join for cross-platform compatibility
        const uploadPath = path.join(__dirname, '../../uploads/');
        // Create directory if it doesn't exist
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'));
    }
});

/**
 * File filter for upload validation
 */
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG and PNG allowed.'), false);
    }
};

/**
 * Multer upload configuration
 */
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5, // 5MB file size limit
        files: 1
    },
    fileFilter: fileFilter
}).single('productImage');

/**
 * @route POST /signup
 * @description Register a new user
 * @access Public
 * @middleware Rate limiter (5 requests per hour)
 */
router.post('/signup', rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }), UserController.user_signup);

/**
 * @route POST /login
 * @description Authenticate a user and generate JWT token
 * @access Public
 * @middleware Rate limiter (5 requests per 15 minutes)
 */
router.post('/login', loginLimiter, UserController.user_login);

/**
 * @route DELETE /:userId
 * @description Delete a user account
 * @access Private
 * @middleware Authentication required
 * @param {string} userId - The ID of the user to delete
 */
router.delete('/:userId', checkAuth, UserController.user_delete);

// Add this route for product creation with image upload
router.post('/products', checkAuth, (req, res, next) => {
    upload(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                error: err.message
            });
        } else if (err) {
            return res.status(400).json({
                error: err.message
            });
        }
        // Continue with your product creation logic
        const product = new Product({
            name: req.body.name,
            price: req.body.price,
            productImage: req.file.path
        });
        // Save product...
    });
});

module.exports = router;