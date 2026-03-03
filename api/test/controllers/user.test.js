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
            params: {},
            userData: { userId: new mongoose.Types.ObjectId().toString() }
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
            sinon.stub(User, 'find').returns({
                exec: sinon.stub().resolves([])
            });
            sinon.stub(bcrypt, 'hash').yields(null, 'hashedpassword');
            sinon.stub(User.prototype, 'save').resolves({ 
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
            sinon.stub(User, 'find').returns({
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
            sinon.stub(User, 'find').returns({
                exec: sinon.stub().resolves([{
                    email: 'test@test.com',
                    password: hashedPassword,
                    _id: userId,
                    role: 'user'
                }])
            });
            sinon.stub(bcrypt, 'compare').yields(null, true);

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
            
            sinon.stub(User, 'find').returns({
                exec: sinon.stub().resolves([{
                    email: 'test@test.com',
                    password: hashedPassword
                }])
            });
            sinon.stub(bcrypt, 'compare').yields(null, false);

            await UserController.user_login(req, res, next);

            expect(res.status.calledWith(401)).to.be.true;
            expect(res.json.calledWith({ message: 'Auth failed' })).to.be.true;
        });
    });

    describe('user_update_profile', () => {
        const mockUser = (extra = {}) => ({
            _id: new mongoose.Types.ObjectId(),
            email: 'test@test.com',
            displayName: 'Test User',
            phone: '+1 555 000 0000',
            bio: 'Hello world',
            address: { street: '1 Main St', city: 'Nairobi', state: 'NBO', postalCode: '00100', country: 'Kenya' },
            ...extra
        });

        it('should update displayName, phone, and bio', async () => {
            req.body = { displayName: 'New Name', phone: '+1 555 999 9999', bio: 'Updated bio' };
            const updated = mockUser({ displayName: 'New Name', phone: '+1 555 999 9999', bio: 'Updated bio' });
            sinon.stub(User, 'findByIdAndUpdate').returns({
                select: sinon.stub().returnsThis(),
                exec: sinon.stub().resolves(updated)
            });

            await UserController.user_update_profile(req, res, next);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.getCall(0).args[0]).to.have.property('message', 'Profile updated successfully');
            expect(res.json.getCall(0).args[0].user.displayName).to.equal('New Name');
            expect(res.json.getCall(0).args[0].user.phone).to.equal('+1 555 999 9999');
        });

        it('should update address fields', async () => {
            req.body = { address: { street: '2 Other St', city: 'Mombasa', country: 'Kenya' } };
            const updated = mockUser({ address: { street: '2 Other St', city: 'Mombasa', country: 'Kenya' } });
            sinon.stub(User, 'findByIdAndUpdate').returns({
                select: sinon.stub().returnsThis(),
                exec: sinon.stub().resolves(updated)
            });

            await UserController.user_update_profile(req, res, next);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.getCall(0).args[0].user.address.city).to.equal('Mombasa');
        });

        it('should return 404 when user not found', async () => {
            req.body = { displayName: 'Ghost' };
            sinon.stub(User, 'findByIdAndUpdate').returns({
                select: sinon.stub().returnsThis(),
                exec: sinon.stub().resolves(null)
            });

            await UserController.user_update_profile(req, res, next);

            expect(res.status.calledWith(404)).to.be.true;
        });
    });

    describe('user_upload_avatar', () => {
        it('should return 400 when no file is provided', async () => {
            req.file = undefined;

            await UserController.user_upload_avatar(req, res, next);

            expect(res.status.calledWith(400)).to.be.true;
            expect(res.json.getCall(0).args[0].message).to.equal('No image file provided');
        });

        it('should save the avatar path and return the updated user', async () => {
            req.file = { path: 'uploads/avatar-123.jpg' };
            const updatedUser = {
                _id: req.userData.userId,
                email: 'test@test.com',
                avatarUrl: 'uploads/avatar-123.jpg'
            };
            sinon.stub(User, 'findByIdAndUpdate').returns({
                select: sinon.stub().returnsThis(),
                exec: sinon.stub().resolves(updatedUser)
            });

            await UserController.user_upload_avatar(req, res, next);

            expect(res.status.calledWith(200)).to.be.true;
            expect(res.json.getCall(0).args[0].message).to.equal('Avatar updated successfully');
            expect(res.json.getCall(0).args[0].user.avatarUrl).to.equal('uploads/avatar-123.jpg');
        });

        it('should return 404 when user not found during avatar upload', async () => {
            req.file = { path: 'uploads/avatar-123.jpg' };
            sinon.stub(User, 'findByIdAndUpdate').returns({
                select: sinon.stub().returnsThis(),
                exec: sinon.stub().resolves(null)
            });

            await UserController.user_upload_avatar(req, res, next);

            expect(res.status.calledWith(404)).to.be.true;
        });
    });
});
