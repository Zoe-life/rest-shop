/**
 * Metrics Middleware & Endpoint Tests
 */

const { describe, it, before, after, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');

describe('Metrics Middleware', () => {
    let metricsMiddleware;
    let normaliseRoute;

    before(() => {
        ({ metricsMiddleware, normaliseRoute } = require('../../middleware/metrics'));
    });

    // -------------------------------------------------------------------
    // normaliseRoute – full-path resolution tests
    // -------------------------------------------------------------------

    describe('normaliseRoute', () => {
        it('returns the matched route pattern when req.route is present', () => {
            const req = { baseUrl: '/api', route: { path: '/products/:id' } };
            expect(normaliseRoute(req)).to.equal('/api/products/:id');
        });

        it('collapses /uploads/<filename> to /uploads/:filename (originalUrl present)', () => {
            const req = {
                originalUrl: '/uploads/photo.jpg',
                path: '/photo.jpg',
            };
            expect(normaliseRoute(req)).to.equal('/uploads/:filename');
        });

        it('collapses /uploads/<filename> when mounted middleware sets baseUrl="/uploads" (the bug scenario)', () => {
            // Express sets req.baseUrl='/uploads', req.path='/<file>' for
            // app.use('/uploads', express.static(...)). Without the fix,
            // rawPath would be '/photo.jpg' and the guard would not fire.
            const req = {
                originalUrl: '/uploads/photo.jpg',
                baseUrl: '/uploads',
                path: '/photo.jpg',
            };
            expect(normaliseRoute(req)).to.equal('/uploads/:filename');
        });

        it('strips query strings before checking /uploads/ prefix', () => {
            const req = {
                originalUrl: '/uploads/photo.jpg?v=2',
                baseUrl: '/uploads',
                path: '/photo.jpg',
            };
            expect(normaliseRoute(req)).to.equal('/uploads/:filename');
        });

        it('replaces MongoDB ObjectIds with :id', () => {
            const req = {
                originalUrl: '/products/64abc12345ef678901234567',
                path: '/products/64abc12345ef678901234567',
            };
            expect(normaliseRoute(req)).to.equal('/products/:id');
        });

        it('replaces numeric IDs with :id', () => {
            const req = {
                originalUrl: '/orders/42',
                path: '/orders/42',
            };
            expect(normaliseRoute(req)).to.equal('/orders/:id');
        });

        it('strips query strings before applying ID replacement', () => {
            const req = {
                originalUrl: '/products/64abc12345ef678901234567?foo=bar',
                path: '/products/64abc12345ef678901234567',
            };
            expect(normaliseRoute(req)).to.equal('/products/:id');
        });

        it('falls back to baseUrl + path when originalUrl is absent', () => {
            const req = {
                baseUrl: '/uploads',
                path: '/photo.jpg',
            };
            expect(normaliseRoute(req)).to.equal('/uploads/:filename');
        });

        it('returns "unknown" when no path information is available', () => {
            const req = {};
            expect(normaliseRoute(req)).to.equal('unknown');
        });
    });

    it('should call next() for normal requests', () => {
        const req = { path: '/products', method: 'GET', ip: '127.0.0.1', headers: {} };
        const res = { statusCode: 200, on: sinon.stub() };
        const next = sinon.stub();

        metricsMiddleware(req, res, next);

        expect(next.calledOnce).to.be.true;
    });

    it('should skip tracking for /metrics path and call next()', () => {
        const req = { path: '/metrics', method: 'GET', ip: '127.0.0.1', headers: {} };
        const res = { on: sinon.stub() };
        const next = sinon.stub();

        metricsMiddleware(req, res, next);

        expect(next.calledOnce).to.be.true;
        // res.on should NOT be called (no finish listener registered)
        expect(res.on.called).to.be.false;
    });

    it('should register a finish listener on the response', () => {
        const req = { path: '/products', method: 'GET', ip: '127.0.0.1', headers: {} };
        const res = { statusCode: 200, on: sinon.stub() };
        const next = sinon.stub();

        metricsMiddleware(req, res, next);

        expect(res.on.calledWith('finish')).to.be.true;
    });
});

describe('Metrics Route', () => {
    let app;
    const supertest = require('supertest');
    const express = require('express');

    before(() => {
        app = express();
        const metricsRouter = require('../../routes/metrics');
        app.use('/metrics', metricsRouter);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return 200 with Prometheus text format when no token is required (dev mode)', async () => {
        delete process.env.METRICS_TOKEN;
        const savedEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';

        const res = await supertest(app).get('/metrics');

        expect(res.status).to.equal(200);
        expect(res.headers['content-type']).to.include('text/plain');
        // Should contain at least one of the default prom-client metrics
        expect(res.text).to.include('process_');

        process.env.NODE_ENV = savedEnv;
    });

    it('should return 401 when token is required but not provided', async () => {
        process.env.METRICS_TOKEN = 'supersecret';
        process.env.NODE_ENV = 'production';

        const res = await supertest(app).get('/metrics');

        expect(res.status).to.equal(401);

        delete process.env.METRICS_TOKEN;
        process.env.NODE_ENV = 'test';
    });

    it('should return 401 when a wrong token is provided', async () => {
        process.env.METRICS_TOKEN = 'supersecret';
        process.env.NODE_ENV = 'production';

        const res = await supertest(app)
            .get('/metrics')
            .set('Authorization', 'Bearer wrongtoken');

        expect(res.status).to.equal(401);

        delete process.env.METRICS_TOKEN;
        process.env.NODE_ENV = 'test';
    });

    it('should return 200 when the correct token is provided', async () => {
        process.env.METRICS_TOKEN = 'supersecret';
        process.env.NODE_ENV = 'production';

        const res = await supertest(app)
            .get('/metrics')
            .set('Authorization', 'Bearer supersecret');

        expect(res.status).to.equal(200);
        expect(res.text).to.include('process_');

        delete process.env.METRICS_TOKEN;
        process.env.NODE_ENV = 'test';
    });
});
