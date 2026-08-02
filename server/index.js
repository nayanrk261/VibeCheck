const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const cors = require('cors');
const helmet = require('helmet');
const ConnectDB = require('./config/db');
const auditRouter = require("./routes/audit");
const submissionsRouter = require("./routes/submissions");
const { generalLimiter } = require('./middleware/rateLimiter');

ConnectDB();
const app = express();

app.use(helmet());

// Restrict CORS to the real frontend origin in production.
// Set CLIENT_URL in your .env (e.g. https://vibecheck.app). Falls back to
// allowing any origin only when CLIENT_URL isn't set, which should only
// happen in local dev.
const allowedOrigin = process.env.CLIENT_URL;
if (!allowedOrigin) {
  console.warn("CLIENT_URL not set — CORS is open to all origins (dev only, do not deploy like this)");
}
app.use(cors(allowedOrigin ? { origin: allowedOrigin } : {}));

app.use(express.json({ limit: '100kb' }));
app.use(generalLimiter);

app.use("/api", auditRouter);
app.use("/api", submissionsRouter);

app.get("/", (req, res) => {
    res.json({ message: "Vibecheck app is running" });
});

// Generic error handler — must be last. Never send stack traces, file
// paths, or raw error messages to the client; log the real detail server-side.
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: "Something went wrong. Please try again." });
});

const PORT = process.env.PORT || 5000;

// Fail fast if critical env vars are missing instead of limping along.
const required = ['MONGODB_URI', 'GROQ_API_KEY'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});