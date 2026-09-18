const github = require("../lib/github");
const { scanRepo } = require("../lib/scanner");
const { analyzeHeaders } = require("../lib/headers");
const { checkExposedFiles } = require("../lib/exposureCheck");
const { mapHeaderFindings } = require("../lib/findings");
const { checkLegalPages } = require("../lib/legalCheck");
const { checkAuthAndPayments, checkAnalytics } = require("../lib/integrationCheck");
const { checkRobotsAndSitemap, checkMetaTags } = require("../lib/seoCheck");
const { fetchLiveHtml } = require("../lib/liveHtmlFetch");
const { analyzeWithAI } = require("../lib/claude");
const { scorePerformance, scoreSecurity, scoreReadiness, computeOverall, buildFallbackSummary } = require("../lib/scoring");
const { saveSubmission } = require("../lib/submissionStore");

const runAudit = async (req, res) => {
    try {
        // req.body is already validated + sanitized by validateAuditRequest
        const { repoUrl, liveUrl, auditMode } = req.body;

        let githubData = { owner: '', repo: '', techStack: [], fileCount: 0 };
        let scanData = { secrets: [], findings: [], positives: [], envCheck: { message: 'No repo provided' }, filesScanned: 0, dependencies: {}, fileContents: [] };

        if (repoUrl) {
            const { owner, repo } = github.parseGithubUrl(repoUrl);
            const files = await github.fetchRepoTree(owner, repo);
            const techStack = github.detectTechStack(files);
            githubData = { owner, repo, techStack, fileCount: files.length };
            scanData = await scanRepo(files, github.fetchFileContent, owner, repo);
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

        // Track 2 (readiness) findings — only run in production mode.
        let readinessFindings = [];
        let readinessChecked = false;

        if (auditMode === "production") {
            // Repo-based — no live URL needed.
            if (hasRepoData) {
                readinessFindings.push(...checkAuthAndPayments(scanData.dependencies, scanData.fileContents));
            }

            // Live-URL-based — fetch the homepage HTML ONCE and share it
            // across every check that needs it, so they all see the same
            // snapshot instead of racing separate requests against a
            // possibly-inconsistent CDN cache. robots.txt/sitemap.xml are
            // different paths so they need their own request — run that
            // in parallel rather than stacking latency.
            if (hasLiveData) {
                const [{ html, fetched }, robotsSitemapResult] = await Promise.all([
                    fetchLiveHtml(liveUrl),
                    checkRobotsAndSitemap(liveUrl),
                ]);
                readinessChecked = fetched;
                readinessFindings.push(...robotsSitemapResult.findings);

                if (fetched) {
                    readinessFindings.push(...checkLegalPages(html).findings);
                    readinessFindings.push(...checkAnalytics(html));
                    readinessFindings.push(...checkMetaTags(html));
                } else {
                    console.error("Readiness page fetch failed for", liveUrl);
                    readinessFindings.push({
                        title: "Production readiness check could not be completed",
                        severity: "INFO",
                        category: "Legal",
                        description: "We couldn't fetch and analyze your live URL for legal/compliance/analytics/SEO signals this time (network issue or timeout) — this is not a finding about your app, just a failed check.",
                        fix: "Try running the audit again."
                    });
                }
            }
        }
        readinessFindings = readinessFindings.map(f => ({ ...f, track: "readiness" }));

        const security = scoreSecurity(coreFindings, hasRepoData, hasLiveData);
        const performance = scorePerformance(headerData);
        const codeQuality = { value: null, status: "coming_soon" };
        const uiUx = { value: null, status: "coming_soon" };

        // Readiness "checked" now covers repo-based OR live-based signals —
        // if we got useful data from either source, it's a real score.
        const readinessHasData = (auditMode === "production") && (hasRepoData || readinessChecked);
        const readiness = auditMode === "production"
            ? scoreReadiness(readinessFindings, readinessHasData)
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

        const savedSubmission = await saveSubmission({
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
                filesDiscovered: scanData.meta?.filesDiscovered || githubData.fileCount,
                filesSelected: scanData.meta?.filesSelected || githubData.fileCount,
                filesScanned: scanData.filesScanned,
                filesSkipped: scanData.meta?.filesSkipped || 0,
                skipReasons: scanData.meta?.skipReasons || {},
                totalScannedBytes: scanData.meta?.totalScannedBytes || 0,
                secretsFound: scanData.secrets ? scanData.secrets.length : 0,
                responseTime: headerData.responseTime,
                httpsUsed: headerData.httpsUsed
            },
            isPublic: false,
            isApproved: false
        });

        res.status(201).json({
            success: true,
            submissionId: savedSubmission._id,
            auditMode: savedSubmission.auditMode,
            scores: savedSubmission.scores,
            auditStatus: savedSubmission.auditStatus,
            summary: savedSubmission.summary,
            findings: savedSubmission.findings,
            positives: savedSubmission.positives,
            checklist: savedSubmission.checklist,
            meta: savedSubmission.meta
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