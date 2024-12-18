const express = require('express');
const router = express.Router();

//Handle incoming ET requests to /orders
router.get('/', (res, req, next) => {
    res.status(200).json({
        message: 'Orders fetched'
    });
});

router.post('/', (res, req, next) => {
    res.status(201).json({
        message: 'Order created'
    });
});

router.get('/:orderId', (res, req, next) => {
    res.status(200).json({
        message: 'Order details',
        orderId: req.params.orderId
    });
});

router.delete('/:orderId', (res, req, next) => {
    res.status(200).json({
        message: 'Order deleted',
        orderId: req.params.orderId
    });
});

module.exports = router;