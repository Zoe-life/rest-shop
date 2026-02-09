const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const Payment = require('../../models/payment');
const Order = require('../../models/order');
const PaymentsController = require('../../controllers/payments');
const PaymentFactory = require('../../services/paymentFactory');

describe('Payments Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            userData: {
                userId: new mongoose.Types.ObjectId(),
                role: 'user'
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

    describe('payments_mpesa_callback', () => {
        it('should handle valid M-Pesa callback successfully', async () => {
            const checkoutRequestId = 'ws_CO_12345678901234567890';
            const mockPayment = {
                _id: new mongoose.Types.ObjectId(),
                transactionId: checkoutRequestId,
                orderId: new mongoose.Types.ObjectId(),
                status: 'pending',
                metadata: {},
                save: sinon.stub().resolves()
            };
            const mockOrder = {
                _id: mockPayment.orderId,
                paymentStatus: 'pending',
                status: 'pending',
                save: sinon.stub().resolves()
            };

            const callbackData = {
                Body: {
                    stkCallback: {
                        ResultCode: 0,
                        CheckoutRequestID: checkoutRequestId,
                        MerchantRequestID: 'test-merchant-id',
                        ResultDesc: 'Success'
                    }
                }
            };

            req.body = callbackData;

            const mockMpesaService = {
                handleCallback: sinon.stub().resolves({
                    checkoutRequestId: checkoutRequestId,
                    status: 'completed',
                    mpesaReceiptNumber: 'ABC123',
                    transactionDate: new Date()
                })
            };

            sinon.stub(PaymentFactory, 'getPaymentService').returns(mockMpesaService);
            sinon.stub(Payment, 'findOne').resolves(mockPayment);
            sinon.stub(Order, 'findById').resolves(mockOrder);

            await PaymentsController.payments_mpesa_callback(req, res, next);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledWith({
                ResultCode: 0,
                ResultDesc: 'Success'
            })).to.be.true;
            expect(mockPayment.save.called).to.be.true;
            expect(mockOrder.save.called).to.be.true;
        });

        it('should reject M-Pesa callback with NoSQL injection attempt (object)', async () => {
            const callbackData = {
                Body: {
                    stkCallback: {
                        ResultCode: 0,
                        CheckoutRequestID: { $ne: null }, // NoSQL injection attempt
                        MerchantRequestID: 'test-merchant-id',
                        ResultDesc: 'Success'
                    }
                }
            };

            req.body = callbackData;

            const mockMpesaService = {
                handleCallback: sinon.stub().resolves({
                    checkoutRequestId: { $ne: null }, // Returns the malicious object
                    status: 'completed'
                })
            };

            sinon.stub(PaymentFactory, 'getPaymentService').returns(mockMpesaService);
            const findOneStub = sinon.stub(Payment, 'findOne');

            await PaymentsController.payments_mpesa_callback(req, res, next);

            // Should not call Payment.findOne with malicious data
            expect(findOneStub.called).to.be.false;
            
            // Should still return success to M-Pesa to prevent retries
            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledWith({
                ResultCode: 0,
                ResultDesc: 'Accepted'
            })).to.be.true;
        });

        it('should reject M-Pesa callback with null checkoutRequestId', async () => {
            const callbackData = {
                Body: {
                    stkCallback: {
                        ResultCode: 0,
                        CheckoutRequestID: null,
                        MerchantRequestID: 'test-merchant-id',
                        ResultDesc: 'Success'
                    }
                }
            };

            req.body = callbackData;

            const mockMpesaService = {
                handleCallback: sinon.stub().resolves({
                    checkoutRequestId: null,
                    status: 'completed'
                })
            };

            sinon.stub(PaymentFactory, 'getPaymentService').returns(mockMpesaService);
            const findOneStub = sinon.stub(Payment, 'findOne');

            await PaymentsController.payments_mpesa_callback(req, res, next);

            // Should not call Payment.findOne
            expect(findOneStub.called).to.be.false;
            
            // Should return success to M-Pesa
            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledWith({
                ResultCode: 0,
                ResultDesc: 'Accepted'
            })).to.be.true;
        });

        it('should reject M-Pesa callback with undefined checkoutRequestId', async () => {
            const callbackData = {
                Body: {
                    stkCallback: {
                        ResultCode: 0,
                        MerchantRequestID: 'test-merchant-id',
                        ResultDesc: 'Success'
                    }
                }
            };

            req.body = callbackData;

            const mockMpesaService = {
                handleCallback: sinon.stub().resolves({
                    status: 'completed'
                    // checkoutRequestId is undefined
                })
            };

            sinon.stub(PaymentFactory, 'getPaymentService').returns(mockMpesaService);
            const findOneStub = sinon.stub(Payment, 'findOne');

            await PaymentsController.payments_mpesa_callback(req, res, next);

            // Should not call Payment.findOne
            expect(findOneStub.called).to.be.false;
            
            // Should return success to M-Pesa
            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledWith({
                ResultCode: 0,
                ResultDesc: 'Accepted'
            })).to.be.true;
        });

        it('should reject M-Pesa callback with numeric checkoutRequestId', async () => {
            const callbackData = {
                Body: {
                    stkCallback: {
                        ResultCode: 0,
                        CheckoutRequestID: 12345,
                        MerchantRequestID: 'test-merchant-id',
                        ResultDesc: 'Success'
                    }
                }
            };

            req.body = callbackData;

            const mockMpesaService = {
                handleCallback: sinon.stub().resolves({
                    checkoutRequestId: 12345,
                    status: 'completed'
                })
            };

            sinon.stub(PaymentFactory, 'getPaymentService').returns(mockMpesaService);
            const findOneStub = sinon.stub(Payment, 'findOne');

            await PaymentsController.payments_mpesa_callback(req, res, next);

            // Should not call Payment.findOne
            expect(findOneStub.called).to.be.false;
            
            // Should return success to M-Pesa
            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledWith({
                ResultCode: 0,
                ResultDesc: 'Accepted'
            })).to.be.true;
        });

        it('should reject M-Pesa callback with empty string checkoutRequestId', async () => {
            const callbackData = {
                Body: {
                    stkCallback: {
                        ResultCode: 0,
                        CheckoutRequestID: '',
                        MerchantRequestID: 'test-merchant-id',
                        ResultDesc: 'Success'
                    }
                }
            };

            req.body = callbackData;

            const mockMpesaService = {
                handleCallback: sinon.stub().resolves({
                    checkoutRequestId: '',
                    status: 'completed'
                })
            };

            sinon.stub(PaymentFactory, 'getPaymentService').returns(mockMpesaService);
            const findOneStub = sinon.stub(Payment, 'findOne');

            await PaymentsController.payments_mpesa_callback(req, res, next);

            // Should not call Payment.findOne with empty string
            expect(findOneStub.called).to.be.false;
            
            // Should return success to M-Pesa
            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledWith({
                ResultCode: 0,
                ResultDesc: 'Accepted'
            })).to.be.true;
        });

        it('should handle callback when payment is not found', async () => {
            const checkoutRequestId = 'ws_CO_12345678901234567890';
            const callbackData = {
                Body: {
                    stkCallback: {
                        ResultCode: 0,
                        CheckoutRequestID: checkoutRequestId,
                        MerchantRequestID: 'test-merchant-id',
                        ResultDesc: 'Success'
                    }
                }
            };

            req.body = callbackData;

            const mockMpesaService = {
                handleCallback: sinon.stub().resolves({
                    checkoutRequestId: checkoutRequestId,
                    status: 'completed'
                })
            };

            sinon.stub(PaymentFactory, 'getPaymentService').returns(mockMpesaService);
            sinon.stub(Payment, 'findOne').resolves(null);

            await PaymentsController.payments_mpesa_callback(req, res, next);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledWith({
                ResultCode: 0,
                ResultDesc: 'Success'
            })).to.be.true;
        });

        it('should handle errors gracefully', async () => {
            const callbackData = {
                Body: {
                    stkCallback: {
                        ResultCode: 0,
                        CheckoutRequestID: 'ws_CO_12345678901234567890',
                        MerchantRequestID: 'test-merchant-id',
                        ResultDesc: 'Success'
                    }
                }
            };

            req.body = callbackData;

            const mockMpesaService = {
                handleCallback: sinon.stub().rejects(new Error('Service error'))
            };

            sinon.stub(PaymentFactory, 'getPaymentService').returns(mockMpesaService);

            await PaymentsController.payments_mpesa_callback(req, res, next);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.calledWith({
                ResultCode: 0,
                ResultDesc: 'Accepted'
            })).to.be.true;
        });
    });
});
