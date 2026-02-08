/**
 * @module controllers/orders
 * @description Order management controller
 */

const Order = require('../models/order');
const Product = require('../models/product');
const mongoose = require('mongoose');
const { logInfo, logError } = require('../../utils/logger');

/**
 * Retrieve all orders
 * @async
 * @function orders_get_all
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {500} - If server error occurs
 * @description Returns a list of all orders with product details, quantity, and pagination
 */
exports.orders_get_all = async (req, res, next) => {
    try {
        const page = parseInt(req.query?.page) || 1;
        const limit = parseInt(req.query?.limit) || 10;
        const skip = (page - 1) * limit;

        // Build query filters
        const query = {};
        if (req.query?.status) {
            query.status = req.query.status;
        }
        if (req.query?.paymentStatus) {
            query.paymentStatus = req.query.paymentStatus;
        }
        if (req.userData && req.userData.role !== 'admin') {
            // Non-admin users can only see their own orders
            query.userId = req.userData.userId;
        }

        const orders = await Order.find(query)
            .select('product quantity userId status totalAmount currency paymentStatus paymentMethod createdAt _id')
            .populate('product', 'name price')
            .populate('userId', 'email')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .exec();

        const total = await Order.countDocuments(query);

        res.status(200).json({
            count: orders.length,
            total,
            orders: orders.map(doc => {
                return {
                    _id: doc._id,
                    product: doc.product,
                    quantity: doc.quantity,
                    userId: doc.userId,
                    status: doc.status,
                    totalAmount: doc.totalAmount,
                    currency: doc.currency,
                    paymentStatus: doc.paymentStatus,
                    paymentMethod: doc.paymentMethod,
                    createdAt: doc.createdAt,
                    requests: {
                        type: 'GET',
                        url: 'http://localhost:3001/orders/' + doc._id
                    }
                }
            }),
            pagination: {
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        logError('Failed to fetch orders', err);
        res.status(500).json({
            message: 'Server error occurred while fetching orders'
        })
    }
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
        logError('Failed to fetch order', err);
        res.status(500).json({
            message: 'Server error occurred while fetching order'
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

        // Check stock if available
        if (product.stock !== undefined && product.stock < (req.body.quantity || 1)) {
            return res.status(400).json({
                message: "Insufficient stock",
                available: product.stock,
                requested: req.body.quantity || 1
            });
        }

        // Calculate total amount
        const quantity = req.body.quantity || 1;
        const totalAmount = product.price * quantity;

        const order = new Order ({
            _id: new mongoose.Types.ObjectId(),
            quantity,
            product: req.body.productId,
            userId: req.userData ? req.userData.userId : undefined,
            totalAmount,
            currency: req.body.currency || 'USD',
            status: 'pending',
            paymentStatus: 'pending',
            shippingAddress: req.body.shippingAddress
        });

        const result = await order.save();
        logInfo('Order created successfully', { orderId: result._id, productId: result.product });

        res.status(201).json({
            message: 'Order saved',
            createdOrder: {
                _id: result._id,
                product: result.product,
                quantity: result.quantity,
                totalAmount: result.totalAmount,
                currency: result.currency,
                status: result.status,
                paymentStatus: result.paymentStatus
            },
            request: {
                type: 'GET',
                url: 'http://localhost:3001/orders/' + result._id
            }
        });
    } catch (err) {
        logError('Failed to create order', err);
        res.status(500).json({
            message: 'Server error occurred while creating order'
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
        logInfo('Order deleted successfully', { orderId: req.params.orderId });
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
        logError('Failed to delete order', err);
        res.status(500).json({
            message: 'Server error occurred while deleting order'
        });
    });
};

/**
 * Update order status
 * @async
 * @function orders_update_status
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.orderId - Order ID to update
 * @param {Object} req.body - Request body
 * @param {string} req.body.status - New order status
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @returns {Promise<void>}
 * @throws {404} - If order not found
 * @throws {500} - If server error occurs
 */
exports.orders_update_status = async (req, res, next) => {
    try {
        const { status } = req.body;
        
        const validStatuses = ['pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: 'Invalid status',
                validStatuses
            });
        }

        const order = await Order.findById(req.params.orderId).populate('userId', 'email');
        if (!order) {
            return res.status(404).json({
                message: 'Order not found'
            });
        }

        order.status = status;
        order.updatedAt = Date.now();
        await order.save();

        logInfo('Order status updated', { orderId: order._id, status });

        // Send real-time notification via WebSocket
        try {
            const socketService = require('../services/socketService');
            if (order.userId && order.userId._id) {
                socketService.notifyUser(order.userId._id.toString(), 'order:status-updated', {
                    orderId: order._id,
                    status: order.status,
                    message: `Your order status has been updated to ${status}`
                });
            }
        } catch (err) {
            // Socket notification is optional - don't break the request
            logError('Failed to send socket notification', err);
        }

        // Send email notification
        try {
            const emailService = require('../services/emailService');
            if (order.userId && order.userId.email) {
                await emailService.sendOrderNotification(order.userId.email, {
                    orderId: order._id,
                    status: order.status,
                    totalAmount: order.totalAmount,
                    currency: order.currency || 'USD'
                });
            }
        } catch (err) {
            // Email notification is optional - don't break the request
            logError('Failed to send email notification', err);
        }

        res.status(200).json({
            message: 'Order status updated successfully',
            order: {
                _id: order._id,
                status: order.status,
                updatedAt: order.updatedAt
            }
        });
    } catch (err) {
        logError('Failed to update order status', err);
        res.status(500).json({
            message: 'Server error occurred while updating order status'
        });
    }
};