// CRITICAL: Import polyfills FIRST before any other modules
// This ensures process.emitWarning is available during module initialization
import './polyfills.js';

import { DurableObject } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import mongoose from 'mongoose';
const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

// Import middleware
const { helmetConfig, apiLimiter, sanitizeInput } = require('../api/middleware/security');

// Import only payment routes
const paymentRoutes = require('../api/routes/payments');

// Create Express app for payment service
const app = express();

// 1. Security & Standard Middleware
app.use(helmetConfig);
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(apiLimiter);
app.use(sanitizeInput);

// 2. CORS Logic (Adapted for Cloudflare)
app.use((req, res, next) => {
    const allowedOrigins = req.workerEnv?.ALLOWED_ORIGINS 
        ? req.workerEnv.ALLOWED_ORIGINS.split(',') 
        : ['http://localhost:3001'];
    
    const origin = req.headers.origin;
    const isOriginAllowed = origin && origin !== 'null' && allowedOrigins.includes(origin);
    if (isOriginAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    }
    
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// 3. Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'payment-service',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: req.workerEnv?.NODE_ENV || 'production'
    });
});

// 4. Payment Routes (mounted at root since gateway will prefix with /payments)
app.use('/', paymentRoutes);

// 5. Error Handling
app.use((req, res, next) => {
    const error = new Error('Not found');
    error.status = 404;
    next(error);
});

app.use((error, req, res, next) => {
    res.status(error.status || 500).json({
        error: { message: error.message }
    });
});

export class PaymentDatabaseConnection extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
  }

  async connect() {
    if (mongoose.connection.readyState === 1) return;
    
    const uri = `mongodb+srv://rest-shop:${this.env.MONGO_ATLAS_PW}@cluster0.lifak.mongodb.net/`;
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
  }

  async fetch(request) {
    await this.connect();

    return httpServerHandler((req, res) => {
      req.workerEnv = this.env; 
      return app(req, res);
    })(request);
  }
}

export default {
  async fetch(request, env) {
    const id = env.PAYMENT_DB_CONNECTION.idFromName('payment-global');
    const stub = env.PAYMENT_DB_CONNECTION.get(id);
    return stub.fetch(request);
  }
};
