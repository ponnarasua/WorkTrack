const mongoose = require('mongoose');
const dotenv = require('dotenv');
const logger = require('./logger');
dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {});
        logger.info('✅ MongoDB connected successfully');
    } catch (error) {
        logger.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

module.exports = connectDB;