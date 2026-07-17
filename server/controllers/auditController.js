const { parseGithubUrl, fetchRepoTree, fetchFileContent, detectTechStack } = require("../lib/github");
const { scanRepo } = require("../lib/scanner");
const { analyzeHeaders } = require("../lib/headers");
const { analyzeWithAI } = require("../lib/claude");
const Submission = require("../models/Submission");

const runAudit = async (req,res) => {
    try{
        const{repoUrl,liveUrl} = req.body;

        if(!repoUrl || !liveUrl){
            return res.status(400).json({
                error : "repourl and liveurl are required"
            })
        }

        const { owner, repo } = parseGithubUrl(repoUrl);
        const files = await fetchRepoTree(owner, repo);
        const techStack = detectTechStack(files);

        const githubData = {
            owner,
            repo,
            techStack,
            fileCount : files.length
        };

        const scanData = await scanRepo(files, fetchFileContent, owner, repo);

        const headerData = await analyzeHeaders(liveUrl)

        const aiResult = await analyzeWithAI(githubData, scanData, headerData);

        if(!aiResult.success) {
            return res.status(500).json({ 
                error: "AI analysis failed", 
                details: aiResult.error 
            });
        }

        const submission = new Submission({
            repoUrl,
            liveUrl,
            scores: aiResult.data.scores,
            findings: aiResult.data.findings,
            isPublic: false,
            isApproved: false
        });

        await submission.save();

        res.status(201).json({
            success: true,
            submissionId: submission._id,
            scores: aiResult.data.scores,
            summary: aiResult.data.summary,
            findings: aiResult.data.findings,
            positives: aiResult.data.positives,
            meta: {
                techStack,
                filesScanned: scanData.filesScanned,
                responseTime: headerData.responseTime,
                httpsUsed: headerData.httpsUsed
            }
        });
    }catch(err){
        console.error("Audit error:", err.message);
        res.status(500).json({ 
            error: "Audit failed", 
            details: err.message
        });
    }
}

module.exports = { runAudit };