/**
 * @module routes/orders
 * @description Order management routes for handling customer orders
 */

const express = require('express');
const router = express.Router();
const checkAuth = require('../middleware/check-auth');
const checkRole = require('../middleware/check-role');
const OrdersController = require('../controllers/orders');

/**
 * @route GET /orders
 * @description Retrieve all orders
 * @access Private
 * @middleware Authentication required
 * @roles admin, user
 */
router.get('/',
    checkAuth,
    checkRole(['admin', 'user']),
    OrdersController.orders_get_all
);

/**
 * @route GET /orders/:orderId
 * @description Retrieve a specific order
 * @access Private
 * @middleware Authentication required
 * @roles admin, user
 * @param {string} orderId - The ID of the order to retrieve
 */
router.get('/:orderId',
    checkAuth,
    checkRole(['admin', 'user']),
    OrdersController.orders_get_order
);

/**
 * @route POST /orders
 * @description Create a new order
 * @access Private
 * @middleware Authentication required
 * @roles admin, user
 */
router.post('/',
    checkAuth,
    checkRole(['admin', 'user']),
    OrdersController.orders_create_order
);

/**
 * @route DELETE /orders/:orderId
 * @description Delete a specific order
 * @access Private
 * @middleware Authentication required
 * @roles admin
 * @param {string} orderId - The ID of the order to delete
 */
router.delete('/:orderId',
    checkAuth,
    checkRole(['admin']),
    OrdersController.orders_delete_order
);

module.exports = router;