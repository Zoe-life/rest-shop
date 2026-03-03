/**
 * Cloudflare Worker - HTTP Proxy to Node.js Backend
 * 
 * This worker acts as a lightweight edge proxy that forwards all requests
 * to the Node.js backend service where MongoDB/Mongoose operations are handled.
 * 
 * Architecture:
 * - Cloudflare Worker (this file): Edge routing, caching, auth validation
 * - Node.js Backend: Database operations, business logic via Mongoose
 * 
 * This solves the Mongoose incompatibility with Cloudflare Workers runtime
 * by keeping database operations in a proper Node.js environment.
 */

export default {
  // Keep-alive cron: pings the Render backend every 14 minutes to prevent cold starts
  async scheduled(event, env, ctx) {
    const backendUrl = env.BACKEND_API_URL || env.NODE_BACKEND_URL;

    if (!backendUrl) {
      console.error('Keep-alive: Missing BACKEND_API_URL / NODE_BACKEND_URL secret');
      return;
    }

    ctx.waitUntil(
      fetch(`${backendUrl}/health`, { headers: { 'User-Agent': 'Keep-Alive-Bot' } })
        .then(r => console.log(`Keep-alive ping: ${r.status}`))
        .catch(err => console.error(`Keep-alive ping failed: ${err.message}`, err.stack))
    );
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS: determine the allowed frontend origin
    const frontendUrl = env.FRONTEND_URL || '';
    const allowedOrigins = frontendUrl
      ? frontendUrl.split(',').map(o => o.trim()).filter(Boolean)
      : [];

    const requestOrigin = request.headers.get('Origin') || '';
    const isAllowedOrigin = requestOrigin &&
      requestOrigin !== 'null' &&
      allowedOrigins.includes(requestOrigin);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      const preflightHeaders = {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
        'Access-Control-Max-Age': '86400'
      };
      if (isAllowedOrigin) {
        preflightHeaders['Access-Control-Allow-Origin'] = requestOrigin;
        preflightHeaders['Access-Control-Allow-Credentials'] = 'true';
      }
      return new Response(null, { status: 204, headers: preflightHeaders });
    }

    /**
     * Helper: attach CORS headers to a Response
     */
    const addCorsHeaders = (response) => {
      if (!isAllowedOrigin) return response;
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', requestOrigin);
      headers.set('Access-Control-Allow-Credentials', 'true');
      headers.set('Vary', 'Origin');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    };

    // Get the backend URL from environment variable
    const backendUrl = env.BACKEND_API_URL || env.NODE_BACKEND_URL;

    if (!backendUrl) {
      return addCorsHeaders(new Response(
        JSON.stringify({
          error: {
            message: 'Backend API URL not configured. Please set BACKEND_API_URL or NODE_BACKEND_URL environment variable.',
            code: 'BACKEND_NOT_CONFIGURED'
          }
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      ));
    }

    // Health check endpoint - check both worker and backend
    if (url.pathname === '/health' || url.pathname === '/api/health') {
      try {
        // Forward to backend health check
        const backendHealthUrl = `${backendUrl}/health`;
        const backendResponse = await fetch(backendHealthUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Cloudflare-Worker-Proxy/1.0'
          }
        });

        const backendHealth = await backendResponse.json();

        return addCorsHeaders(new Response(
          JSON.stringify({
            worker: 'ok',
            backend: backendHealth,
            timestamp: new Date().toISOString()
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        ));
      } catch (error) {
        return addCorsHeaders(new Response(
          JSON.stringify({
            worker: 'ok',
            backend: 'unreachable',
            error: error.message,
            timestamp: new Date().toISOString()
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        ));
      }
    }

    // Build the backend URL with the same path and query string
    const backendTargetUrl = `${backendUrl}${url.pathname}${url.search}`;

    try {
      // Clone the request to forward to backend
      const headers = new Headers(request.headers);

      // Add proxy identification header
      headers.set('X-Forwarded-By', 'Cloudflare-Worker');
      headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
      headers.set('X-Forwarded-Host', url.host);

      // Forward the original IP if available
      const clientIP = request.headers.get('CF-Connecting-IP');
      if (clientIP) {
        headers.set('X-Forwarded-For', clientIP);
        headers.set('X-Real-IP', clientIP);
      }


      // Create forwarded request
      const forwardedRequest = new Request(backendTargetUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'manual'
      });

      // --- WORKER FETCH HANDLER ---
      const backendResponse = await fetch(forwardedRequest, {
        redirect: 'manual' // Browser must handle the jump, not the Worker
      });

      // 1. CLONE HEADERS from the backend response
      const responseHeaders = new Headers(backendResponse.headers);

      // 2. YOUR DEBUGGING HEADERS (Place them here!)
      responseHeaders.set('X-Served-By', 'Cloudflare-Worker-Proxy');
      responseHeaders.set('X-Backend-Status', backendResponse.status.toString());

      // 3. OAUTH REDIRECT LOGIC
      // If Render says "Go to Google", we must pass that 'Location' to the browser
      const redirectLocation = backendResponse.headers.get('Location');
      if (redirectLocation) {
        responseHeaders.set('Location', redirectLocation);
      }

      // 4. CORS & CREDENTIALS LOGIC
      const requestOrigin = request.headers.get('Origin');
      if (requestOrigin) {
        responseHeaders.set('Access-Control-Allow-Origin', requestOrigin);
        responseHeaders.set('Access-Control-Allow-Credentials', 'true');
        responseHeaders.set('Vary', 'Origin');
      }
      // This tells the browser it's allowed to "see" the cookie coming from the backend
      responseHeaders.set('Access-Control-Expose-Headers', 'Set-Cookie');

      // This ensures the worker doesn't strip the cookie header during the proxying
      if (backendResponse.headers.has('Set-Cookie')) {
        responseHeaders.set('Set-Cookie', backendResponse.headers.get('Set-Cookie'));
      }

      // 5. RETURN THE COMPLETE RESPONSE
      return new Response(backendResponse.body, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: responseHeaders
      });

    } catch (error) {
      // Log error and return 502 Bad Gateway
      console.error('Error proxying request to backend:', error);

      return addCorsHeaders(new Response(
        JSON.stringify({
          error: {
            message: 'Backend service unavailable',
            details: error.message,
            code: 'BACKEND_ERROR'
          }
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        }
      ));
    }
  }
};
