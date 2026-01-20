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
 * @property {string} password - Hashed password (optional for OAuth users)
 * @property {('user'|'admin')} role - User's role in the system
 * @property {string} googleId - Google OAuth ID (optional)
 * @property {string} microsoftId - Microsoft OAuth ID (optional)
 * @property {string} appleId - Apple OAuth ID (optional)
 * @property {string} provider - Authentication provider (local, google, microsoft, apple)
 * @property {string} displayName - User's display name
 * @property {boolean} emailVerified - Whether email is verified
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
        required: function() {
            // Password only required for local authentication
            return this.provider === 'local' || !this.provider;
        },
        minlength: 8
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    // OAuth Provider IDs
    googleId: {
        type: String,
        unique: true,
        sparse: true // Allows null values while maintaining uniqueness
    },
    microsoftId: {
        type: String,
        unique: true,
        sparse: true
    },
    appleId: {
        type: String,
        unique: true,
        sparse: true
    },
    // Authentication metadata
    provider: {
        type: String,
        enum: ['local', 'google', 'microsoft', 'apple'],
        default: 'local'
    },
    displayName: {
        type: String
    },
    emailVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

/**
 * User Model
 * @typedef {mongoose.Model<UserSchema>} UserModel
 */
module.exports = mongoose.model('User', userSchema);