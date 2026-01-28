import { DurableObject } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import mongoose from 'mongoose';
import app from '../app.js';

/**
 * The Durable Object acts as a long-lived 'Server Instance'
 * that keeps the MongoDB connection alive in memory.
 */
export class DatabaseConnection extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.isInitialized = false;
  }

  async initDb() {
    if (mongoose.connection.readyState === 1) return;

    console.log("Connecting to MongoDB...");
    // We use the URI from your env variables
    const uri = `mongodb+srv://rest-shop:${this.env.MONGO_ATLAS_PW}@cluster0.lifak.mongodb.net/`;
    
    try {
      await mongoose.connect(uri, {
        maxPoolSize: 1, // DO is single-threaded; 1 connection per DO is usually enough
        serverSelectionTimeoutMS: 5000,
      });
      console.log("MongoDB connected in Durable Object");
    } catch (err) {
      console.error("MongoDB DO connection error:", err);
    }
  }

  async fetch(request) {
    // Ensure DB is ready before handling the request
    await this.initDb();

    // Use the native Cloudflare adapter to run your Express app
    // We pass (request, env) to make sure express has access to bindings
    return httpServerHandler(app)(request, this.env);
  }
}

/**
 * Main Worker: This is the entry point that users hit.
 * It forwards everything to the 'Singleton' Durable Object.
 */
export default {
  async fetch(request, env) {
    // We create one 'global' ID so every user hits the same connection pool
    const id = env.DB_CONNECTION.idFromName('global-api-instance');
    const stub = env.DB_CONNECTION.get(id);
    
    return await stub.fetch(request);
  }
};
