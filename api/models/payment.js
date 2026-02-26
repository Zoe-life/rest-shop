/**
 * @module models/payment
 * @description Payment model schema definition for MongoDB
 */

const mongoose = require('mongoose');

/**
 * Payment Schema
 * @typedef {Object} PaymentSchema
 * @property {mongoose.Schema.Types.ObjectId} _id - Unique identifier
 * @property {mongoose.Schema.Types.ObjectId} orderId - Reference to the Order model
 * @property {mongoose.Schema.Types.ObjectId} userId - Reference to the User model
 * @property {string} paymentMethod - Payment method used (stripe, paypal, mpesa)
 * @property {string} status - Payment status (pending, completed, failed, refunded)
 * @property {number} amount - Payment amount
 * @property {string} currency - Currency code (USD, KES, etc.)
 * @property {string} transactionId - External payment gateway transaction ID
 * @property {Object} metadata - Additional payment metadata
 * @property {Date} createdAt - Timestamp when payment was created
 * @property {Date} updatedAt - Timestamp when payment was last updated
 */

const paymentSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['stripe', 'paypal', 'mpesa', 'card', 'cash'],
        lowercase: true
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
        default: 'pending',
        lowercase: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Amount must be positive']
    },
    currency: {
        type: String,
        required: true,
        default: 'USD',
        uppercase: true,
        enum: ['USD', 'KES', 'EUR', 'GBP']
    },
    transactionId: {
        type: String
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
paymentSchema.index({ orderId: 1, status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });

// Update timestamp on save
paymentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Payment', paymentSchema);
