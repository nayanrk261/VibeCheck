const rateLimit = require("express-rate-limit");

// The audit endpoint is expensive to abuse: each call hits the GitHub API,
// fetches file contents, and spends Claude/Groq tokens. This is as much a
// cost-control measure as an abuse-prevention one.
const auditLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many audit requests. Please wait a minute and try again." },
});

// A looser limiter applied to the whole API as a baseline.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

module.exports = { auditLimiter, generalLimiter };