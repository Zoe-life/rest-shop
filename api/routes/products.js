const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
    res.status(200).json({
        message: 'Handling GET requests to /products'
    });
});

router.post('/', (req, res, next) => {
    res.status(201).json({
        message: 'Handling POST requests to /products'
    });
});

router.get('/:productId', (req, res, next) => {
    const id = req.params.productID;
    if (id == 'special') {
        res.status(200).json({
            message: 'ID discovered',
            id: id
        });
    } else {
        res.status(200).json({
            message: 'An ID has been passed'
        });
    }
});

router.patch('/:productId', (res, req, next) => {
    res.status(200).json({
        message: 'Updated product!'
    });
});

router.delete('/:productId', (res, req, next) => {
    res.status(200).json({
        message: 'Deleted product!'
    });
});

module.exports = router;