const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

let mongoServer;

// Set JWT_KEY for tests
process.env.JWT_KEY = process.env.JWT_KEY || 'test_jwt_key';

before(async function() {
    // Increase timeout for MongoDB download
    this.timeout(60000);
    
    try {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    } catch (error) {
        console.warn('Warning: Could not start MongoDB Memory Server. Tests that require database will fail.');
        console.warn('Error:', error.message);
        // Don't fail - some tests don't need MongoDB
    }
});

after(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
});

// Helper function to generate test JWT tokens
global.generateTestToken = (role = 'user') => {
    return jwt.sign(
        {
            email: 'test@test.com',
            userId: new mongoose.Types.ObjectId(),
            role: role
        },
        process.env.JWT_KEY || 'test_jwt_key',
        {
            expiresIn: "1h"
        }
    );
};