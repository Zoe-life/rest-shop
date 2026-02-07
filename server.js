require('dotenv').config();
const http = require('http');
const app = require('./app');
const mongoose = require('mongoose');

const port = process.env.PORT || 3001;

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
    
    // Close server to stop accepting new connections
    server.close(() => {
        console.log('🔒 HTTP server closed');
    });
    
    // Close database connection
    try {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during graceful shutdown:', err);
        process.exit(1);
    }
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));