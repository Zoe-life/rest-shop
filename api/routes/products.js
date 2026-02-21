/**
 * @module routes/products
 * @description Product management routes and file upload configuration
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const checkAuth = require('../middleware/check-auth');
const ProductsController = require('../controllers/products');
const checkRole = require('../middleware/check-role');

/**
 * Multer storage configuration
 * @constant {multer.StorageEngine}
 * @description Configures destination and filename for uploaded files
 */
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'));
    }
});

/**
 * File filter for upload validation
 * @function fileFilter
 * @param {Object} req - Express request object
 * @param {Object} file - Uploaded file object
 * @param {Function} cb - Callback function
 * @description Validates file types, allowing only JPEG and PNG
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
 * @constant {multer.Multer}
 * @description Configures file upload with size limits and filtering
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
 * @route GET /products
 * @description Retrieve all products
 * @access Public
 */
router.get('/', ProductsController.products_get_all);

/**
 * @route POST /products
 * @description Create a new product with image upload
 * @access Private
 * @middleware Authentication required, Admin role required, Input validation, File upload
 */
router.post('/', 
    checkAuth, 
    checkRole(['admin']), 
    upload,
    require('../middleware/security').productValidation.create,
    ProductsController.products_create_product
);

/**
 * @route GET /products/:productId
 * @description Retrieve a specific product
 * @access Public
 * @middleware ObjectId validation
 * @param {string} productId - The ID of the product to retrieve
 */
router.get('/:productId', 
    require('../middleware/security').validateObjectId('productId'),
    ProductsController.products_get_product
);

/**
 * @route PATCH /products/:productId
 * @description Update a specific product
 * @access Private
 * @middleware Authentication required, Admin role required, Input validation, ObjectId validation
 * @param {string} productId - The ID of the product to update
 */
router.patch('/:productId', 
    checkAuth, 
    checkRole(['admin']),
    require('../middleware/security').validateObjectId('productId'),
    require('../middleware/security').productValidation.update,
    ProductsController.products_update_product
);

/**
 * @route DELETE /products/:productId
 * @description Delete a specific product
 * @access Private
 * @middleware Authentication required, Admin role required, ObjectId validation
 * @param {string} productId - The ID of the product to delete
 */
router.delete('/:productId', 
    checkAuth, 
    checkRole(['admin']),
    require('../middleware/security').validateObjectId('productId'),
    ProductsController.products_delete_product
);

module.exports = router;