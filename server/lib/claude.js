const axios = require("axios");
const { z } = require("zod");

// NOTE: named claude.js for historical reasons but calls Groq's
// OpenAI-compatible chat completions API, not Anthropic's.
//
// This module's job is now deliberately narrow: write a short, accurate
// summary and a couple of supplementary positives. It does NOT score
// anything and does NOT invent findings — those are fully deterministic
// (see scanner.js, dependencyCheck.js, exposureCheck.js, scoring.js) because
// asking an LLM to re-derive facts we already know precisely just
// introduces inconsistency (see: the same secret being called three
// different things across three runs).

const isRetryable = (err) => {
    const status = err.response?.status;
    return status === 429 || status === 500 || status === 502 || status === 503 || err.code === "ECONNABORTED";
};

const callClaude = async (prompt, retries = 3) => {
    try {
        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 800,
                temperature: 0,
                response_format: { type: "json_object" }
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                timeout: 20000
            }
        );
        return response.data.choices[0].message.content;
    } catch (err) {
        if (isRetryable(err) && retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            return callClaude(prompt, retries - 1);
        }
        throw err;
    }
};

const describeHeaderStatus = (headerData) => {
    if (!headerData || (!headerData.error && headerData.responseTime == null)) {
        return "No live URL was provided.";
    }
    if (headerData.error) {
        return `The live URL could NOT be scanned. Reason: "${headerData.message}".`;
    }
    return `Live URL was reached successfully. HTTPS used: ${headerData.httpsUsed}.`;
};

// context = { githubData, headerData, securityScore, performanceScore, findings, readinessScore? }
const buildPrompt = (context) => {
    const { githubData, headerData, securityScore, performanceScore, findings, readinessScore, filesScanned } = context;

    const findingsList = findings.length
        ? findings.map(f => `- [${f.severity}] ${f.title} (${f.category})`).join("\n")
        : "None.";

    const readinessLine = readinessScore !== undefined
        ? `\n- Production Readiness score: ${readinessScore ?? "not scored — insufficient data"} (separate from Security — covers legal/compliance/integration basics, not code security)`
        : "";

    const githubLine = githubData.fileCount > 0
        ? `- GitHub: repo contains ${githubData.fileCount} files total; the ${filesScanned ?? githubData.fileCount} most security-relevant were scanned (auth/config/routes prioritized). Do NOT describe this as a "thorough" or "complete" analysis of the whole repo — say how many were actually scanned if you mention it.`
        : "- GitHub: no repo was analyzed.";

    return `
You are a senior security engineer writing the summary paragraph for an
already-completed audit. All scoring and finding detection is done — do not
invent, restate with different wording, or contradict any of it. Your only
job is a short, accurate summary and, optionally, 1-3 additional positive
notes not already implied by the findings list.

ALREADY COMPUTED (treat as ground truth):
- Security score: ${securityScore ?? "not scored — insufficient data"}
- Performance score: ${performanceScore ?? "not scored — insufficient data"}${readinessLine}
- Findings (${findings.length} total):
${findingsList}

CONTEXT:
${githubLine}
- Tech stack: ${githubData.techStack.join(", ") || "unknown"}
- Live URL status: ${describeHeaderStatus(headerData)}

Return ONLY valid JSON, no markdown:
{
    "summary": "<2-3 sentences, must be consistent with the scores and findings above>",
    "positives": ["<optional additional positive notes — empty array if none apply>"]
}
`;
};

const aiResponseSchema = z.object({
    summary: z.string().min(1),
    positives: z.array(z.string()).default([]),
});

const analyzeWithAI = async (context) => {
    try {
        const prompt = buildPrompt(context);
        const rawResponse = await callClaude(prompt);

        const cleaned = rawResponse.replace(/```json|```/g, "").trim();

        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            throw new Error("AI returned malformed JSON");
        }

        const validated = aiResponseSchema.safeParse(parsed);
        if (!validated.success) {
            throw new Error(`AI response failed validation: ${validated.error.issues.map(i => i.message).join("; ")}`);
        }

        return { success: true, data: validated.data };
    }
    catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
};

module.exports = { analyzeWithAI, callClaude, buildPrompt };