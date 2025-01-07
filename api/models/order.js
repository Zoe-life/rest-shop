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
 * @property {Date} createdAt - Timestamp when order was created
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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

/**
 * Order Model
 * @typedef {mongoose.Model<OrderSchema>} OrderModel
 */
module.exports = mongoose.model('Order', orderSchema);