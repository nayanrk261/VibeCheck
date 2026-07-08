const mongoose = require('mongoose');

const ConnectDB = async () => {
    try{
        const connection = await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB Connected");
    }catch(err){
        console.error(`Error : ${err.message}`);
        process.exit(1);
    }
};

module.exports = ConnectDB;