/**
 * Gateway Worker - Microservices Router
 * 
 * This lightweight worker routes incoming requests to appropriate service workers
 * using Cloudflare Service Bindings for zero-latency internal routing.
 * 
 * Architecture:
 * - /api/payments/* → Payment Service Worker
 * - /* (all other routes) → Base Service Worker (products, orders, user, auth)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route to Payment Service
    if (path.startsWith('/api/payments') || path.startsWith('/payments')) {
      // Strip /api prefix if present, as payment worker expects /payments
      const newUrl = new URL(request.url);
      if (path.startsWith('/api/payments')) {
        newUrl.pathname = path.replace('/api/payments', '/payments');
      }
      const newRequest = new Request(newUrl, request);
      return await env.PAYMENT_SERVICE.fetch(newRequest);
    }

    // Route all other requests to Base Service (products, orders, user, auth)
    return await env.BASE_SERVICE.fetch(request);
  }
};
