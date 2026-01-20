require('dotenv').config();
const validateEnv = require('./utils/validate-env');
const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const { helmetConfig, apiLimiter, sanitizeInput } = require('./api/middleware/security');

// Routes
const productRoutes = require('./api/routes/products');
const orderRoutes = require('./api/routes/orders');
const userRoutes = require('./api/routes/user');

// Database connection
mongoose.connect(
    "mongodb+srv://rest-shop:"+ process.env.MONGO_ATLAS_PW + "@cluster0.lifak.mongodb.net/")
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.log('MongoDB connection error:', err));

mongoose.Promise = global.Promise;

// Validate environment variables before starting the app
validateEnv();

// Security middleware
app.use(helmetConfig);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3001'];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

//Detailed health check
/**
 * @route GET /health
 * @description Comprehensive health check endpoint
 * @access Public
 */
app.get('/health', async (req, res) => {
    try {
        // Check database connection
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

        res.status(200).json({
            status: 'ok',
            message: 'API is running',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
                status: dbStatus
            },
            memory: {
                usage: process.memoryUsage(),
                free: process.freemem(),
                total: process.totalmem()
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Health check failed',
            error: error.message
        });
    }
});

app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Apply rate limiting to all routes
app.use('/api/', apiLimiter);

// Input sanitization middleware
app.use(sanitizeInput);

//Routes which should handle requests
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/user', userRoutes);

app.use((req, res, next) => {
    const error = new Error('Not found');
    error.status = 404;
    next(error);
});

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
});

module.exports = app;