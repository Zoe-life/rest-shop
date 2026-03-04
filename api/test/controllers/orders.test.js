const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const mongoose = require('mongoose');
const Order = require('../../models/order');
const Product = require('../../models/product');
const OrdersController = require('../../controllers/orders');

describe('Orders Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            userData: {
                userId: new mongoose.Types.ObjectId()
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

    describe('orders_get_all', () => {
        it('should return all orders', async () => {
            const orders = [
                { _id: new mongoose.Types.ObjectId(), product: new mongoose.Types.ObjectId() },
                { _id: new mongoose.Types.ObjectId(), product: new mongoose.Types.ObjectId() }
            ];

            const findStub = sinon.stub(Order, 'find').returns({
                select: sinon.stub().returnsThis(),
                populate: sinon.stub().returnsThis(),
                sort: sinon.stub().returnsThis(),
                limit: sinon.stub().returnsThis(),
                skip: sinon.stub().returnsThis(),
                exec: sinon.stub().resolves(orders)
            });

            sinon.stub(Order, 'countDocuments').resolves(2);

            await OrdersController.orders_get_all(req, res, next);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.getCall(0).args[0].orders).to.have.lengthOf(2);
        });
    });

    describe('orders_create_order', () => {
        it('should create a new order successfully (no stock field)', async () => {
            req.body = {
                productId: new mongoose.Types.ObjectId(),
                quantity: 2
            };

            sinon.stub(Product, 'findById').resolves({
                _id: req.body.productId,
                name: 'Test Product',
                price: 100
            });

            const saveStub = sinon.stub(Order.prototype, 'save')
                .resolves({
                    _id: new mongoose.Types.ObjectId(),
                    product: req.body.productId,
                    quantity: req.body.quantity
                });

            await OrdersController.orders_create_order(req, res, next);

            expect(res.status.calledWith(201)).to.be.true;
            expect(saveStub.calledOnce).to.be.true;
        });

        it('should atomically decrement stock and create order', async () => {
            req.body = {
                productId: new mongoose.Types.ObjectId(),
                quantity: 2
            };

            sinon.stub(Product, 'findById').resolves({
                _id: req.body.productId,
                name: 'Test Product',
                price: 100,
                stock: 10
            });

            const findOneAndUpdateStub = sinon.stub(Product, 'findOneAndUpdate').resolves({
                _id: req.body.productId,
                stock: 8
            });

            const saveStub = sinon.stub(Order.prototype, 'save').resolves({
                _id: new mongoose.Types.ObjectId(),
                product: req.body.productId,
                quantity: req.body.quantity
            });

            await OrdersController.orders_create_order(req, res, next);

            expect(res.status.calledWith(201)).to.be.true;
            expect(findOneAndUpdateStub.calledOnce).to.be.true;
            expect(saveStub.calledOnce).to.be.true;
        });

        it('should return 400 when stock is insufficient', async () => {
            req.body = {
                productId: new mongoose.Types.ObjectId(),
                quantity: 5
            };

            sinon.stub(Product, 'findById').resolves({
                _id: req.body.productId,
                name: 'Test Product',
                price: 100,
                stock: 3
            });

            // findOneAndUpdate returns null when stock condition is not met
            sinon.stub(Product, 'findOneAndUpdate').resolves(null);

            await OrdersController.orders_create_order(req, res, next);

            expect(res.status.calledWith(400)).to.be.true;
        });

        it('should restore stock if order.save() fails', async () => {
            req.body = {
                productId: new mongoose.Types.ObjectId(),
                quantity: 2
            };

            sinon.stub(Product, 'findById').resolves({
                _id: req.body.productId,
                name: 'Test Product',
                price: 100,
                stock: 10
            });

            const findOneAndUpdateStub = sinon.stub(Product, 'findOneAndUpdate');
            // First call: decrement stock
            findOneAndUpdateStub.onFirstCall().resolves({ _id: req.body.productId, stock: 8 });
            // Second call: restore stock
            findOneAndUpdateStub.onSecondCall().resolves({ _id: req.body.productId, stock: 10 });

            sinon.stub(Order.prototype, 'save').rejects(new Error('DB write failed'));

            await OrdersController.orders_create_order(req, res, next);

            expect(res.status.calledWith(500)).to.be.true;
            // Verify stock was restored (findOneAndUpdate called twice: decrement + restore)
            expect(findOneAndUpdateStub.calledTwice).to.be.true;
            const restoreCall = findOneAndUpdateStub.getCall(1);
            expect(restoreCall.args[1]).to.deep.equal({ $inc: { stock: 2 } });
        });

        it('should handle non-existent product', async () => {
            req.body = {
                productId: new mongoose.Types.ObjectId(),
                quantity: 2
            };

            sinon.stub(Product, 'findById').resolves(null);

            await OrdersController.orders_create_order(req, res, next);

            expect(res.status.calledWith(404)).to.be.true;
        });
    });
}); 