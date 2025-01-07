const chai = require('chai');
const {expect} = chai.expect;
const sinon = require('sinon');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../../api/models/user');
const UserController = require('../../api/controllers/user');

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
            const findStub = sinon.stub(User, 'find').returns({
                exec: sinon.stub().resolves([])
            });

            const saveStub = sinon.stub(User.prototype, 'save')
                .resolves({ _id: new mongoose.Types.ObjectId() });

            await UserController.user_signup(req, res, next);

            expect(res.status.calledWith(201)).to.be.true;
            expect(res.json.calledWith({ message: 'User created' })).to.be.true;
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
            const hashedPassword = await bcrypt.hash('testpassword', 10);
            const findStub = sinon.stub(User, 'find').returns({
                exec: sinon.stub().resolves([{
                    email: 'test@test.com',
                    password: hashedPassword,
                    _id: new mongoose.Types.ObjectId()
                }])
            });

            await UserController.user_login(req, res, next);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.getCall(0).args[0]).to.have.property('token');
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

            await UserController.user_login(req, res, next);

            expect(res.status.calledWith(401)).to.be.true;
            expect(res.json.calledWith({ message: 'Auth failed' })).to.be.true;
        });
    });
}); 
