/**
 * @module models/customer
 * @description Customer profile model for storing billing and shipping information
 */

const mongoose = require('mongoose');

/**
 * Address Schema
 * @typedef {Object} AddressSchema
 */
const addressSchema = mongoose.Schema({
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    postalCode: { type: String, required: true },
    country: { type: String, required: true, default: 'Kenya' },
    phone: { type: String, required: true }
}, { _id: false });

/**
 * Customer Schema
 * @typedef {Object} CustomerSchema
 */
const customerSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    billingAddress: {
        type: addressSchema,
        required: true
    },
    shippingAddress: {
        type: addressSchema,
        required: true
    },
    paymentMethods: [{
        type: {
            type: String,
            enum: ['card', 'mpesa', 'paypal'],
            required: true
        },
        identifier: String, // Last 4 digits for card, phone for mpesa, email for paypal
        isDefault: {
            type: Boolean,
            default: false
        }
    }],
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
customerSchema.index({ userId: 1 }, { unique: true });

// Update timestamp on save
customerSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Customer', customerSchema);
