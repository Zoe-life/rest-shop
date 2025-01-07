/**
 * @module models/user
 * @description User model schema definition for MongoDB
 */

const mongoose = require('mongoose');

/**
 * User Schema
 * @typedef {Object} UserSchema
 * @property {mongoose.Schema.Types.ObjectId} _id - Unique identifier
 * @property {string} email - User's email address (unique, required)
 * @property {string} password - Hashed password (min length: 8)
 * @property {('user'|'admin')} role - User's role in the system
 */

/**
 * Mongoose schema for User model
 * @type {mongoose.Schema}
 */
const userSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    email: {
        type: String,
        required: true,
        unique: true,
        match: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
});

/**
 * User Model
 * @typedef {mongoose.Model<UserSchema>} UserModel
 */
module.exports = mongoose.model('User', userSchema);