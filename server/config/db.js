const mongoose = require('mongoose');

const ConnectDB = async () => {
    if (!process.env.MONGODB_URI) {
        console.warn("MONGODB_URI not set — database persistence running in fallback mode.");
        return false;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log("MongoDB Connected");
        return true;
    } catch (err) {
        console.error(`MongoDB Connection Error: ${err.message}`);
        console.warn("Server starting with database fallback enabled.");
        return false;
    }
};

module.exports = ConnectDB;