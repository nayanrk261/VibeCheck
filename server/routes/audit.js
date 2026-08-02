const express = require("express");
const router = express.Router();
const { runAudit } = require("../controllers/auditController");
const { validateAuditRequest } = require("../middleware/validate");
const { auditLimiter } = require("../middleware/rateLimiter");

router.post("/audit", auditLimiter, validateAuditRequest, runAudit);

module.exports = router;