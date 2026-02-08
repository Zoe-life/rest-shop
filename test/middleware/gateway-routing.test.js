/**
 * Gateway Worker Unit Tests
 * Tests the routing logic of the gateway worker
 */

const { describe, it } = require('mocha');
const { expect } = require('chai');

describe('Gateway Worker Routing Logic', () => {
    // Mock environment with service bindings
    const createMockEnv = () => ({
        PAYMENT_SERVICE: {
            fetch: async (request) => {
                return new Response(JSON.stringify({ service: 'payment', url: request.url }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        },
        BASE_SERVICE: {
            fetch: async (request) => {
                return new Response(JSON.stringify({ service: 'base', url: request.url }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
    });

    // Simulate gateway routing logic
    const routeRequest = async (url, env) => {
        const urlObj = new URL(url);
        const path = urlObj.pathname;

        // Route to Payment Service
        if (path.startsWith('/api/payments') || path.startsWith('/payments')) {
            const newUrl = new URL(url);
            if (path.startsWith('/api/payments')) {
                newUrl.pathname = path.replace('/api/payments', '/payments');
            }
            const newRequest = new Request(newUrl.toString());
            return await env.PAYMENT_SERVICE.fetch(newRequest);
        }

        // Route all other requests to Base Service
        return await env.BASE_SERVICE.fetch(new Request(url));
    };

    describe('Payment Service Routing', () => {
        it('should route /api/payments to payment service', async () => {
            const env = createMockEnv();
            const response = await routeRequest('https://example.com/api/payments/initiate', env);
            const data = await response.json();
            
            expect(data.service).to.equal('payment');
        });

        it('should route /payments to payment service', async () => {
            const env = createMockEnv();
            const response = await routeRequest('https://example.com/payments/verify/123', env);
            const data = await response.json();
            
            expect(data.service).to.equal('payment');
        });

        it('should strip /api prefix when routing to payment service', async () => {
            const env = createMockEnv();
            const response = await routeRequest('https://example.com/api/payments/initiate', env);
            const data = await response.json();
            
            expect(data.url).to.include('/payments/initiate');
            expect(data.url).to.not.include('/api/payments');
        });

        it('should preserve query parameters when routing', async () => {
            const env = createMockEnv();
            const response = await routeRequest('https://example.com/api/payments/history?page=2&limit=10', env);
            const data = await response.json();
            
            expect(data.url).to.include('page=2');
            expect(data.url).to.include('limit=10');
        });
    });

    describe('Base Service Routing', () => {
        it('should route /api/products to base service', async () => {
            const env = createMockEnv();
            const response = await routeRequest('https://example.com/api/products', env);
            const data = await response.json();
            
            expect(data.service).to.equal('base');
        });

        it('should route /api/orders to base service', async () => {
            const env = createMockEnv();
            const response = await routeRequest('https://example.com/api/orders', env);
            const data = await response.json();
            
            expect(data.service).to.equal('base');
        });

        it('should route /api/user to base service', async () => {
            const env = createMockEnv();
            const response = await routeRequest('https://example.com/api/user', env);
            const data = await response.json();
            
            expect(data.service).to.equal('base');
        });

        it('should route /api/auth to base service', async () => {
            const env = createMockEnv();
            const response = await routeRequest('https://example.com/api/auth/login', env);
            const data = await response.json();
            
            expect(data.service).to.equal('base');
        });

        it('should route /health to base service', async () => {
            const env = createMockEnv();
            const response = await routeRequest('https://example.com/health', env);
            const data = await response.json();
            
            expect(data.service).to.equal('base');
        });

        it('should route root path to base service', async () => {
            const env = createMockEnv();
            const response = await routeRequest('https://example.com/', env);
            const data = await response.json();
            
            expect(data.service).to.equal('base');
        });
    });

    describe('Edge Cases', () => {
        it('should handle /api/payments/ with trailing slash', async () => {
            const env = createMockEnv();
            const response = await routeRequest('https://example.com/api/payments/', env);
            const data = await response.json();
            
            expect(data.service).to.equal('payment');
        });

        it('should handle paths that contain "payments" but don\'t start with it', async () => {
            const env = createMockEnv();
            const response = await routeRequest('https://example.com/api/user/payments', env);
            const data = await response.json();
            
            // This should NOT go to payment service, only paths starting with /api/payments
            expect(data.service).to.equal('base');
        });

        it('should handle nested payment paths', async () => {
            const env = createMockEnv();
            const response = await routeRequest('https://example.com/api/payments/mpesa/callback', env);
            const data = await response.json();
            
            expect(data.service).to.equal('payment');
        });
    });
});
