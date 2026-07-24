const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const cors = require('cors');
const ConnectDB = require('./config/db');
const auditRouter = require("./routes/audit");
const submissionsRouter = require("./routes/submissions");

ConnectDB();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", auditRouter);
app.use("/api", submissionsRouter);

app.get("/", (req, res) => {
    res.json({ message: "Vibecheck app is running" });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});