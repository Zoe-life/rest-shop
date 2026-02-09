const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const fs = require('fs');

let mongoServer;

// Set JWT_KEY for tests
process.env.JWT_KEY = process.env.JWT_KEY || 'test_jwt_key';

before(async function() {
    // Increase timeout for MongoDB download
    this.timeout(60000);
    
    try {
        // Check if running on Ubuntu 24.04
        let isUbuntu2404 = false;
        try {
            const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
            // Use regex to match VERSION_ID field specifically
            isUbuntu2404 = /VERSION_ID="24\.04"/.test(osRelease);
        } catch (err) {
            // If we can't read /etc/os-release, let mongodb-memory-server auto-detect
        }
        
        // Configure MongoDB Memory Server
        // For Ubuntu 24.04, use Ubuntu 22.04 binaries since 7.0.14 binaries don't exist for ubuntu2404
        const mongoConfig = {
            binary: {
                version: '7.0.14',
            }
        };
        
        if (isUbuntu2404) {
            // Force Ubuntu 22.04 binaries for Ubuntu 24.04
            mongoConfig.binary.arch = 'x64';
            mongoConfig.binary.platform = 'linux';
            mongoConfig.binary.os = {
                dist: 'ubuntu',
                release: '22.04'
            };
        }
        
        mongoServer = await MongoMemoryServer.create(mongoConfig);
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