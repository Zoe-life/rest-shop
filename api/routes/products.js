const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
    res.status(200).json({
        message: 'Handling GET requests to /products'
    });
});

router.post('/', (req, res, next) => {
    const product = {
        name: req.body.name,
        price: req.body.price
    };
    res.status(201).json({
        message: 'Handling POST requests to /products',
        createdProduct: product
    });
});


router.get('/:productId', (req, res, next) => {
    const id = req.params.productId;
    // Adding proper error handling and response
    if (id) {
        res.status(200).json({
            message: 'Product details',
            productId: id,
            product: {
                name: 'Sample Product',
                price: 99.99,
            }
        });
    } else {
        const error = new Error('Product not found');
        error.status = 404;
        next(error);
    }
});

router.patch('/:productId', (req, res, next) => {
    res.status(200).json({
        message: 'Updated product!'
    });
});

router.delete('/:productId', (req, res, next) => {
    res.status(200).json({
        message: 'Deleted product!'
    });
});

module.exports = router;