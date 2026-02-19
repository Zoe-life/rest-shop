const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const http = require('http');
const app = require('./app');
const mongoose = require('mongoose');
const { logError } = require('./utils/logger');

const port = process.env.PORT || 3001;
const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 10000; // 10 seconds

// Security: Validate critical environment variables on startup
if (!process.env.JWT_KEY) {
    console.error('CRITICAL: JWT_KEY environment variable is not set');
    console.error('Please set JWT_KEY in your environment variables or .env file');
    console.error('For Render: Go to Dashboard > Environment > Add JWT_KEY variable');
    process.exit(1);
}

if (process.env.JWT_KEY.length < 32) {
    console.error('CRITICAL: JWT_KEY must be at least 32 characters long for security');
    console.error('Current length:', process.env.JWT_KEY.length);
    process.exit(1);
}

if (!process.env.MONGODB_URI) {
    console.error('CRITICAL: MONGODB_URI environment variable is not set');
    console.error('Please set MONGODB_URI in your environment variables or .env file');
    process.exit(1);
}

const server = http.createServer(app);

// MongoDB Connection Configuration
const mongoOptions = {
    maxPoolSize: 10,           // Maximum number of connections in the pool
    minPoolSize: 2,             // Minimum number of connections to maintain
    socketTimeoutMS: 45000,     // Close sockets after 45s of inactivity
    serverSelectionTimeoutMS: 5000, // Timeout for server selection
    family: 4,                  // Use IPv4, skip IPv6
    retryWrites: true,          // Automatically retry write operations
    w: 'majority'               // Write concern - wait for majority acknowledgment
};

/** Human-readable labels for mongoose readyState values */
const DB_STATE_NAMES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

/**
 * Attempt to connect to MongoDB, retrying with exponential back-off.
 * The HTTP server is started independently so Render never sees a crash-loop.
 *
 * @param {number} attempt - Current attempt number (1-based)
 */
const MAX_DB_RETRIES = 5;
const DB_RETRY_BASE_DELAY_MS = 5000;

const connectWithRetry = async (attempt = 1) => {
    const readyState = mongoose.connection.readyState;
    console.log(
        `[DB] Connection attempt ${attempt}/${MAX_DB_RETRIES} ` +
        `(current state: ${DB_STATE_NAMES[readyState] ?? readyState})`
    );
    try {
        await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
        console.log('[DB] Connected to MongoDB successfully');
    } catch (error) {
        const state = mongoose.connection.readyState;
        console.error(
            `[DB] Connection attempt ${attempt} failed – ` +
            `readyState: ${DB_STATE_NAMES[state] ?? state}, ` +
            `errorName: ${error.name}, errorCode: ${error.code ?? 'N/A'}, ` +
            `message: ${error.message}`
        );

        if (attempt < MAX_DB_RETRIES) {
            const delay = DB_RETRY_BASE_DELAY_MS * attempt; // linear back-off
            console.warn(`[DB] Retrying in ${delay / 1000}s…`);
            setTimeout(() => connectWithRetry(attempt + 1), delay);
        } else {
            logError(
                '[DB] CRITICAL: All MongoDB connection attempts failed. ' +
                'Check MONGODB_URI and ensure the cluster is not paused. ' +
                'Server will continue running but DB-dependent routes will return 503.',
                error
            );
        }
    }
};

// Start HTTP server first so Render's health-check succeeds immediately,
// then connect to MongoDB in the background.
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Initialize WebSocket server
    try {
        const socketService = require('./services/socketService');
        socketService.initializeSocket(server);
        console.log('WebSocket server initialized');
    } catch (err) {
        console.error('WARNING: WebSocket initialization failed:', err.message);
    }
});

// Connect to MongoDB after the HTTP server is already listening.
connectWithRetry();

// MongoDB Connection Event Handlers
mongoose.connection.on('connected', () => {
    console.log(`[DB] Mongoose connected to MongoDB (readyState: ${mongoose.connection.readyState})`);
});

mongoose.connection.on('error', (err) => {
    const state = mongoose.connection.readyState;
    console.error(
        `[DB] Mongoose connection error – ` +
        `readyState: ${DB_STATE_NAMES[state] ?? state}, ` +
        `errorName: ${err.name}, errorCode: ${err.code ?? 'N/A'}, ` +
        `message: ${err.message}`
    );
});

mongoose.connection.on('disconnected', () => {
    const state = mongoose.connection.readyState;
    console.warn(
        `[DB] WARNING: Mongoose disconnected from MongoDB ` +
        `(readyState: ${DB_STATE_NAMES[state] ?? state}). ` +
        'DB-dependent routes will return errors until reconnection.'
    );
});

mongoose.connection.on('reconnected', () => {
    console.log(`[DB] Mongoose reconnected to MongoDB (readyState: ${mongoose.connection.readyState})`);
});

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    let serverClosed = false;
    
    // Close server to stop accepting new connections
    // server.close() waits for all connections to finish before calling the callback
    try {
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Server close timeout after ${GRACEFUL_SHUTDOWN_TIMEOUT_MS / 1000} seconds`));
            }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);
            
            server.close((err) => {
                clearTimeout(timeout);
                if (err) {
                    console.error('Error closing HTTP server:', err);
                    reject(err);
                } else {
                    console.log('HTTP server closed (all connections finished)');
                    resolve();
                }
            });
        });
        serverClosed = true;
    } catch (err) {
        console.error('Failed to close HTTP server gracefully:', err.message);
        // Continue to close database connection even if server close failed
    }
    
    // Close database connection after server is closed (or timeout)
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(serverClosed ? 0 : 1);
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
    }
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Catch any exception that escaped all try/catch blocks
process.on('uncaughtException', (err) => {
    logError('CRITICAL: uncaught exception – shutting down', err);
    gracefulShutdown('uncaughtException').finally(() => process.exit(1));
});

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason) => {
    logError('CRITICAL: unhandled promise rejection – shutting down',
        reason instanceof Error ? reason : new Error(String(reason)));
    gracefulShutdown('unhandledRejection').finally(() => process.exit(1));
});