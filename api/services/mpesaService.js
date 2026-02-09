/**
 * @module services/mpesaService
 * @description M-Pesa payment gateway integration using Safaricom Daraja API
 * @see https://developer.safaricom.co.ke/docs
 */

const PaymentService = require('./paymentService');
const axios = require('axios');
const { logInfo, logError } = require('../utils/logger');

/**
 * M-Pesa Payment Service
 * Integrates with Safaricom Daraja API for M-Pesa payments
 */
class MpesaService extends PaymentService {
    constructor() {
        super();
        this.consumerKey = process.env.MPESA_CONSUMER_KEY;
        this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
        this.shortcode = process.env.MPESA_SHORTCODE;
        this.passkey = process.env.MPESA_PASSKEY;
        this.callbackUrl = process.env.MPESA_CALLBACK_URL;
        this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
        
        // API URLs
        this.baseUrl = this.environment === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';
        
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Get OAuth access token from M-Pesa API
     * @returns {Promise<string>} - Access token
     */
    async getAccessToken() {
        // Return cached token if still valid
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
            const response = await axios.get(
                `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
                {
                    headers: {
                        Authorization: `Basic ${auth}`
                    }
                }
            );

            this.accessToken = response.data.access_token;
            // Token expires in 3599 seconds, cache for 3500 seconds to be safe
            this.tokenExpiry = Date.now() + (3500 * 1000);
            
            logInfo('M-Pesa access token obtained');
            return this.accessToken;
        } catch (error) {
            logError('Failed to get M-Pesa access token', error);
            throw new Error('Failed to authenticate with M-Pesa');
        }
    }

    /**
     * Generate M-Pesa password for STK push
     * @returns {string} - Base64 encoded password
     */
    generatePassword() {
        const timestamp = this.getTimestamp();
        const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');
        return password;
    }

    /**
     * Get timestamp in M-Pesa format (YYYYMMDDHHmmss)
     * @returns {string} - Formatted timestamp
     */
    getTimestamp() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        const second = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}${hour}${minute}${second}`;
    }

    /**
     * Initiate STK Push (Lipa Na M-Pesa Online)
     * @param {Object} paymentData - Payment information
     * @param {string} paymentData.phoneNumber - Customer phone number (format: 254XXXXXXXXX)
     * @param {number} paymentData.amount - Amount to pay
     * @param {string} paymentData.accountReference - Account reference
     * @param {string} paymentData.transactionDesc - Transaction description
     * @returns {Promise<Object>} - STK push response
     */
    async processPayment(paymentData) {
        try {
            const accessToken = await this.getAccessToken();
            const timestamp = this.getTimestamp();
            const password = this.generatePassword();

            const requestBody = {
                BusinessShortCode: this.shortcode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: Math.round(paymentData.amount),
                PartyA: paymentData.phoneNumber,
                PartyB: this.shortcode,
                PhoneNumber: paymentData.phoneNumber,
                CallBackURL: this.callbackUrl,
                AccountReference: paymentData.accountReference || 'Order Payment',
                TransactionDesc: paymentData.transactionDesc || 'Payment for order'
            };

            const response = await axios.post(
                `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
                requestBody,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            logInfo('M-Pesa STK push initiated', {
                checkoutRequestId: response.data.CheckoutRequestID,
                merchantRequestId: response.data.MerchantRequestID
            });

            return {
                success: true,
                transactionId: response.data.CheckoutRequestID,
                merchantRequestId: response.data.MerchantRequestID,
                responseCode: response.data.ResponseCode,
                responseDescription: response.data.ResponseDescription,
                customerMessage: response.data.CustomerMessage
            };
        } catch (error) {
            logError('M-Pesa payment processing failed', error);
            
            if (error.response) {
                return {
                    success: false,
                    error: error.response.data.errorMessage || 'Payment failed',
                    errorCode: error.response.data.errorCode
                };
            }
            
            throw new Error('Failed to process M-Pesa payment');
        }
    }

    /**
     * Query STK push transaction status
     * @param {string} checkoutRequestId - Checkout Request ID from STK push
     * @returns {Promise<Object>} - Transaction status
     */
    async verifyPayment(checkoutRequestId) {
        try {
            const accessToken = await this.getAccessToken();
            const timestamp = this.getTimestamp();
            const password = this.generatePassword();

            const requestBody = {
                BusinessShortCode: this.shortcode,
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: checkoutRequestId
            };

            const response = await axios.post(
                `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
                requestBody,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = response.data;
            
            logInfo('M-Pesa payment verification completed', {
                checkoutRequestId,
                resultCode: data.ResultCode
            });

            return {
                success: data.ResultCode === '0',
                resultCode: data.ResultCode,
                resultDesc: data.ResultDesc,
                status: data.ResultCode === '0' ? 'completed' : 'failed'
            };
        } catch (error) {
            logError('M-Pesa payment verification failed', error);
            throw new Error('Failed to verify M-Pesa payment');
        }
    }

    /**
     * Handle M-Pesa callback
     * @param {Object} callbackData - Callback data from M-Pesa
     * @returns {Promise<Object>} - Processed callback result
     */
    async handleCallback(callbackData) {
        try {
            if (
                !callbackData ||
                typeof callbackData !== 'object' ||
                !callbackData.Body ||
                typeof callbackData.Body !== 'object' ||
                !callbackData.Body.stkCallback ||
                typeof callbackData.Body.stkCallback !== 'object'
            ) {
                logError('Invalid M-Pesa callback structure', { callbackData });
                throw new Error('Invalid M-Pesa callback structure');
            }

            const body = callbackData.Body.stkCallback;
            const resultCode = body.ResultCode;
            const checkoutRequestId = body.CheckoutRequestID;

            if (typeof checkoutRequestId !== 'string') {
                logError('Invalid CheckoutRequestID type in M-Pesa callback', {
                    checkoutRequestIdType: typeof checkoutRequestId
                });
                throw new Error('Invalid CheckoutRequestID in M-Pesa callback');
            }
            
            logInfo('M-Pesa callback received', {
                checkoutRequestId,
                resultCode,
                resultDesc: body.ResultDesc
            });

            const result = {
                checkoutRequestId,
                merchantRequestId: body.MerchantRequestID,
                resultCode,
                resultDesc: body.ResultDesc,
                status: resultCode === 0 ? 'completed' : 'failed'
            };

            // Extract callback metadata if payment was successful
            if (resultCode === 0 && body.CallbackMetadata) {
                const metadata = {};
                body.CallbackMetadata.Item.forEach(item => {
                    metadata[item.Name] = item.Value;
                });
                result.metadata = metadata;
                result.mpesaReceiptNumber = metadata.MpesaReceiptNumber;
                result.transactionDate = metadata.TransactionDate;
                result.phoneNumber = metadata.PhoneNumber;
            }

            return result;
        } catch (error) {
            logError('Failed to process M-Pesa callback', error);
            throw error;
        }
    }

    /**
     * Refund is not directly supported by M-Pesa STK push
     * This would need to be implemented using M-Pesa B2C API
     * @param {string} transactionId - Transaction ID
     * @param {number} amount - Amount to refund
     * @returns {Promise<Object>} - Refund result
     */
    async refundPayment(transactionId, amount) {
        logError('M-Pesa refunds not implemented', { transactionId, amount });
        throw new Error('M-Pesa refunds require B2C API implementation');
    }
}

module.exports = MpesaService;
