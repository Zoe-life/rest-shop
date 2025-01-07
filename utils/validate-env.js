const requiredEnvVars = [
    'MONGODB_URI',
    'MONGO_ATLAS_PW',
    'JWT_KEY',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD'
];

const validateEnv = () => {
    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingVars.length > 0) {
        console.error('Error: Missing required environment variables:');
        missingVars.forEach(varName => console.error(`- ${varName}`));
        process.exit(1);
    }
};

module.exports = validateEnv;