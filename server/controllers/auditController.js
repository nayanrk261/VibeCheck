const { parseGithubUrl, fetchRepoTree, fetchFileContent, detectTechStack } = require("../lib/github");
const { scanRepo } = require("../lib/scanner");
const { analyzeHeaders } = require("../lib/headers");
const { analyzeWithAI } = require("../lib/claude");
const { scorePerformance, computeOverall } = require("../lib/scoring");
const Submission = require("../models/Submission");

const runAudit = async (req, res) => {
    try {
        // req.body is already validated + sanitized by validateAuditRequest
        const { repoUrl, liveUrl } = req.body;

        let githubData = { owner: '', repo: '', techStack: [], fileCount: 0 };
        let scanData = { secrets: [], envCheck: { message: 'No repo provided' }, filesScanned: 0 };

        if (repoUrl) {
            const { owner, repo } = parseGithubUrl(repoUrl);
            const files = await fetchRepoTree(owner, repo);
            const techStack = detectTechStack(files);
            githubData = { owner, repo, techStack, fileCount: files.length };
            scanData = await scanRepo(files, fetchFileContent, owner, repo);
        }

        // liveUrl is passed through the SSRF guard inside analyzeHeaders
        const headerData = liveUrl
            ? await analyzeHeaders(liveUrl)
            : { responseTime: null, httpsUsed: false, findings: [], error: false };

        const aiResult = await analyzeWithAI(githubData, scanData, headerData);

        if (!aiResult.success) {
            console.error("AI analysis failed:", aiResult.error);
            return res.status(502).json({ error: "AI analysis is temporarily unavailable. Please try again shortly." });
        }

        // Security: AI-scored, grounded in secrets + header data (or null
        // if there was genuinely nothing to work from).
        const securityValue = aiResult.data.securityScore;
        const security = { value: securityValue, status: securityValue == null ? "no_data" : "scored" };

        // Performance: computed deterministically from measured response time.
        const performance = scorePerformance(headerData);

        // Code Quality / UI-UX: not built yet — always "coming_soon", never guessed.
        const codeQuality = { value: null, status: "coming_soon" };
        const uiUx = { value: null, status: "coming_soon" };

        const overall = computeOverall(security.value, performance.value);
        const auditStatus = overall == null ? "insufficient_data" : "scored";

        const submission = new Submission({
            repoUrl: repoUrl || '',
            liveUrl: liveUrl || '',
            scores: { security, performance, codeQuality, uiUx, overall },
            auditStatus,
            summary: aiResult.data.summary || '',
            findings: aiResult.data.findings || [],
            positives: aiResult.data.positives || [],
            meta: {
                techStack: githubData.techStack,
                filesScanned: scanData.filesScanned,
                secretsFound: scanData.secrets.length,
                responseTime: headerData.responseTime,
                httpsUsed: headerData.httpsUsed
            },
            isPublic: false,
            isApproved: false
        });

        await submission.save();

        res.status(201).json({
            success: true,
            submissionId: submission._id,
            scores: submission.scores,
            auditStatus: submission.auditStatus,
            summary: submission.summary,
            findings: submission.findings,
            positives: submission.positives,
            meta: submission.meta
        });

    } catch (err) {
        console.error("Audit error:", err);

        if (err.message === "Invalid Github url") {
            return res.status(400).json({ error: "That doesn't look like a valid GitHub repository URL." });
        }

        res.status(500).json({ error: "Audit failed. Please try again." });
    }
};

module.exports = { runAudit };