/**
 * @module routes/payments
 * @description Payment routes for the REST API
 */

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const PaymentsController = require('../controllers/payments');
const checkAuth = require('../middleware/check-auth');
const checkRole = require('../middleware/check-role');

/**
 * @route POST /payments/initiate
 * @desc Initiate a payment for an order
 * @access Private (authenticated users)
 */
router.post(
    '/initiate',
    checkAuth,
    [
        body('orderId')
            .notEmpty()
            .withMessage('Order ID is required')
            .isMongoId()
            .withMessage('Invalid order ID'),
        body('paymentMethod')
            .notEmpty()
            .withMessage('Payment method is required')
            .isIn(['stripe', 'paypal', 'mpesa', 'card'])
            .withMessage('Invalid payment method'),
        body('paymentData')
            .isObject()
            .withMessage('Payment data must be an object')
    ],
    PaymentsController.payments_initiate
);

/**
 * @route GET /payments/verify/:paymentId
 * @desc Verify a payment status
 * @access Private (authenticated users)
 */
router.get(
    '/verify/:paymentId',
    checkAuth,
    [
        param('paymentId')
            .isMongoId()
            .withMessage('Invalid payment ID')
    ],
    PaymentsController.payments_verify
);

/**
 * @route GET /payments/history
 * @desc Get payment history for authenticated user
 * @access Private (authenticated users)
 */
router.get(
    '/history',
    checkAuth,
    PaymentsController.payments_get_history
);

/**
 * @route GET /payments/:paymentId
 * @desc Get a specific payment by ID
 * @access Private (authenticated users)
 */
router.get(
    '/:paymentId',
    checkAuth,
    [
        param('paymentId')
            .isMongoId()
            .withMessage('Invalid payment ID')
    ],
    PaymentsController.payments_get_by_id
);

/**
 * @route POST /payments/mpesa/callback
 * @desc Handle M-Pesa payment callback (webhook)
 * @access Public (called by M-Pesa servers)
 * @note This endpoint should be secured with IP whitelisting in production
 */
router.post(
    '/mpesa/callback',
    PaymentsController.payments_mpesa_callback
);

module.exports = router;
