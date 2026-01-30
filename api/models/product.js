/**
 * @module models/product
 * @description Product model schema definition for MongoDB
 */

const mongoose = require('mongoose');

/**
 * Product Schema
 * @typedef {Object} ProductSchema
 * @property {mongoose.Schema.Types.ObjectId} _id - Unique identifier
 * @property {string} name - Name of the product
 * @property {number} price - Price of the product
 * @property {string} productImage - URL or path to the product image
 * @property {string} description - Product description
 * @property {string} category - Product category
 * @property {number} stock - Available stock quantity
 * @property {string} sku - Stock Keeping Unit
 * @property {boolean} isActive - Whether product is active
 * @property {Date} createdAt - Timestamp when product was created
 * @property {Date} updatedAt - Timestamp when product was last updated
 */

/**
 * Mongoose schema for Product model
 * @type {mongoose.Schema}
 */
const productSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price must be positive']
    },
    productImage: {
        type: String,
        required: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    category: {
        type: String,
        trim: true,
        index: true
    },
    stock: {
        type: Number,
        default: 0,
        min: [0, 'Stock cannot be negative']
    },
    sku: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
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

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });

// Update timestamp on save
productSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

/**
 * Product Model
 * @typedef {mongoose.Model<ProductSchema>} ProductModel
 */
module.exports = mongoose.model('Product', productSchema);