/**
 * @module test/controllers/auth.test
 * @description Tests for authentication controller (email verification and password reset)
 */

const request = require('supertest');
const app = require('../../app');
const User = require('../../models/user');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

describe('Auth Controller', () => {
    let testUser;
    let verificationToken;
    let resetToken;

    beforeEach(async function() {
        // Skip all tests if MongoDB is not connected
        if (mongoose.connection.readyState !== 1) {
            this.skip();
        }
        
        // Create a test user
        const hashedPassword = await bcrypt.hash('TestPass123!', 10);
        verificationToken = crypto.randomBytes(32).toString('hex');
        resetToken = crypto.randomBytes(32).toString('hex');
        
        testUser = new User({
            _id: new mongoose.Types.ObjectId(),
            email: 'authtest@example.com',
            password: hashedPassword,
            emailVerified: false,
            emailVerificationToken: verificationToken,
            emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000
        });
        await testUser.save();
    });

    afterEach(async function() {
        // Skip if MongoDB is not connected
        if (mongoose.connection.readyState !== 1) {
            return;
        }
        
        await User.deleteMany({});
    });

    describe('POST /user/request-verification', () => {
        it('should send verification email for existing user', async () => {
            const res = await request(app)
                .post('/user/request-verification')
                .send({ email: 'authtest@example.com' });

            res.should.have.status(200);
            res.body.should.have.property('message').eql('Verification email sent successfully');
        });

        it('should not reveal if user does not exist', async () => {
            const res = await request(app)
                .post('/user/request-verification')
                .send({ email: 'nonexistent@example.com' });

            res.should.have.status(200);
        });

        it('should reject if email is already verified', async () => {
            testUser.emailVerified = true;
            await testUser.save();

            const res = await request(app)
                .post('/user/request-verification')
                .send({ email: 'authtest@example.com' });

            res.should.have.status(400);
            res.body.should.have.property('message').eql('Email is already verified');
        });
    });

    describe('GET /user/verify-email/:token', () => {
        it('should verify email with valid token', async () => {
            const res = await request(app)
                .get(`/user/verify-email/${verificationToken}`);

            res.should.have.status(200);
            res.body.should.have.property('message').eql('Email verified successfully');

            const updatedUser = await User.findById(testUser._id);
            updatedUser.emailVerified.should.be.true;
        });

        it('should reject invalid token', async () => {
            const res = await request(app)
                .get('/user/verify-email/invalid-token');

            res.should.have.status(400);
            res.body.should.have.property('message').eql('Invalid or expired verification token');
        });

        it('should reject expired token', async () => {
            testUser.emailVerificationExpires = Date.now() - 1000;
            await testUser.save();

            const res = await request(app)
                .get(`/user/verify-email/${verificationToken}`);

            res.should.have.status(400);
            res.body.should.have.property('message').eql('Invalid or expired verification token');
        });
    });

    describe('POST /user/request-password-reset', () => {
        it('should send password reset email for existing user', async () => {
            const res = await request(app)
                .post('/user/request-password-reset')
                .send({ email: 'authtest@example.com' });

            res.should.have.status(200);
            res.body.should.have.property('message').eql('Password reset email sent successfully');

            const updatedUser = await User.findById(testUser._id);
            updatedUser.should.have.property('passwordResetToken');
            updatedUser.should.have.property('passwordResetExpires');
        });

        it('should not reveal if user does not exist', async () => {
            const res = await request(app)
                .post('/user/request-password-reset')
                .send({ email: 'nonexistent@example.com' });

            res.should.have.status(200);
        });
    });

    describe('POST /user/reset-password/:token', () => {
        beforeEach(async () => {
            testUser.passwordResetToken = resetToken;
            testUser.passwordResetExpires = Date.now() + 60 * 60 * 1000;
            await testUser.save();
        });

        it('should reset password with valid token', async () => {
            const newPassword = 'NewPass123!';
            const res = await request(app)
                .post(`/user/reset-password/${resetToken}`)
                .send({ password: newPassword });

            res.should.have.status(200);
            res.body.should.have.property('message').eql('Password reset successfully');

            const updatedUser = await User.findById(testUser._id);
            const isMatch = await bcrypt.compare(newPassword, updatedUser.password);
            isMatch.should.be.true;
            (updatedUser.passwordResetToken === undefined).should.be.true;
        });

        it('should reject weak password', async () => {
            const res = await request(app)
                .post(`/user/reset-password/${resetToken}`)
                .send({ password: 'weak' });

            res.should.have.status(400);
            res.body.should.have.property('message').include('at least 8 characters');
        });

        it('should reject invalid token', async () => {
            const res = await request(app)
                .post('/user/reset-password/invalid-token')
                .send({ password: 'NewPass123!' });

            res.should.have.status(400);
            res.body.should.have.property('message').eql('Invalid or expired reset token');
        });

        it('should reject expired token', async () => {
            testUser.passwordResetExpires = Date.now() - 1000;
            await testUser.save();

            const res = await request(app)
                .post(`/user/reset-password/${resetToken}`)
                .send({ password: 'NewPass123!' });

            res.should.have.status(400);
            res.body.should.have.property('message').eql('Invalid or expired reset token');
        });
    });
});
