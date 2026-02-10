const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../models/user');
const UserController = require('../../controllers/user');

describe('User Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                email: 'test@test.com',
                password: 'testpassword'
            },
            params: {}
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

    describe('user_signup', () => {
        it('should create a new user successfully', async () => {
            const userId = new mongoose.Types.ObjectId();
            const findStub = sinon.stub(User, 'find').returns({
                exec: sinon.stub().resolves([])
            });

            const bcryptStub = sinon.stub(bcrypt, 'hash').yields(null, 'hashedpassword');

            const saveStub = sinon.stub(User.prototype, 'save')
                .resolves({ 
                    _id: userId, 
                    email: 'test@test.com',
                    role: 'user',
                    provider: 'local' 
                });

            await UserController.user_signup(req, res, next);

            expect(res.status.calledWith(201)).to.be.true;
            expect(res.json.getCall(0).args[0]).to.have.property('token');
            expect(res.json.getCall(0).args[0]).to.have.property('user');
            expect(res.json.getCall(0).args[0].user).to.have.property('_id');
            expect(res.json.getCall(0).args[0].user).to.have.property('email');
        });

        it('should return 409 if user already exists', async () => {
            const findStub = sinon.stub(User, 'find').returns({
                exec: sinon.stub().resolves([{ email: 'test@test.com' }])
            });

            await UserController.user_signup(req, res, next);

            expect(res.status.calledWith(409)).to.be.true;
            expect(res.json.calledWith({ message: 'User email already exists' })).to.be.true;
        });
    });

    describe('user_login', () => {
        it('should login successfully with correct credentials', async () => {
            const userId = new mongoose.Types.ObjectId();
            const hashedPassword = await bcrypt.hash('testpassword', 10);
            const findStub = sinon.stub(User, 'find').returns({
                exec: sinon.stub().resolves([{
                    email: 'test@test.com',
                    password: hashedPassword,
                    _id: userId,
                    role: 'user'
                }])
            });

            const bcryptCompareStub = sinon.stub(bcrypt, 'compare').yields(null, true);

            await UserController.user_login(req, res, next);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.getCall(0).args[0]).to.have.property('token');
            expect(res.json.getCall(0).args[0]).to.have.property('user');
            expect(res.json.getCall(0).args[0].user).to.have.property('_id');
            expect(res.json.getCall(0).args[0].user).to.have.property('email');
        });

        it('should fail with incorrect credentials', async () => {
            req.body.password = 'wrongpassword';
            const hashedPassword = await bcrypt.hash('testpassword', 10);
            
            const findStub = sinon.stub(User, 'find').returns({
                exec: sinon.stub().resolves([{
                    email: 'test@test.com',
                    password: hashedPassword
                }])
            });

            const bcryptCompareStub = sinon.stub(bcrypt, 'compare').yields(null, false);

            await UserController.user_login(req, res, next);

            expect(res.status.calledWith(401)).to.be.true;
            expect(res.json.calledWith({ message: 'Auth failed' })).to.be.true;
        });
    });
}); 
