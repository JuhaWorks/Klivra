const mongoose = require('mongoose');
const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/my_database';
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected successfully: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};
module.exports = connectDB;
