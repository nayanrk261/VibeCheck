const axios = require("axios");
const { z } = require("zod");

// NOTE: named claude.js for historical reasons but calls Groq's
// OpenAI-compatible chat completions API, not Anthropic's.

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
                max_tokens: 2000,
                temperature: 0, // deterministic output — same input, same score, every time
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
    if (!headerData || (!headerData.error && headerData.responseTime == null && !headerData.findings?.length && !headerData.httpsUsed)) {
        return "No live URL was provided.";
    }
    if (headerData.error) {
        return `The live URL could NOT be scanned. Reason: "${headerData.message}".`;
    }
    return `Live URL was reached successfully. HTTPS used: ${headerData.httpsUsed}. Missing headers: ${headerData.findings.map(f => f.header).join(", ") || "none"}.`;
};

const buildPrompt = (githubData, scanData, headerData) => {
    const hasRepoData = githubData.fileCount > 0;
    const hasLiveData = headerData && !headerData.error && headerData.responseTime != null;

    return `
You are a senior security engineer reviewing a vibe-coded web application.

Only score and report what you have actual data for. Never invent a value
to fill a gap. Code quality and UI/UX are scored elsewhere in this system —
do not mention or score them.

GITHUB ANALYSIS:
- Repo analyzed: ${hasRepoData ? "yes" : "no"}
- Tech Stack: ${githubData.techStack.join(", ") || "Unknown"}
- Files Analyzed: ${githubData.fileCount}

SECRET SCAN:
- Secrets Found: ${scanData.secrets.length}
- Types: ${scanData.secrets.map(s => s.type).join(', ') || 'None'}
- ENV Check: ${scanData.envCheck.message}
- Note: If .env is not in repo, it means it's properly gitignored. Do NOT flag this as an issue.

LIVE URL / HEADER ANALYSIS:
${describeHeaderStatus(headerData)}

SCORING RULE:
${hasRepoData || hasLiveData
        ? `Score "securityScore" 0-100 based ONLY on: secrets found, missing/present security headers, and HTTPS usage from the data above.`
        : `Neither the repo nor the live URL produced any usable data. Set "securityScore" to null (not a number, not 0). In the summary, clearly say there wasn't enough data to audit this submission — do not describe a security posture that wasn't actually assessed.`
    }

Return ONLY valid JSON — no markdown, no extra text:
{
    "securityScore": <integer 0-100, or null if no data was available>,
    "summary": "<2-3 sentences reflecting only what was actually analyzed>",
    "findings": [{ "title": "", "severity": "HIGH", "category": "", "description": "", "fix": "" }],
    "positives": [""]
}
`;
};

const aiResponseSchema = z.object({
    securityScore: z.number().min(0).max(100).nullable(),
    summary: z.string().min(1),
    findings: z.array(z.object({
        title: z.string().min(1).catch("Untitled finding"),
        severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]).catch("INFO"),
        category: z.string().optional().default(""),
        description: z.string().optional().default(""),
        fix: z.string().optional().default(""),
    })).default([]),
    positives: z.array(z.string()).default([]),
});

const analyzeWithAI = async (githubData, scanData, headerData) => {
    try {
        const prompt = buildPrompt(githubData, scanData, headerData);
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

        const data = validated.data;

        if (data.securityScore != null) {
            data.securityScore = Math.round(data.securityScore);
        }

        if (headerData?.error) {
            data.findings.push({
                title: "Live URL could not be scanned",
                severity: "INFO",
                category: "Availability",
                description: headerData.message || "The provided live URL could not be reached or is not a scannable public address.",
                fix: "Double-check the URL is correct, publicly reachable, and not pointing at an internal/private address."
            });
        }

        return { success: true, data };
    }
    catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
};

module.exports = { analyzeWithAI, callClaude, buildPrompt };