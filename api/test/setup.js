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
        // Configure MongoDB Memory Server to use Ubuntu 22.04 binaries for Ubuntu 24.04
        // MongoDB 7.0.14 binaries don't exist for ubuntu2404, so we fall back to ubuntu2204
        mongoServer = await MongoMemoryServer.create({
            binary: {
                version: '7.0.14',
                arch: 'x64',
                platform: 'linux',
                // Use Ubuntu 22.04 binaries which are compatible with Ubuntu 24.04
                os: {
                    os: 'linux',
                    dist: 'ubuntu',
                    release: '22.04'
                }
            }
        });
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