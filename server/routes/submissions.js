const express = require("express");
const router = express.Router();
const { getSubmissionById, getRecentSubmissions } = require("../lib/submissionStore");

// GET /api/submissions - List recent submissions
router.get("/submissions", async (req, res) => {
    try {
        if (req.query.limit !== undefined) {
            const rawLimit = Number(req.query.limit);
            if (!Number.isInteger(rawLimit) || rawLimit < 1) {
                return res.status(400).json({ error: "Invalid limit parameter" });
            }
        }
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
        const submissions = await getRecentSubmissions(limit);
        res.status(200).json(submissions);
    } catch (err) {
        console.error("Error fetching recent submissions:", err.message);
        res.status(500).json({ error: "Something went wrong. Please try again." });
    }
});

router.get("/submissions/:id", async (req, res) => {
    try {
        const submission = await getSubmissionById(req.params.id);

        if (!submission) {
            return res.status(404).json({ error: "Submission not found" });
        }
        res.status(200).json(submission);
    } catch (err) {
        // A malformed id throws a Mongoose CastError — that's a client
        // mistake (400), not a server failure (500). Either way, don't
        // echo the raw driver error message back to the client.
        if (err.name === "CastError") {
            return res.status(400).json({ error: "Invalid submission id" });
        }
        console.error("Submission lookup error:", err.message);
        res.status(500).json({ error: "Something went wrong. Please try again." });
    }
});

module.exports = router;