const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const checkAuth = require('../../middleware/check-auth');

describe('Check Auth Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            headers: {}
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

    it('should pass valid token', () => {
        const token = jwt.sign(
            { userId: '123', email: 'test@test.com' },
            process.env.JWT_KEY || 'test_key'
        );
        req.headers.authorization = `Bearer ${token}`;

        checkAuth(req, res, next);

        expect(next.calledOnce).to.be.true;
        expect(req.userData).to.exist;
    });

    it('should reject request with no token', () => {
        checkAuth(req, res, next);

        expect(res.status.calledWith(401)).to.be.true;
        expect(res.json.calledWith({ message: 'No auth token provided' })).to.be.true;
    });

    it('should reject invalid token', () => {
        req.headers.authorization = 'Bearer invalid_token';

        checkAuth(req, res, next);

        expect(res.status.calledWith(401)).to.be.true;
        expect(res.json.calledWith({ message: 'Auth failed' })).to.be.true;
    });
}); 