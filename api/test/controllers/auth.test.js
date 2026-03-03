/**
 * @module test/controllers/auth.test
 * @description Tests for authentication controller (email verification and password reset)
 */

const request = require('supertest');
const app = require('../../app');
const User = require('../../models/user');
const { createCode, consumeCode } = require('../../utils/authCodeStore');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { generateOAuthState, verifyOAuthState } = require('../../utils/oauthState');

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

describe('GET /auth/token', () => {
    const jwtKey = process.env.JWT_KEY || 'test_jwt_key';

    it('should return token info when a valid Bearer token is provided in Authorization header', async () => {
        const token = jwt.sign(
            { email: 'test@example.com', userId: new mongoose.Types.ObjectId(), role: 'user' },
            jwtKey,
            { expiresIn: '1h' }
        );

        const res = await request(app)
            .get('/auth/token')
            .set('Authorization', `Bearer ${token}`);

        res.should.have.status(200);
        res.body.should.have.property('token').eql(token);
        res.body.should.have.property('expiresAt');
    });

    it('should return 401 when an invalid Bearer token is provided in Authorization header', async () => {
        const res = await request(app)
            .get('/auth/token')
            .set('Authorization', 'Bearer invalid.token.value');

        res.should.have.status(401);
        res.body.should.have.property('message').eql('Invalid or expired token');
    });

    it('should return 401 when no token is provided (no cookie and no Authorization header)', async () => {
        const res = await request(app)
            .get('/auth/token');

        res.should.have.status(401);
        res.body.should.have.property('message').eql('No authentication token found');
    });
});

describe('OAuth HMAC State (utils/oauthState)', () => {
    const secret = process.env.JWT_KEY || 'test_jwt_key';

    describe('generateOAuthState()', () => {
        it('should return a string of the form <nonce>.<hmac>', () => {
            const state = generateOAuthState();
            state.should.be.a('string');
            const parts = state.split('.');
            parts.length.should.equal(2);
            const [nonce, sig] = parts;
            nonce.should.have.lengthOf(32); // 16 bytes hex
            sig.should.have.lengthOf(64);   // SHA-256 hex
        });

        it('should produce a different state on each call', () => {
            const s1 = generateOAuthState();
            const s2 = generateOAuthState();
            s1.should.not.equal(s2);
        });
    });

    describe('verifyOAuthState()', () => {
        it('should return true for a freshly generated state', () => {
            const state = generateOAuthState();
            verifyOAuthState(state).should.equal(true);
        });

        it('should return false for a tampered nonce', () => {
            const state = generateOAuthState();
            const [, sig] = state.split('.');
            const tamperedState = `00000000000000000000000000000000.${sig}`;
            verifyOAuthState(tamperedState).should.equal(false);
        });

        it('should return false for a tampered signature', () => {
            const state = generateOAuthState();
            const [nonce] = state.split('.');
            const badSig = 'a'.repeat(64);
            verifyOAuthState(`${nonce}.${badSig}`).should.equal(false);
        });

        it('should return false when the state has no dot separator', () => {
            verifyOAuthState('nodotinthisstring').should.equal(false);
        });

        it('should return false for an empty string', () => {
            verifyOAuthState('').should.equal(false);
        });

        it('should return false for null / undefined', () => {
            verifyOAuthState(null).should.equal(false);
            verifyOAuthState(undefined).should.equal(false);
        });

        it('should return false for a state signed with a different secret', () => {
            // Manually build a state with a wrong key
            const nonce = crypto.randomBytes(16).toString('hex');
            const badSig = crypto
                .createHmac('sha256', 'wrong-secret')
                .update(nonce)
                .digest('hex');
            verifyOAuthState(`${nonce}.${badSig}`).should.equal(false);
        });
    });

    describe('GET /auth/google (no oauth_state cookie set)', () => {
        it('should not set an oauth_state cookie on the initiation redirect', async () => {
            // Without OAuth credentials configured, Passport will throw.
            // We only need to confirm no oauth_state cookie leaks out regardless.
            const res = await request(app).get('/auth/google');
            const setCookieHeader = res.headers['set-cookie'];
            const hasStateCookie = setCookieHeader
                ? setCookieHeader.some(c => c.startsWith('oauth_state='))
                : false;
            hasStateCookie.should.equal(false);
        });
    });
});

describe('POST /auth/exchange', () => {
    let testUser;

    beforeEach(async function() {
        if (mongoose.connection.readyState !== 1) {
            this.skip();
        }
        const hashedPassword = await bcrypt.hash('TestPass123!', 10);
        testUser = new User({
            _id: new mongoose.Types.ObjectId(),
            email: 'exchangetest@example.com',
            password: hashedPassword,
            emailVerified: true
        });
        await testUser.save();
    });

    afterEach(async function() {
        if (mongoose.connection.readyState !== 1) return;
        await User.deleteMany({});
    });

    it('should return a JWT for a valid exchange code', async () => {
        const code = createCode(testUser._id);

        const res = await request(app)
            .post('/auth/exchange')
            .send({ code });

        res.should.have.status(200);
        res.body.should.have.property('token');
        res.body.should.have.property('expiresAt');

        const decoded = jwt.verify(res.body.token, process.env.JWT_KEY || 'test_jwt_key');
        decoded.should.have.property('email').eql(testUser.email);
    });

    it('should delete the exchange code after use (single-use guarantee)', async () => {
        const code = createCode(testUser._id);

        // First use succeeds
        const res1 = await request(app)
            .post('/auth/exchange')
            .send({ code });
        res1.should.have.status(200);

        // Second use with the same code must fail
        const res2 = await request(app)
            .post('/auth/exchange')
            .send({ code });
        res2.should.have.status(401);
        res2.body.should.have.property('message').eql('Invalid or expired exchange code');
    });

    it('should return 401 for an unknown exchange code', async () => {
        const res = await request(app)
            .post('/auth/exchange')
            .send({ code: 'nonexistentcode1' });

        res.should.have.status(401);
        res.body.should.have.property('message').eql('Invalid or expired exchange code');
    });

    it('should return 401 for a code that has been manually consumed', async () => {
        const code = createCode(testUser._id);
        // Consume it before the HTTP request
        consumeCode(code);

        const res = await request(app)
            .post('/auth/exchange')
            .send({ code });

        res.should.have.status(401);
        res.body.should.have.property('message').eql('Invalid or expired exchange code');
    });

    it('should return 400 when no code is provided', async () => {
        const res = await request(app)
            .post('/auth/exchange')
            .send({});

        res.should.have.status(400);
        res.body.should.have.property('message').eql('Exchange code is required');
    });
});
