/**
 * @module services/emailService
 * @description Email service for sending verification and notification emails
 */

const nodemailer = require('nodemailer');
const { logInfo, logError } = require('../utils/logger');

/**
 * Escape HTML meta-characters in a string to prevent HTML injection in email
 * templates.  All user-controlled values that are interpolated into the HTML
 * body of outgoing emails MUST be passed through this function.
 * @param {*} value - Any value; non-strings are converted with String().
 * @returns {string} HTML-safe string.
 */
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Create email transporter
 * @returns {Object} Nodemailer transporter
 */
const createTransporter = () => {
    // In production, use actual SMTP credentials
    // For development/testing, use ethereal email or console logging
    if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
        return nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }
    
    // For testing - log to console
    return {
        sendMail: async (mailOptions) => {
            logInfo('Email (test mode)', {
                to: mailOptions.to,
                subject: mailOptions.subject,
                text: mailOptions.text
            });
            return { messageId: 'test-' + Date.now() };
        }
    };
};

/**
 * Send email verification email
 * @param {string} email - Recipient email
 * @param {string} token - Verification token
 * @returns {Promise<Object>} Send result
 */
exports.sendVerificationEmail = async (email, token) => {
    try {
        const transporter = createTransporter();
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
        const safeVerificationUrl = escapeHtml(verificationUrl);
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@rest-shop.com',
            to: email,
            subject: 'Verify Your Email - REST Shop',
            html: `
                <h2>Email Verification</h2>
                <p>Thank you for registering with REST Shop!</p>
                <p>Please click the link below to verify your email address:</p>
                <a href="${safeVerificationUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
                <p>Or copy this link: ${safeVerificationUrl}</p>
                <p>This link will expire in 24 hours.</p>
                <p>If you did not register for an account, please ignore this email.</p>
            `,
            text: `
                Email Verification
                
                Thank you for registering with REST Shop!
                
                Please visit this link to verify your email address:
                ${verificationUrl}
                
                This link will expire in 24 hours.
                
                If you did not register for an account, please ignore this email.
            `
        };
        
        const result = await transporter.sendMail(mailOptions);
        logInfo('Verification email sent', { email, messageId: result.messageId });
        return result;
    } catch (error) {
        logError('Failed to send verification email', error);
        throw error;
    }
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} token - Reset token
 * @returns {Promise<Object>} Send result
 */
exports.sendPasswordResetEmail = async (email, token) => {
    try {
        const transporter = createTransporter();
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
        const safeResetUrl = escapeHtml(resetUrl);
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@rest-shop.com',
            to: email,
            subject: 'Password Reset Request - REST Shop',
            html: `
                <h2>Password Reset Request</h2>
                <p>You requested to reset your password for your REST Shop account.</p>
                <p>Please click the link below to reset your password:</p>
                <a href="${safeResetUrl}" style="padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
                <p>Or copy this link: ${safeResetUrl}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
            `,
            text: `
                Password Reset Request
                
                You requested to reset your password for your REST Shop account.
                
                Please visit this link to reset your password:
                ${resetUrl}
                
                This link will expire in 1 hour.
                
                If you did not request a password reset, please ignore this email and your password will remain unchanged.
            `
        };
        
        const result = await transporter.sendMail(mailOptions);
        logInfo('Password reset email sent', { email, messageId: result.messageId });
        return result;
    } catch (error) {
        logError('Failed to send password reset email', error);
        throw error;
    }
};

/**
 * Send order notification email
 * @param {string} email - Recipient email
 * @param {Object} orderDetails - Order details
 * @returns {Promise<Object>} Send result
 */
exports.sendOrderNotification = async (email, orderDetails) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@rest-shop.com',
            to: email,
            subject: `Order ${orderDetails.status} - Order #${orderDetails.orderId}`,
            html: `
                <h2>Order Update</h2>
                <p>Your order status has been updated to: <strong>${escapeHtml(orderDetails.status)}</strong></p>
                <h3>Order Details:</h3>
                <ul>
                    <li>Order ID: ${escapeHtml(orderDetails.orderId)}</li>
                    <li>Status: ${escapeHtml(orderDetails.status)}</li>
                    <li>Total: ${escapeHtml(orderDetails.currency)} ${escapeHtml(orderDetails.totalAmount)}</li>
                </ul>
                <p>Thank you for shopping with REST Shop!</p>
            `,
            text: `
                Order Update
                
                Your order status has been updated to: ${orderDetails.status}
                
                Order Details:
                - Order ID: ${orderDetails.orderId}
                - Status: ${orderDetails.status}
                - Total: ${orderDetails.currency} ${orderDetails.totalAmount}
                
                Thank you for shopping with REST Shop!
            `
        };
        
        const result = await transporter.sendMail(mailOptions);
        logInfo('Order notification email sent', { email, orderId: orderDetails.orderId });
        return result;
    } catch (error) {
        logError('Failed to send order notification email', error);
        // Don't throw - notification failure shouldn't break the main flow
    }
};
