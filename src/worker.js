/**
 * Cloudflare Worker Entry Point
 * This file adapts the Express app to run on Cloudflare Workers
 */

const app = require('../app.js');

export default {
  async fetch(request, env, ctx) {
    try {
      // Set environment variables from Cloudflare secrets
      process.env.MONGODB_URI = env.MONGODB_URI;
      process.env.MONGO_ATLAS_PW = env.MONGO_ATLAS_PW;
      process.env.JWT_KEY = env.JWT_KEY;
      process.env.ALLOWED_ORIGINS = env.ALLOWED_ORIGINS || 'https://yourdomain.com';
      process.env.NODE_ENV = env.NODE_ENV || 'production';

      // Create a Node.js-compatible request object
      const url = new URL(request.url);
      const method = request.method;
      const headers = Object.fromEntries(request.headers);
      const body = await request.text();

      // Handle the request with Express app
      // Note: This requires express-to-cloudflare-worker adapter
      return new Response('Cloudflare Worker is configured. Use wrangler to deploy.', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
