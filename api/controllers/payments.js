/**
 * @module controllers/payments
 * @description Payment management controller
 */

const Payment = require('../models/payment');
const Order = require('../models/order');
const PaymentFactory = require('../services/paymentFactory');
const mongoose = require('mongoose');
const { logInfo, logError } = require('../../utils/logger');

/**
 * Initiate a payment
 * @async
 * @function payments_initiate
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.orderId - Order ID
 * @param {string} req.body.paymentMethod - Payment method (stripe, paypal, mpesa)
 * @param {Object} req.body.paymentData - Payment-specific data
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.payments_initiate = async (req, res) => {
    try {
        const { orderId, paymentMethod, paymentData } = req.body;

        // Validate payment method
        if (!PaymentFactory.isMethodSupported(paymentMethod)) {
            return res.status(400).json({
                message: `Payment method '${paymentMethod}' is not supported`,
                supportedMethods: PaymentFactory.getSupportedMethods()
            });
        }

        // Get order details
        const order = await Order.findById(orderId).populate('product');
        if (!order) {
            return res.status(404).json({
                message: 'Order not found'
            });
        }

        // Check if order already has a completed payment
        const existingPayment = await Payment.findOne({
            orderId,
            status: 'completed'
        });

        if (existingPayment) {
            return res.status(400).json({
                message: 'Order has already been paid'
            });
        }

        // Get payment service
        const paymentService = PaymentFactory.getPaymentService(paymentMethod);

        // Prepare payment data
        const amount = order.totalAmount || (order.product.price * order.quantity);
        const processPaymentData = {
            ...paymentData,
            amount,
            currency: order.currency || 'USD',
            accountReference: `ORDER-${orderId}`,
            transactionDesc: `Payment for order ${orderId}`
        };

        // Process payment
        const result = await paymentService.processPayment(processPaymentData);

        if (!result.success) {
            return res.status(400).json({
                message: 'Payment processing failed',
                error: result.error
            });
        }

        // Create payment record
        const payment = await paymentService.createPaymentRecord({
            orderId,
            userId: req.userData.userId,
            paymentMethod,
            status: result.status || 'pending',
            amount,
            currency: order.currency || 'USD',
            transactionId: result.transactionId,
            metadata: {
                ...result,
                initiatedBy: req.userData.userId
            }
        });

        // Update order with payment info
        order.paymentMethod = paymentMethod;
        order.paymentStatus = result.status === 'completed' ? 'completed' : 'pending';
        if (result.status === 'completed') {
            order.status = 'confirmed';
        }
        await order.save();

        logInfo('Payment initiated successfully', {
            paymentId: payment._id,
            orderId,
            paymentMethod
        });

        res.status(201).json({
            message: 'Payment initiated successfully',
            payment: {
                _id: payment._id,
                orderId: payment.orderId,
                paymentMethod: payment.paymentMethod,
                status: payment.status,
                amount: payment.amount,
                currency: payment.currency,
                transactionId: payment.transactionId
            },
            paymentDetails: {
                approvalUrl: result.approvalUrl,
                clientSecret: result.clientSecret,
                customerMessage: result.customerMessage
            }
        });
    } catch (error) {
        logError('Failed to initiate payment', error);
        res.status(500).json({
            message: 'Server error occurred while initiating payment',
            error: error.message
        });
    }
};

/**
 * Verify a payment
 * @async
 * @function payments_verify
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.paymentId - Payment ID
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.payments_verify = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.paymentId);
        
        if (!payment) {
            return res.status(404).json({
                message: 'Payment not found'
            });
        }

        // Get payment service
        const paymentService = PaymentFactory.getPaymentService(payment.paymentMethod);

        // Verify payment with gateway
        const result = await paymentService.verifyPayment(payment.transactionId);

        // Update payment status
        payment.status = result.status;
        payment.metadata = { ...payment.metadata, verificationResult: result };
        await payment.save();

        // Update order status if payment is completed
        if (result.status === 'completed') {
            const order = await Order.findById(payment.orderId);
            if (order) {
                order.paymentStatus = 'completed';
                order.status = 'confirmed';
                await order.save();
            }
        }

        logInfo('Payment verified', {
            paymentId: payment._id,
            status: result.status
        });

        res.status(200).json({
            message: 'Payment verified successfully',
            payment: {
                _id: payment._id,
                status: payment.status,
                transactionId: payment.transactionId
            },
            verification: result
        });
    } catch (error) {
        logError('Failed to verify payment', error);
        res.status(500).json({
            message: 'Server error occurred while verifying payment',
            error: error.message
        });
    }
};

/**
 * Get payment history for a user
 * @async
 * @function payments_get_history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.payments_get_history = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const payments = await Payment.find({ userId: req.userData.userId })
            .populate('orderId', 'status totalAmount')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);

        const total = await Payment.countDocuments({ userId: req.userData.userId });

        res.status(200).json({
            payments,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });
    } catch (error) {
        logError('Failed to fetch payment history', error);
        res.status(500).json({
            message: 'Server error occurred while fetching payment history'
        });
    }
};

/**
 * Handle M-Pesa callback
 * @async
 * @function payments_mpesa_callback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.payments_mpesa_callback = async (req, res) => {
    try {
        const callbackData = req.body;
        
        logInfo('M-Pesa callback received', callbackData);

        // Process callback
        const mpesaService = PaymentFactory.getPaymentService('mpesa');
        const result = await mpesaService.handleCallback(callbackData);

        // Find payment by checkout request ID
        const payment = await Payment.findOne({
            transactionId: result.checkoutRequestId
        });

        if (payment) {
            // Update payment status
            payment.status = result.status;
            payment.metadata = {
                ...payment.metadata,
                mpesaReceiptNumber: result.mpesaReceiptNumber,
                transactionDate: result.transactionDate,
                phoneNumber: result.phoneNumber,
                callbackData: result
            };
            await payment.save();

            // Update order status
            const order = await Order.findById(payment.orderId);
            if (order) {
                order.paymentStatus = result.status === 'completed' ? 'completed' : 'failed';
                if (result.status === 'completed') {
                    order.status = 'confirmed';
                }
                await order.save();
            }

            logInfo('M-Pesa payment updated', {
                paymentId: payment._id,
                status: result.status
            });
        }

        // Always return success to M-Pesa
        res.status(200).json({
            ResultCode: 0,
            ResultDesc: 'Success'
        });
    } catch (error) {
        logError('M-Pesa callback processing failed', error);
        // Still return success to M-Pesa to avoid retries
        res.status(200).json({
            ResultCode: 0,
            ResultDesc: 'Accepted'
        });
    }
};

/**
 * Get payment by ID
 * @async
 * @function payments_get_by_id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.payments_get_by_id = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.paymentId)
            .populate('orderId', 'status totalAmount product')
            .populate('userId', 'email');

        if (!payment) {
            return res.status(404).json({
                message: 'Payment not found'
            });
        }

        // Check authorization (user can only see their own payments, admin can see all)
        if (payment.userId._id.toString() !== req.userData.userId && req.userData.role !== 'admin') {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        res.status(200).json({
            payment
        });
    } catch (error) {
        logError('Failed to fetch payment', error);
        res.status(500).json({
            message: 'Server error occurred while fetching payment'
        });
    }
};
