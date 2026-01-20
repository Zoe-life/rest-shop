const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const mongoose = require('mongoose');
const Product = require('../../api/models/product');
const ProductsController = require('../../api/controllers/products');

describe('Products Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            file: {
                path: 'test/path/image.jpg'
            }
        };
        res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub()
        };
        next = sinon.stub();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('products_get_all', () => {
        it('should return all products', async () => {
            const products = [
                { _id: new mongoose.Types.ObjectId(), name: 'Test Product 1' },
                { _id: new mongoose.Types.ObjectId(), name: 'Test Product 2' }
            ];

            const findStub = sinon.stub(Product, 'find').returns({
                select: sinon.stub().returnsThis(),
                exec: sinon.stub().resolves(products)
            });

            await ProductsController.products_get_all(req, res, next);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.getCall(0).args[0].products).to.have.lengthOf(2);
        });

        it('should handle errors when fetching products', async () => {
            const findStub = sinon.stub(Product, 'find').returns({
                select: sinon.stub().returnsThis(),
                exec: sinon.stub().rejects(new Error('Database error'))
            });

            await ProductsController.products_get_all(req, res, next);

            expect(res.status.calledWith(500)).to.be.true;
        });
    });

    describe('products_create_product', () => {
        it('should create a new product successfully', async () => {
            req.body = {
                name: 'New Product',
                price: 99.99
            };

            const saveStub = sinon.stub(Product.prototype, 'save')
                .resolves({
                    _id: new mongoose.Types.ObjectId(),
                    name: req.body.name,
                    price: req.body.price,
                    productImage: req.file.path
                });

            await ProductsController.products_create_product(req, res, next);

            expect(res.status.calledWith(201)).to.be.true;
            expect(saveStub.calledOnce).to.be.true;
        });
    });
}); 
