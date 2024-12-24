const express = require('express');
const router = express.Router();

//Handle incoming ET requests to /orders
router.get('/', (req, res, next) => {
    try {
        res.status(200).json({
            message: 'Orders fetched successfully',
            orders: [
                {
                    orderId: '123',
                    productId: 'xyz',
                    quantity: 2
                },
                {
                    orderId: '456',
                    productId: 'abc',
                    quantity: 1
                }
            ]
        });
    } catch (error) {
        next(error);
    }
});


router.get('/:orderId', (req, res, next) => {
    const id = req.params.orderId;
    // Adding proper error handling and response
    if (id) {
        res.status(200).json({
            message: 'Order details',
            orderId: id,
            order: {
                productId: 'sample-product-id',
                quantity: 1,
            }
        });
    } else {
        const error = new Error('Order not found');
        error.status = 404;
        next(error);
    }
});

router.post('/', (req, res, next) => {
    const order = {
        productId: req.body.productId,
        quantity: req.body.quantity
    };
    res.status(201).json({
        message: 'Order created',
        order: order
    });
});

router.patch('/:orderId', (req, res, next) => {
    res.status(200).json({
        message: 'Order updated',
        orderId: req.params.orderId
    });
});

router.delete('/:orderId', (req, res, next) => {
    res.status(200).json({
        message: 'Order deleted',
        orderId: req.params.orderId
    });
});

module.exports = router;