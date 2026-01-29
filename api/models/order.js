/**
 * @module models/order
 * @description Order model schema definition for MongoDB
 */

const mongoose = require('mongoose');

/**
 * Order Schema
 * @typedef {Object} OrderSchema
 * @property {mongoose.Schema.Types.ObjectId} _id - Unique identifier
 * @property {mongoose.Schema.Types.ObjectId} product - Reference to the Product model
 * @property {number} quantity - Number of products ordered (1-100)
 * @property {mongoose.Schema.Types.ObjectId} userId - Reference to the User who placed the order
 * @property {string} status - Order status
 * @property {number} totalAmount - Total order amount
 * @property {string} currency - Currency code
 * @property {string} paymentMethod - Payment method used (optional for backward compatibility)
 * @property {string} paymentStatus - Payment status
 * @property {mongoose.Schema.Types.ObjectId} customerId - Reference to Customer profile (optional)
 * @property {Object} shippingAddress - Shipping address (optional)
 * @property {Date} createdAt - Timestamp when order was created
 * @property {Date} updatedAt - Timestamp when order was last updated
 */

/**
 * Mongoose schema for Order model
 * @type {mongoose.Schema}
 */
const orderSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    product: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true 
    },
    quantity: {
        type: Number, 
        default: 1,
        min: [1, 'Quantity must be at least 1'],
        max: [100, 'Quantity cannot exceed 100']
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        default: 'pending',
        lowercase: true
    },
    totalAmount: {
        type: Number,
        min: [0, 'Total amount must be positive']
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    paymentMethod: {
        type: String,
        enum: ['stripe', 'paypal', 'mpesa', 'card', 'cash', null],
        lowercase: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending',
        lowercase: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
        phone: String
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

// Indexes for better performance
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, paymentStatus: 1 });

// Update timestamp on save
orderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

/**
 * Order Model
 * @typedef {mongoose.Model<OrderSchema>} OrderModel
 */
module.exports = mongoose.model('Order', orderSchema);