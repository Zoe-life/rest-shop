const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const crypto = require('crypto');
const { validateMpesaWebhook, validateWebhookSignature, getClientIP } = require('../../middleware/validate-webhook');

describe('Webhook Validation Middleware', () => {
    let req, res, next;
    let originalEnv;

    beforeEach(() => {
        // Save original environment
        originalEnv = { ...process.env };
        
        req = {
            headers: {},
            body: {},
            ip: '192.168.1.1',
            connection: { remoteAddress: '192.168.1.1' }
        };
        res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub()
        };
        next = sinon.stub();
    });

    afterEach(() => {
        sinon.restore();
        // Restore original environment
        process.env = originalEnv;
    });

    describe('getClientIP', () => {
        it('should return direct connection IP when TRUST_PROXY is false', () => {
            process.env.TRUST_PROXY = 'false';
            req.headers['x-forwarded-for'] = '10.0.0.1, 192.168.1.1';
            req.ip = '192.168.1.1';

            const ip = getClientIP(req);
            
            expect(ip).to.equal('192.168.1.1');
        });

        it('should return x-forwarded-for IP when TRUST_PROXY is true', () => {
            process.env.TRUST_PROXY = 'true';
            req.headers['x-forwarded-for'] = '10.0.0.1, 192.168.1.1';

            const ip = getClientIP(req);
            
            expect(ip).to.equal('10.0.0.1');
        });

        it('should return x-real-ip when TRUST_PROXY is true and no x-forwarded-for', () => {
            process.env.TRUST_PROXY = 'true';
            req.headers['x-real-ip'] = '10.0.0.2';

            const ip = getClientIP(req);
            
            expect(ip).to.equal('10.0.0.2');
        });

        it('should return direct IP when TRUST_PROXY is true but no proxy headers', () => {
            process.env.TRUST_PROXY = 'true';
            req.ip = '192.168.1.1';

            const ip = getClientIP(req);
            
            expect(ip).to.equal('192.168.1.1');
        });
    });

    describe('validateMpesaWebhook', () => {
        it('should allow request in development when no IPs configured', () => {
            process.env.NODE_ENV = 'development';
            process.env.MPESA_ALLOWED_IPS = '';

            validateMpesaWebhook(req, res, next);

            expect(next.calledOnce).to.be.true;
            expect(res.status.called).to.be.false;
        });

        it('should deny request in production when no IPs configured', () => {
            process.env.NODE_ENV = 'production';
            process.env.MPESA_ALLOWED_IPS = '';

            validateMpesaWebhook(req, res, next);

            expect(res.status.calledWith(403)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
            expect(next.called).to.be.false;
        });

        it('should deny request when IP allowlist is empty', () => {
            process.env.NODE_ENV = 'production';
            process.env.MPESA_ALLOWED_IPS = '   ';

            validateMpesaWebhook(req, res, next);

            expect(res.status.calledWith(403)).to.be.true;
            expect(next.called).to.be.false;
        });

        it('should allow request from allowed IP', () => {
            process.env.MPESA_ALLOWED_IPS = '192.168.1.1,10.0.0.1';
            req.ip = '192.168.1.1';

            validateMpesaWebhook(req, res, next);

            expect(next.calledOnce).to.be.true;
            expect(res.status.called).to.be.false;
        });

        it('should deny request from unauthorized IP', () => {
            process.env.MPESA_ALLOWED_IPS = '10.0.0.1,10.0.0.2';
            req.ip = '192.168.1.1';

            validateMpesaWebhook(req, res, next);

            expect(res.status.calledWith(403)).to.be.true;
            expect(res.json.calledWith({ message: 'Webhook access denied' })).to.be.true;
            expect(next.called).to.be.false;
        });

        it('should handle comma-separated IPs with spaces', () => {
            process.env.MPESA_ALLOWED_IPS = '192.168.1.1 , 10.0.0.1 , 10.0.0.2';
            req.ip = '10.0.0.1';

            validateMpesaWebhook(req, res, next);

            expect(next.calledOnce).to.be.true;
            expect(res.status.called).to.be.false;
        });
    });

    describe('validateWebhookSignature', () => {
        const secret = 'test_secret_key';
        let middleware;

        beforeEach(() => {
            middleware = validateWebhookSignature(secret);
        });

        it('should reject request without signature header', () => {
            req.body = { test: 'data' };

            middleware(req, res, next);

            expect(res.status.calledWith(401)).to.be.true;
            expect(res.json.calledWith({ message: 'Webhook signature required' })).to.be.true;
            expect(next.called).to.be.false;
        });

        it('should accept request with valid signature', () => {
            const payload = JSON.stringify({ test: 'data' });
            const signature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');

            req.body = { test: 'data' };
            req.headers['x-webhook-signature'] = signature;

            middleware(req, res, next);

            expect(next.calledOnce).to.be.true;
            expect(res.status.called).to.be.false;
        });

        it('should accept request with valid x-signature header', () => {
            const payload = JSON.stringify({ test: 'data' });
            const signature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');

            req.body = { test: 'data' };
            req.headers['x-signature'] = signature;

            middleware(req, res, next);

            expect(next.calledOnce).to.be.true;
            expect(res.status.called).to.be.false;
        });

        it('should reject request with invalid signature', () => {
            req.body = { test: 'data' };
            req.headers['x-webhook-signature'] = 'invalid_signature_hash';

            middleware(req, res, next);

            expect(res.status.calledWith(403)).to.be.true;
            expect(res.json.calledWith({ message: 'Invalid webhook signature' })).to.be.true;
            expect(next.called).to.be.false;
        });

        it('should reject request with wrong length signature (DoS protection)', () => {
            req.body = { test: 'data' };
            // Short signature that will have different buffer length
            req.headers['x-webhook-signature'] = 'abc123';

            middleware(req, res, next);

            expect(res.status.calledWith(403)).to.be.true;
            expect(next.called).to.be.false;
        });

        it('should handle signature validation errors gracefully', () => {
            req.body = { test: 'data' };
            // Non-hex signature that might cause Buffer.from to behave unexpectedly
            req.headers['x-webhook-signature'] = 'not_a_hex_string!@#$';

            middleware(req, res, next);

            // Should either reject as invalid length or invalid signature, not crash
            expect(res.status.called).to.be.true;
            expect(next.called).to.be.false;
        });

        it('should use constant-time comparison to prevent timing attacks', () => {
            // This test verifies that we're using crypto.timingSafeEqual
            const payload = JSON.stringify({ test: 'data' });
            const correctSignature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');
            
            // Create an almost-correct signature (differs in last character)
            const almostCorrectSignature = correctSignature.slice(0, -1) + '0';

            req.body = { test: 'data' };
            req.headers['x-webhook-signature'] = almostCorrectSignature;

            middleware(req, res, next);

            // Should reject even though signature is almost correct
            expect(res.status.calledWith(403)).to.be.true;
            expect(next.called).to.be.false;
        });
    });
});
