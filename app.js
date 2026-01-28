const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const passport = require('./config/passport');
const { helmetConfig, apiLimiter, sanitizeInput } = require('./api/middleware/security');

// Routes
const productRoutes = require('./api/routes/products');
const orderRoutes = require('./api/routes/orders');
const userRoutes = require('./api/routes/user');
const authRoutes = require('./api/routes/auth');

// 1. Security & Standard Middleware
app.use(helmetConfig);
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(apiLimiter);
app.use(sanitizeInput);

// 2. CORS Logic (Adapted for Cloudflare)
app.use((req, res, next) => {
    // We get the secrets passed from worker.js via req.workerEnv
    const allowedOrigins = req.workerEnv?.ALLOWED_ORIGINS 
        ? req.workerEnv.ALLOWED_ORIGINS.split(',') 
        : ['http://localhost:3001'];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    }
    
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// 3. Health Check (Simplified for Serverless)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: req.workerEnv?.NODE_ENV || 'production'
    });
});

// 4. Shop Routes
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/user', userRoutes);
app.use('/auth', authRoutes);

// 5. Static Files (Note: Cloudflare handles this better via R2, but keeping for compatibility)
app.use('/uploads', express.static('uploads'));

// 6. Error Handling
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

module.exports = app;
