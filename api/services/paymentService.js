/**
 * @module services/paymentService
 * @description Payment service abstraction layer for different payment gateways
 */

const Payment = require('../models/payment');
const mongoose = require('mongoose');
const { logInfo, logError } = require('../../utils/logger');

/**
 * Base Payment Service Class
 */
class PaymentService {
    /**
     * Process a payment
     * @param {Object} paymentData - Payment information
     * @returns {Promise<Object>} - Payment result
     */
    async processPayment(paymentData) {
        throw new Error('processPayment method must be implemented');
    }

    /**
     * Verify a payment
     * @param {string} transactionId - Transaction ID to verify
     * @returns {Promise<Object>} - Verification result
     */
    async verifyPayment(transactionId) {
        throw new Error('verifyPayment method must be implemented');
    }

    /**
     * Refund a payment
     * @param {string} transactionId - Transaction ID to refund
     * @param {number} amount - Amount to refund
     * @returns {Promise<Object>} - Refund result
     */
    async refundPayment(transactionId, amount) {
        throw new Error('refundPayment method must be implemented');
    }

    /**
     * Create payment record in database
     * @param {Object} paymentInfo - Payment information
     * @returns {Promise<Object>} - Created payment record
     */
    async createPaymentRecord(paymentInfo) {
        try {
            const payment = new Payment({
                _id: new mongoose.Types.ObjectId(),
                orderId: paymentInfo.orderId,
                userId: paymentInfo.userId,
                paymentMethod: paymentInfo.paymentMethod,
                status: paymentInfo.status || 'pending',
                amount: paymentInfo.amount,
                currency: paymentInfo.currency || 'USD',
                transactionId: paymentInfo.transactionId,
                metadata: paymentInfo.metadata || {}
            });

            const result = await payment.save();
            logInfo('Payment record created', { paymentId: result._id, transactionId: result.transactionId });
            return result;
        } catch (error) {
            logError('Failed to create payment record', error);
            throw error;
        }
    }

    /**
     * Update payment status
     * @param {string} paymentId - Payment ID
     * @param {string} status - New status
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} - Updated payment record
     */
    async updatePaymentStatus(paymentId, status, metadata = {}) {
        try {
            const payment = await Payment.findById(paymentId);
            if (!payment) {
                throw new Error('Payment not found');
            }

            payment.status = status;
            payment.metadata = { ...payment.metadata, ...metadata };
            payment.updatedAt = Date.now();

            const result = await payment.save();
            logInfo('Payment status updated', { paymentId, status });
            return result;
        } catch (error) {
            logError('Failed to update payment status', error);
            throw error;
        }
    }

    /**
     * Get payment by transaction ID
     * @param {string} transactionId - Transaction ID
     * @returns {Promise<Object>} - Payment record
     */
    async getPaymentByTransactionId(transactionId) {
        try {
            return await Payment.findOne({ transactionId });
        } catch (error) {
            logError('Failed to get payment by transaction ID', error);
            throw error;
        }
    }

    /**
     * Get payments for an order
     * @param {string} orderId - Order ID
     * @returns {Promise<Array>} - Payment records
     */
    async getPaymentsByOrderId(orderId) {
        try {
            return await Payment.find({ orderId }).sort({ createdAt: -1 });
        } catch (error) {
            logError('Failed to get payments by order ID', error);
            throw error;
        }
    }
}

module.exports = PaymentService;
