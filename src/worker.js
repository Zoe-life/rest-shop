import { DurableObject } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import mongoose from 'mongoose';
import app from '../app.js';

export class DatabaseConnection extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
  }

  async connect() {
    if (mongoose.connection.readyState === 1) return;
    
    // Construct URI using the secret from GitHub/Cloudflare env
    const uri = `mongodb+srv://rest-shop:${this.env.MONGO_ATLAS_PW}@cluster0.lifak.mongodb.net/`;
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
  }

  async fetch(request) {
    await this.connect();

    // Attach environment variables to the request object so Express can see them
    // We use a custom property 'workerEnv'
    return httpServerHandler((req, res) => {
      req.workerEnv = this.env; 
      return app(req, res);
    })(request, this.env);
  }
}

export default {
  async fetch(request, env) {
    const id = env.DB_CONNECTION.idFromName('global');
    const stub = env.DB_CONNECTION.get(id);
    return stub.fetch(request);
  }
};
