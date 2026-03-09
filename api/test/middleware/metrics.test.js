/**
 * Metrics Middleware & Endpoint Tests
 */

const { describe, it, before, after, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');

describe('Metrics Middleware', () => {
    let metricsMiddleware;

    before(() => {
        ({ metricsMiddleware } = require('../../middleware/metrics'));
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
