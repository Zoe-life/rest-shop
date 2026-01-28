import { httpServerHandler } from 'cloudflare:node';
import app from '../app.js'; // Ensure app.js exports the express 'app' instance

// 1. Define the Durable Object class in the SAME file (required for detection)
export class DatabaseConnection {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  
  async fetch(request) {
    // This is where your DO logic would go (e.g., managing a pool)
    return new Response("Durable Object Active");
  }
}

// 2. Export the Express app using Cloudflare's native Node.js support
export default httpServerHandler(app);
