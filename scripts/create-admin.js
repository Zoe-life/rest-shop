const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../api/models/user');
require('dotenv').config();

const createAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL });
        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

        // Create admin user
        const adminUser = new User({
            _id: new mongoose.Types.ObjectId(),
            email: process.env.ADMIN_EMAIL,
            password: hashedPassword,
            role: 'admin'
        });

        await adminUser.save();
        console.log('Admin user created successfully');
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        await mongoose.connection.close();
    }
};

createAdmin();