/**
 * @module controllers/orders
 * @description Order management controller
 */

const Order = require('../models/order');
const Product = require('../models/product');
const mongoose = require('mongoose');

/**
 * Retrieve all orders
 * @async
 * @function orders_get_all
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {500} - If server error occurs
 * @description Returns a list of all orders with product details and quantity
 */
exports.orders_get_all = (req, res, next) => {
    Order.find()
    .select('product quantity _id')
    .populate('product', 'name')
    .exec()
    .then(docs => {
        res.status(200).json({
            count: docs.length,
            orders: docs.map(doc => {
                return {
                    _id: doc._id,
                    product: doc.product,
                    quantity: doc.quantity,
                    requests: {
                        type: 'GET',
                        url: 'http://localhost:3001/orders/' + doc._id
                    }
                }
            })
        });
    })
    .catch(err => {
        res.status(500).json({
            error: err
        })
    });
};

/**
 * Get a specific order by ID
 * @async
 * @function orders_get_order
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.orderId - Order ID
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {404} - If order not found
 * @throws {500} - If server error occurs
 */
exports.orders_get_order = (req, res, next) => {
    Order.findById(req.params.orderId)
    .populate('product')
    .exec()
    .then(order => {
        if (!order) {
            return res.status(404).json({
                message: 'Order not found'
            });
        }
        res.status(200).json({
            order: order,
            request: {
                type: 'GET',
                url: 'http://localhost:3001/orders/'
            }
        });
    })
    .catch(err => {
        res.status(500).json({
            error: err
        })
    });
};

/**
 * Create a new order
 * @async
 * @function orders_create_order
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.productId - ID of the product being ordered
 * @param {number} req.body.quantity - Quantity of products to order
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {404} - If product not found
 * @throws {500} - If server error occurs
 */
exports.orders_create_order = async (req, res, next) => {
    try {
        const product = await Product.findById(req.body.productId);
        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }
        const order = new Order ({
            _id: new mongoose.Types.ObjectId(),
            quantity: req.body.quantity,
            product: req.body.productId
        });
        const result = await order.save();
        console.log(result);
        res.status(201).json({
            message: 'Order saved',
            createdOrder: {
                _id: result._id,
                product: result.product,
                quantity: result.quantity
            },
            request: {
                type: 'GET',
                url: 'http://localhost:3001/orders/' + result._id
            }
        });
    } catch (err) {
        console.log(err)
        res.status(500).json({
            error: err
        });
    }
};

/**
 * Delete an order
 * @async
 * @function orders_delete_order
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.orderId - Order ID to delete
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {500} - If server error occurs
 */
exports.orders_delete_order = (req, res, next) => {
    Order.deleteOne({ _id: req.params.orderId })
    .exec()
    .then(result => {
        res.status(200).json({
            message: 'Order deleted',
            request: {
                type: 'POST',
                url: 'http://localhost:3001/orders',
                body: { productId: 'ID', quantity: 'Number' }
            }
        });
    })
    .catch(err => {
        res.status(500).json({
            error: err
        });
    });
};