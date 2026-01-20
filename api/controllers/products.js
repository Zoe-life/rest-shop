/**
 * @module controllers/products
 * @description Product management controller
 */

const mongoose = require('mongoose');
const Product = require('../models/product');

/**
 * Retrieve all products
 * @async
 * @function products_get_all
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {500} - If server error occurs
 * @description Returns a list of all products with name, price, ID, and image path
 */
exports.products_get_all = async (req, res, next) => {
    try {
        const docs = await Product.find()
            .select('name price _id productImage')
            .exec();
        const response = {
            count: docs.length,
            products: docs.map(doc => {
                return {
                    name: doc.name,
                    price: doc.price,
                    productImage: doc.productImage,
                    _id: doc._id,
                    request: {
                        type: 'GET',
                        url: 'http://localhost:3001/products/' + doc._id
                    }
                }
            })
        };
        res.status(200).json(response);
    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: err
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
        console.log(result);
        res.status(201).json({
            message: 'Product created successfully',
            createdProduct: {
                name: result.name,
                price: result.price,
                _id: result._id,
                request: {
                    type: 'POST',
                    url: "http://localhost:3001/products" + result._id
                }
            }
        });
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
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
        console.log("From database", doc);
        if (doc) {
            res.status(200).json({
                product: doc,
                request: {
                    type: 'GET',
                    description: 'Get all products',
                    url: 'http:/localhost:3001/products'
                }
            });
        } else {
            res.status(404).json({
                message: "No valid entry found"
            });
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: err});
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
        res.status(200).json({
            message: "Product updated",
            request: {
                type: "PATCH"
                //url: "http://localhost:3001/products/" + _id
            }
        });
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
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
        res.status(200).json({
            message: 'Product deleted',
            request: {
                type: 'DELETE',
                url: 'http://localhost:3001/products',
                data: { name: 'String', price: 'Number'}
            }
        });
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        });
    });
};