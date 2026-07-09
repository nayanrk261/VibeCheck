const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const ConnectDB = require('./config/db');

dotenv.config();

ConnectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/",(req,res) => {
    res.json({message : "Vibecheck app is running"});
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=> {
    console.log(`Server running on port ${PORT}`);
})