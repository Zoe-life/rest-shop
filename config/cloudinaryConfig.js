/**
 * @module config/cloudinaryConfig
 * @description Cloudinary cloud storage configuration
 */

const cloudinary = require('cloudinary').v2;

/**
 * Configure Cloudinary for cloud-based file storage
 * Requires environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });
    console.log('✓ Cloudinary configured successfully');
} else {
    console.warn('⚠️  Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to enable cloud storage.');
}

module.exports = cloudinary;
