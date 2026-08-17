const { parseGithubUrl, fetchRepoTree, fetchFileContent, detectTechStack } = require("../lib/github");
const { scanRepo } = require("../lib/scanner");
const { analyzeHeaders } = require("../lib/headers");
const { checkExposedFiles } = require("../lib/exposureCheck");
const { mapHeaderFindings } = require("../lib/findings");
const { checkLegalPages } = require("../lib/legalCheck");
const { analyzeWithAI } = require("../lib/claude");
const { scorePerformance, scoreSecurity, scoreReadiness, computeOverall, buildFallbackSummary } = require("../lib/scoring");
const Submission = require("../models/Submission");

const runAudit = async (req, res) => {
    try {
        // req.body is already validated + sanitized by validateAuditRequest
        const { repoUrl, liveUrl, auditMode } = req.body;

        let githubData = { owner: '', repo: '', techStack: [], fileCount: 0 };
        let scanData = { secrets: [], findings: [], positives: [], envCheck: { message: 'No repo provided' }, filesScanned: 0 };

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

        // Only probe for exposed .env/.git if the live URL was actually
        // reachable — no point checking a blocked/unreachable target twice.
        const exposureFindings = (liveUrl && !headerData.error)
            ? await checkExposedFiles(liveUrl)
            : [];

        const hasRepoData = githubData.fileCount > 0;
        const hasLiveData = !!liveUrl && !headerData.error;

        // Track 1 (core) findings — every one deterministic, built from real
        // scan data, not paraphrased or invented by the AI.
        const coreFindings = [
            ...scanData.findings,
            ...mapHeaderFindings(headerData),
            ...exposureFindings,
        ].map(f => ({ ...f, track: "core" }));

        if (headerData.error) {
            coreFindings.push({
                title: "Live URL could not be scanned",
                severity: "INFO",
                category: "Availability",
                description: headerData.message || "The provided live URL could not be reached or is not a scannable public address.",
                fix: "Double-check the URL is correct, publicly reachable, and not pointing at an internal/private address.",
                track: "core"
            });
        }

        // Track 2 (readiness) findings — only run in production mode, and
        // only against a live URL that's actually reachable.
        let readinessFindings = [];
        let readinessChecked = false;
        if (auditMode === "production" && hasLiveData) {
            const legalResult = await checkLegalPages(liveUrl);
            readinessFindings.push(...legalResult.findings);
            readinessChecked = legalResult.checked;
            if (!readinessChecked) {
                console.error("Readiness check (legalCheck) failed to complete for", liveUrl);
                readinessFindings.push({
                    title: "Production readiness check could not be completed",
                    severity: "INFO",
                    category: "Legal",
                    description: "We couldn't fetch and analyze your live URL for legal/compliance signals this time (network issue or timeout) — this is not a finding about your app, just a failed check.",
                    fix: "Try running the audit again."
                });
            }
        }
        readinessFindings = readinessFindings.map(f => ({ ...f, track: "readiness" }));

        const security = scoreSecurity(coreFindings, hasRepoData, hasLiveData);
        const performance = scorePerformance(headerData);
        const codeQuality = { value: null, status: "coming_soon" };
        const uiUx = { value: null, status: "coming_soon" };
        const readiness = auditMode === "production"
            ? scoreReadiness(readinessFindings, readinessChecked)
            : { value: null, status: "no_data" };

        // Overall is Track 1 only, on purpose — readiness never affects it.
        const overall = computeOverall(security.value, performance.value);
        const auditStatus = overall == null ? "insufficient_data" : "scored";

        const allFindings = [...coreFindings, ...readinessFindings];

        const aiResult = await analyzeWithAI({
            githubData,
            headerData,
            securityScore: security.value,
            performanceScore: performance.value,
            findings: allFindings,
            filesScanned: scanData.filesScanned,
            ...(auditMode === "production" ? { readinessScore: readiness.value } : {})
        });

        // The AI only writes the narrative — if it fails, fall back to a
        // templated summary instead of failing the whole audit. Every
        // number and finding at this point is already real and saved either way.
        let summary, aiPositives;
        if (aiResult.success) {
            summary = aiResult.data.summary;
            aiPositives = aiResult.data.positives;
        } else {
            console.error("AI summary generation failed (falling back to templated summary):", aiResult.error);
            summary = buildFallbackSummary(security, performance, coreFindings);
            aiPositives = [];
        }

        const positives = [...scanData.positives, ...aiPositives];

        const submission = new Submission({
            repoUrl: repoUrl || '',
            liveUrl: liveUrl || '',
            auditMode,
            scores: { security, performance, codeQuality, uiUx, readiness, overall },
            auditStatus,
            summary,
            findings: allFindings,
            positives,
            checklist: [], // wired up in the next batch
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
            auditMode: submission.auditMode,
            scores: submission.scores,
            auditStatus: submission.auditStatus,
            summary: submission.summary,
            findings: submission.findings,
            positives: submission.positives,
            checklist: submission.checklist,
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