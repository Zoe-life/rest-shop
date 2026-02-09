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
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Get the backend URL from environment variable
    const backendUrl = env.BACKEND_API_URL || env.NODE_BACKEND_URL;
    
    if (!backendUrl) {
      return new Response(
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
      );
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
        
        return new Response(
          JSON.stringify({
            worker: 'ok',
            backend: backendHealth,
            timestamp: new Date().toISOString()
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      } catch (error) {
        return new Response(
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
        );
      }
    }

    // Build the backend URL with the same path and query string
    const backendTargetUrl = `${backendUrl}${url.pathname}${url.search}`;

    try {
      // Clone the request to forward to backend
      // We need to handle the body carefully based on content type
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

      // Forward environment secrets as headers (for auth, etc.)
      // The backend will read these from headers instead of env vars
      if (env.JWT_KEY) {
        headers.set('X-JWT-Key', env.JWT_KEY);
      }
      if (env.ALLOWED_ORIGINS) {
        headers.set('X-Allowed-Origins', env.ALLOWED_ORIGINS);
      }

      // Create forwarded request
      const forwardedRequest = new Request(backendTargetUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'manual'
      });

      // Forward request to backend
      const backendResponse = await fetch(forwardedRequest);

      // Clone response to return to client
      const responseHeaders = new Headers(backendResponse.headers);
      
      // Add headers to indicate this came through the worker
      responseHeaders.set('X-Served-By', 'Cloudflare-Worker-Proxy');
      responseHeaders.set('X-Backend-Status', backendResponse.status.toString());

      // Return the response from backend
      return new Response(backendResponse.body, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: responseHeaders
      });

    } catch (error) {
      // Log error and return 502 Bad Gateway
      console.error('Error proxying request to backend:', error);
      
      return new Response(
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
      );
    }
  }
};
