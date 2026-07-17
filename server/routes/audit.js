const express = require("express");
const router = express.Router();
const { runAudit } = require("../controllers/auditController");

router.post("/audit", runAudit);

module.exports = router;