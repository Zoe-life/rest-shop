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
 */

/**
 * Mongoose schema for Product model
 * @type {mongoose.Schema}
 */
const productSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: { 
        type: String, 
        required: true 
    },
    price: { 
        type: Number, 
        required: true 
    },
    productImage: { 
        type: String, 
        required: true
    }
});

/**
 * Product Model
 * @typedef {mongoose.Model<ProductSchema>} ProductModel
 */
module.exports = mongoose.model('Product', productSchema);