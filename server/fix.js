 const fs = require('fs');

const content = `const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const ConnectDB = require('./config/db');
const auditRouter = require("./routes/audit");
ConnectDB();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", auditRouter);
app.get("/", (req, res) => {
    res.json({ message: "Vibecheck app is running" });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});`;

fs.writeFileSync('index.js', content);
console.log("Done!");
