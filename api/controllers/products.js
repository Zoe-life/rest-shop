/**
 * @module controllers/products
 * @description Product management controller
 */

const mongoose = require('mongoose');
const Product = require('../models/product');
const { logInfo, logError } = require('../../utils/logger');

/**
 * Helper function to construct base URL dynamically
 * @param {Object} req - Express request object
 * @returns {string} Base URL
 */
function getBaseUrl(req) {
    // Use environment variable if available, otherwise construct from request
    if (process.env.API_BASE_URL) {
        return process.env.API_BASE_URL;
    }
    
    // Construct from request (supports both HTTP and HTTPS)
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:3001';
    return `${protocol}://${host}`;
}

/**
 * Retrieve all products
 * @async
 * @function products_get_all
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {500} - If server error occurs
 * @description Returns a list of all products with pagination, filtering, and search
 */
exports.products_get_all = async (req, res, next) => {
    try {
        const page = parseInt(req.query?.page) || 1;
        const limit = parseInt(req.query?.limit) || 20;
        const skip = (page - 1) * limit;

        // Build query filters
        const query = {};
        
        // Only filter by isActive if the field exists (for backward compatibility)
        if (req.query?.showInactive !== 'true') {
            query.$or = [
                { isActive: true },
                { isActive: { $exists: false } }
            ];
        }
        
        if (req.query?.category) {
            query.category = req.query.category;
        }

        if (req.query?.search) {
            query.$text = { $search: req.query.search };
        }

        if (req.query?.minPrice || req.query?.maxPrice) {
            query.price = {};
            if (req.query.minPrice) {
                query.price.$gte = parseFloat(req.query.minPrice);
            }
            if (req.query.maxPrice) {
                query.price.$lte = parseFloat(req.query.maxPrice);
            }
        }

        // Sort options
        let sort = { createdAt: -1 };
        if (req.query?.sort === 'price_asc') {
            sort = { price: 1 };
        } else if (req.query?.sort === 'price_desc') {
            sort = { price: -1 };
        } else if (req.query?.sort === 'name') {
            sort = { name: 1 };
        }

        const docs = await Product.find(query)
            .select('name price _id productImage description category stock')
            .sort(sort)
            .limit(limit)
            .skip(skip)
            .exec();

        const total = await Product.countDocuments(query);

        const response = {
            count: docs.length,
            total,
            products: docs.map(doc => {
                return {
                    name: doc.name,
                    price: doc.price,
                    productImage: doc.productImage,
                    description: doc.description,
                    category: doc.category,
                    stock: doc.stock,
                    _id: doc._id,
                    request: {
                        type: 'GET',
                        url: `${getBaseUrl(req)}/products/${doc._id}`
                    }
                }
            }),
            pagination: {
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
        res.status(200).json(response);
    } catch (err) {
        logError('Failed to fetch products', err);
        res.status(500).json({
            message: 'Server error occurred while fetching products'
        });
    }
};

/**
 * Create a new product
 * @async
 * @function products_create_product
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.name - Product name
 * @param {number} req.body.price - Product price
 * @param {Object} req.file - Uploaded file object
 * @param {string} req.file.path - Path to uploaded image
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {500} - If server error occurs
 */
exports.products_create_product = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            error: 'Product image is required'
        });
    }
    const product = new Product({
        _id: new mongoose.Types.ObjectId(),
        name: req.body.name,
        price: req.body.price,
        productImage: req.file.path
    });
    product
    .save()
    .then(result => {
        logInfo('Product created successfully', { productId: result._id, name: result.name });
        res.status(201).json({
            message: 'Product created successfully',
            createdProduct: {
                name: result.name,
                price: result.price,
                _id: result._id,
                request: {
                    type: 'POST',
                    url: `${getBaseUrl(req)}/products/${result._id}`
                }
            }
        });
    })
    .catch(err => {
        logError('Failed to create product', err);
        res.status(500).json({
            message: 'Server error occurred while creating product'
        });
    });
};

/**
 * Get a specific product by ID
 * @async
 * @function products_get_product
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.productId - Product ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {404} - If product not found
 * @throws {500} - If server error occurs
 */
exports.products_get_product = (req, res, next) => {
    const id = req.params.productId;
    Product.findById(id)
    .select('name price _id productImage')
    .exec()
    .then(doc => {
        if (doc) {
            logInfo('Product fetched successfully', { productId: id });
            res.status(200).json({
                product: doc,
                request: {
                    type: 'GET',
                    description: 'Get all products',
                    url: `${getBaseUrl(req)}/products`
                }
            });
        } else {
            res.status(404).json({
                message: "No valid entry found"
            });
        }
    })
    .catch(err => {
        logError('Failed to fetch product', err);
        res.status(500).json({
            message: 'Server error occurred while fetching product'
        });
    });
};

/**
 * Update a product
 * @async
 * @function products_update_product
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.productId - Product ID
 * @param {Object} req.body - Update data
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {500} - If server error occurs
 */
exports.products_update_product = (req, res, next) => {
    const id = req.params.productId;
    Product.updateOne(
        {_id: id },
        {$set: req.body }
    )
    .exec()
    .then(result => {
        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: "No valid entry found for update" });
        };
        logInfo('Product updated successfully', { productId: id });
        res.status(200).json({
            message: "Product updated",
            request: {
                type: "PATCH"
                //url: "http://localhost:3001/products/" + _id
            }
        });
    })
    .catch(err => {
        logError('Failed to update product', err);
        res.status(500).json({
            message: 'Server error occurred while updating product'
        });
    });
};

/**
 * Delete a product
 * @async
 * @function products_delete_product
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.productId - Product ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {500} - If server error occurs
 */
exports.products_delete_product = (req, res, next) => {
    const id = req.params.productId;
    Product.deleteOne({_id: id })
    .exec()
    .then(result => {
        logInfo('Product deleted successfully', { productId: id });
        res.status(200).json({
            message: 'Product deleted',
            request: {
                type: 'DELETE',
                url: `${getBaseUrl(req)}/products`,
                data: { name: 'String', price: 'Number'}
            }
        });
    })
    .catch(err => {
        logError('Failed to delete product', err);
        res.status(500).json({
            message: 'Server error occurred while deleting product'
        });
    });
};