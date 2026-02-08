require('dotenv').config();
const http = require('http');
const app = require('./app');
const mongoose = require('mongoose');

const port = process.env.PORT || 3001;
const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 10000; // 10 seconds

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

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, mongoOptions)
    .then(() => {
        console.log('✅ Connected to MongoDB successfully');
        // Start server only after DB connection is established
        server.listen(port, () => {
            console.log(`🚀 Server is running on port ${port}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            
            // Initialize WebSocket server
            try {
                const socketService = require('./api/services/socketService');
                socketService.initializeSocket(server);
                console.log('🔌 WebSocket server initialized');
            } catch (err) {
                console.error('⚠️  WebSocket initialization failed:', err.message);
            }
        });
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1); // Exit if cannot connect to database
    });

// MongoDB Connection Event Handlers
mongoose.connection.on('connected', () => {
    console.log('📡 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  Mongoose disconnected from MongoDB');
});

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);
    
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
                    console.error('❌ Error closing HTTP server:', err);
                    reject(err);
                } else {
                    console.log('🔒 HTTP server closed (all connections finished)');
                    resolve();
                }
            });
        });
        serverClosed = true;
    } catch (err) {
        console.error('❌ Failed to close HTTP server gracefully:', err.message);
        // Continue to close database connection even if server close failed
    }
    
    // Close database connection after server is closed (or timeout)
    try {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
        process.exit(serverClosed ? 0 : 1);
    } catch (err) {
        console.error('❌ Error closing MongoDB connection:', err);
        process.exit(1);
    }
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));