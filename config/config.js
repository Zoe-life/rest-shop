const config = {
    development: {
        port: process.env.PORT || 3001,
        mongoUri: `mongodb+srv://rest-shop:${process.env.MONGO_ATLAS_PW}@cluster0.lifak.mongodb.net/`,
        jwtKey: process.env.JWT_KEY,
        jwtExpiry: process.env.JWT_EXPIRY || '1h',
        allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
        rateLimit: {
            windowMs: parseInt(process.env.LOGIN_WINDOW_MS) || 15 * 60 * 1000,
            max: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5
        }
    },
    production: {
        // Production config (similar to development but with different values)
    }
};

module.exports = config[process.env.NODE_ENV || 'development']; 