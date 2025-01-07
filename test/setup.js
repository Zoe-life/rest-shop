const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

let mongoServer;

before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
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