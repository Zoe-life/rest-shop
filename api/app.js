const express = require('express');
const app = express();
const morgan = require('morgan');
// const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const passport = require('./config/passport');
const { helmetConfig, apiLimiter, sanitizeInput } = require('./middleware/security');
const { logWarn, logError } = require('./utils/logger');

// Routes (Payment routes moved to payment-worker.js for microservices architecture)
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');

// 1. Security & Standard Middleware
app.use(helmetConfig);
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(apiLimiter);
app.use(sanitizeInput);

// 2. CORS Logic (Adapted for Cloudflare)
app.use((req, res, next) => {
    // We get the secrets passed from worker.js via req.workerEnv, or use process.env for direct Node.js deployment
    const allowedOrigins = req.workerEnv?.ALLOWED_ORIGINS 
        ? req.workerEnv.ALLOWED_ORIGINS.split(',') 
        : (process.env.ALLOWED_ORIGINS 
            ? process.env.ALLOWED_ORIGINS.split(',') 
            : ['http://localhost:3001', 'http://localhost:3000', 'http://localhost:5173']);
    
    const origin = req.headers.origin;
    // Security: Reject null, undefined, and the string 'null' origins when credentials are enabled
    // Some browsers send the string 'null' for file:// URLs or sandboxed iframes
    const isOriginAllowed = origin && 
                           origin !== 'null' && 
                           origin.toLowerCase() !== 'null' &&
                           allowedOrigins.includes(origin);
    if (isOriginAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    }
    
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// 3. Health Check (Simplified for Serverless)
app.get('/health', (req, res) => {
    const dbReadyState = mongoose.connection.readyState;
    const dbStateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const dbStateName = dbStateNames[dbReadyState] ?? 'unknown';
    const dbConnected = dbReadyState === 1;

    logInfo('[Health] Health check requested', {
        dbState: dbStateName,
        dbReadyState,
        environment: req.workerEnv?.NODE_ENV || process.env.NODE_ENV || 'production'
    });

    res.status(dbConnected ? 200 : 503).json({
        status: dbConnected ? 'ok' : 'degraded',
        database: {
            status: dbStateName,
            readyState: dbReadyState,
            message: dbConnected
                ? 'Database connected and ready'
                : `Database unavailable (state: ${dbStateName}). ` +
                  'Check that your MongoDB cluster is active and not paused.'
        },
        environment: req.workerEnv?.NODE_ENV || process.env.NODE_ENV || 'production'
    });
});

// 4. Shop Routes (Payment routes handled by payment-worker.js)
// Support both versioned and non-versioned routes for backward compatibility
const v1Routes = require('./v1/routes');
app.use('/api/v1', v1Routes);

// Legacy non-versioned routes (backward compatibility)
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/user', userRoutes);
app.use('/auth', authRoutes);

// 5. Static Files (Note: Cloudflare handles this better via R2, but keeping for compatibility)
app.use('/uploads', express.static('uploads'));

// 6. Error Handling
app.use((req, res, next) => {
    logWarn('Route not found', { method: req.method, path: req.originalUrl });
    const error = new Error('Not found');
    error.status = 404;
    next(error);
});

app.use((error, req, res, next) => {
    const status = error.status || 500;
    if (status >= 500) {
        logError('Unhandled request error', error);
    }
    res.status(status).json({
        error: { message: error.message }
    });
});

module.exports = app;
