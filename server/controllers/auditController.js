const { parseGithubUrl, fetchRepoTree, fetchFileContent, detectTechStack } = require("../lib/github");
const { scanRepo } = require("../lib/scanner");
const { analyzeHeaders } = require("../lib/headers");
const { analyzeWithAI } = require("../lib/claude");
const Submission = require("../models/Submission");

const runAudit = async (req, res) => {
    try {
        let { repoUrl, liveUrl } = req.body;

        if (!repoUrl && !liveUrl) {
            return res.status(400).json({ error: "At least one URL is required" });
        }

        // GitHub data
        let githubData = { owner: '', repo: '', techStack: [], fileCount: 0 };
        let scanData = { secrets: [], envCheck: { message: 'No repo provided' }, filesScanned: 0 };

        if (repoUrl) {
            const { owner, repo } = parseGithubUrl(repoUrl);
            const files = await fetchRepoTree(owner, repo);
            const techStack = detectTechStack(files);
            githubData = { owner, repo, techStack, fileCount: files.length };
            scanData = await scanRepo(files, fetchFileContent, owner, repo);
        }

        // Header data
        const headerData = liveUrl
            ? await analyzeHeaders(liveUrl)
            : { responseTime: null, httpsUsed: false, findings: [], error: false };

        // AI analysis
        const aiResult = await analyzeWithAI(githubData, scanData, headerData);

        if (!aiResult.success) {
            return res.status(500).json({ error: "AI analysis failed", details: aiResult.error });
        }

        // Overall score fallback
        const scores = aiResult.data.scores;
        if (!scores.overall || scores.overall === 0) {
            scores.overall = Math.round(
                (scores.security + scores.codeQuality + scores.uiUx + scores.performance) / 4
            );
        }

        const submission = new Submission({
            repoUrl: repoUrl || '',
            liveUrl: liveUrl || '',
            scores,
            summary: aiResult.data.summary || '',
            findings: aiResult.data.findings || [],
            positives: aiResult.data.positives || [],
            meta: {
                techStack: githubData.techStack,
                filesScanned: scanData.filesScanned,
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
            summary: submission.summary,
            findings: submission.findings,
            positives: submission.positives,
            meta: submission.meta
        });

    } catch (err) {
        console.error("Audit error:", err.message);
        res.status(500).json({ error: "Audit failed", details: err.message });
    }
};

module.exports = { runAudit };