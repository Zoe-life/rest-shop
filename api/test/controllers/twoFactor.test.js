/**
 * @module test/controllers/twoFactor.test
 * @description Tests for two-factor authentication controller
 */

const request = require('supertest');
const app = require('../../app');
const User = require('../../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const speakeasy = require('speakeasy');

describe('Two-Factor Authentication', () => {
    let testUser;
    let authToken;
    let twoFactorSecret;

    beforeEach(async function() {
        // Skip all tests if MongoDB is not connected
        if (mongoose.connection.readyState !== 1) {
            this.skip();
        }
        
        // Create a test user
        const hashedPassword = await bcrypt.hash('TestPass123!', 10);
        
        testUser = new User({
            _id: new mongoose.Types.ObjectId(),
            email: '2fatest@example.com',
            password: hashedPassword,
            role: 'user',
            emailVerified: true
        });
        await testUser.save();

        // Generate auth token
        authToken = jwt.sign(
            { email: testUser.email, userId: testUser._id, role: testUser.role },
            process.env.JWT_KEY || 'test_jwt_key',
            { expiresIn: '1h' }
        );
    });

    afterEach(async function() {
        // Skip if MongoDB is not connected
        if (mongoose.connection.readyState !== 1) {
            return;
        }
        
        await User.deleteMany({});
    });

    describe('POST /user/2fa/setup', () => {
        it('should setup 2FA for authenticated user', async () => {
            const res = await request(app)
                .post('/user/2fa/setup')
                .set('Authorization', `Bearer ${authToken}`);

            res.should.have.status(200);
            res.body.should.have.property('message').eql('2FA setup initiated');
            res.body.should.have.property('secret');
            res.body.should.have.property('qrCode');

            const updatedUser = await User.findById(testUser._id);
            updatedUser.should.have.property('twoFactorSecret');
            twoFactorSecret = updatedUser.twoFactorSecret;
        });

        it('should reject setup if 2FA already enabled', async () => {
            testUser.twoFactorEnabled = true;
            await testUser.save();

            const res = await request(app)
                .post('/user/2fa/setup')
                .set('Authorization', `Bearer ${authToken}`);

            res.should.have.status(400);
            res.body.should.have.property('message').eql('2FA is already enabled');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .post('/user/2fa/setup');

            res.should.have.status(401);
        });
    });

    describe('POST /user/2fa/enable', () => {
        beforeEach(async () => {
            const secret = speakeasy.generateSecret({ length: 32 });
            testUser.twoFactorSecret = secret.base32;
            await testUser.save();
            twoFactorSecret = secret.base32;
        });

        it('should enable 2FA with valid token', async () => {
            const token = speakeasy.totp({
                secret: twoFactorSecret,
                encoding: 'base32'
            });

            const res = await request(app)
                .post('/user/2fa/enable')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ token });

            res.should.have.status(200);
            res.body.should.have.property('message').eql('2FA enabled successfully');
            res.body.should.have.property('backupCodes');
            res.body.backupCodes.should.be.an('array');
            res.body.backupCodes.length.should.equal(10);

            const updatedUser = await User.findById(testUser._id);
            updatedUser.twoFactorEnabled.should.be.true;
        });

        it('should reject invalid verification code', async () => {
            const res = await request(app)
                .post('/user/2fa/enable')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ token: '000000' });

            res.should.have.status(400);
            res.body.should.have.property('message').eql('Invalid verification code');
        });
    });

    describe('POST /user/2fa/verify', () => {
        beforeEach(async () => {
            const secret = speakeasy.generateSecret({ length: 32 });
            testUser.twoFactorSecret = secret.base32;
            testUser.twoFactorEnabled = true;
            testUser.twoFactorBackupCodes = ['BACKUP1', 'BACKUP2'];
            await testUser.save();
            twoFactorSecret = secret.base32;
        });

        it('should verify valid TOTP token', async () => {
            const token = speakeasy.totp({
                secret: twoFactorSecret,
                encoding: 'base32'
            });

            const res = await request(app)
                .post('/user/2fa/verify')
                .send({ userId: testUser._id, token });

            res.should.have.status(200);
            res.body.should.have.property('verified').eql(true);
        });

        it('should verify valid backup code', async () => {
            const res = await request(app)
                .post('/user/2fa/verify')
                .send({ userId: testUser._id, token: 'BACKUP1' });

            res.should.have.status(200);
            res.body.should.have.property('verified').eql(true);
            res.body.should.have.property('backupCodesRemaining').eql(1);

            const updatedUser = await User.findById(testUser._id);
            updatedUser.twoFactorBackupCodes.should.not.include('BACKUP1');
        });

        it('should reject invalid token', async () => {
            const res = await request(app)
                .post('/user/2fa/verify')
                .send({ userId: testUser._id, token: '000000' });

            res.should.have.status(400);
            res.body.should.have.property('message').eql('Invalid verification code');
        });
    });

    describe('POST /user/2fa/disable', () => {
        beforeEach(async () => {
            const secret = speakeasy.generateSecret({ length: 32 });
            testUser.twoFactorSecret = secret.base32;
            testUser.twoFactorEnabled = true;
            await testUser.save();
        });

        it('should disable 2FA with valid password', async () => {
            const res = await request(app)
                .post('/user/2fa/disable')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ password: 'TestPass123!' });

            res.should.have.status(200);
            res.body.should.have.property('message').eql('2FA disabled successfully');

            const updatedUser = await User.findById(testUser._id);
            updatedUser.twoFactorEnabled.should.be.false;
            (updatedUser.twoFactorSecret === undefined).should.be.true;
        });

        it('should reject invalid password', async () => {
            const res = await request(app)
                .post('/user/2fa/disable')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ password: 'WrongPassword' });

            res.should.have.status(401);
            res.body.should.have.property('message').eql('Invalid password');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .post('/user/2fa/disable')
                .send({ password: 'TestPass123!' });

            res.should.have.status(401);
        });
    });
});
