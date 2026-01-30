/**
 * @module services/paymentFactory
 * @description Factory for creating payment service instances
 */

const StripeService = require('./stripeService');
const PayPalService = require('./paypalService');
const MpesaService = require('./mpesaService');
const { logError } = require('../../utils/logger');

/**
 * Payment Factory Class
 * Creates and returns appropriate payment service based on payment method
 */
class PaymentFactory {
    /**
     * Get payment service instance based on payment method
     * @param {string} paymentMethod - Payment method (stripe, paypal, mpesa)
     * @returns {PaymentService} - Payment service instance
     * @throws {Error} - If payment method is not supported
     */
    static getPaymentService(paymentMethod) {
        switch (paymentMethod.toLowerCase()) {
            case 'stripe':
            case 'card':
                return new StripeService();
            
            case 'paypal':
                return new PayPalService();
            
            case 'mpesa':
                return new MpesaService();
            
            default:
                logError('Unsupported payment method', { paymentMethod });
                throw new Error(`Payment method '${paymentMethod}' is not supported`);
        }
    }

    /**
     * Get list of supported payment methods
     * @returns {Array<string>} - Array of supported payment methods
     */
    static getSupportedMethods() {
        return ['stripe', 'card', 'paypal', 'mpesa'];
    }

    /**
     * Check if a payment method is supported
     * @param {string} paymentMethod - Payment method to check
     * @returns {boolean} - True if supported, false otherwise
     */
    static isMethodSupported(paymentMethod) {
        if (!paymentMethod || typeof paymentMethod !== 'string') {
            return false;
        }
        return this.getSupportedMethods().includes(paymentMethod.toLowerCase());
    }
}

module.exports = PaymentFactory;
