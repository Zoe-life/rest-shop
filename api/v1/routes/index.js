/**
 * @module v1/routes/index
 * @description API version 1 routes aggregation
 */

const express = require('express');
const router = express.Router();

// Import existing routes
const productRoutes = require('../../routes/products');
const orderRoutes = require('../../routes/orders');
const userRoutes = require('../../routes/user');
const authRoutes = require('../../routes/auth');
const paymentRoutes = require('../../routes/payments');

// Mount routes under v1
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/user', userRoutes);
router.use('/auth', authRoutes);
router.use('/payments', paymentRoutes);

// Version info endpoint
router.get('/', (req, res) => {
    res.json({
        version: '1.0.0',
        apiVersion: 'v1',
        endpoints: [
            '/api/v1/products',
            '/api/v1/orders',
            '/api/v1/user',
            '/api/v1/auth',
            '/api/v1/payments'
        ]
    });
});

module.exports = router;
