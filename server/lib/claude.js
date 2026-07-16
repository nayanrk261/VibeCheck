const axios = require("axios");

const callClaude = async (prompt) => {
    const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            model: "meta-llama/llama-3.1-8b-instruct:free",
            messages: [
                {
                    role: "user",
                    content: prompt
                }               
            ],
            max_tokens : 2000
        },
        {
            headers : {
                "Authorization" : `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            }
        }
    );
    const content = response.data.choices[0].message.content;
    return content;
}

const buildPrompt = (githubData, scanData, headerData) => {
    return `
You are a senior security engineer reviewing a vibe-coded (AI-generated) web application.

Based on the following real findings, provide a security audit report.

GITHUB ANALYSIS:
- Tech Stack: ${githubData.techStack.join(", ")}
- Files Analyzed: ${githubData.fileCount}

SECRET SCAN RESULTS:
- Secrets Found: ${scanData.secrets.length}
- Files Scanned: ${scanData.filesScanned}
- Findings: ${JSON.stringify(scanData.secrets, null, 2)}
- ENV Check: ${scanData.envCheck.message}

HEADER ANALYSIS:
- Response Time: ${headerData.responseTime}ms
- HTTPS Used: ${headerData.httpsUsed}
- Header Findings: ${JSON.stringify(headerData.findings, null, 2)}

Based on ONLY these real findings, respond with a JSON object in this exact format:
{
    "scores": {
        "security": <0-100>,
        "codeQuality": <0-100>,
        "uiUx": <0-100>,
        "performance": <0-100>,
        "overall": <0-100>
    },
    "summary": "<2-3 sentence executive summary>",
    "findings": [
        {
            "title": "<short title>",
            "severity": "<CRITICAL|HIGH|MEDIUM|LOW|INFO>",
            "category": "<Security|Performance|Code Quality|Configuration>",
            "description": "<what the issue is>",
            "fix": "<how to fix it>"
        }
    ],
    "positives": ["<things done well>"]
}

Respond with ONLY the JSON — no markdown, no explanation outside JSON.
`;
};

const analyzeWithAI = async (githubData,scanData,headerData) => {
    try{
        const prompt = buildPrompt(githubData, scanData, headerData);
        const rawResponse = await callClaude(prompt);
        
        const cleaned = rawResponse.replace(/```json|```/g, "").trim();
        const result = JSON.parse(cleaned);

        return { success: true, data: result };
    }
    catch(err){
        return{
            success: false,
            error: err.message
        };
    }
};

module.exports = { analyzeWithAI, callClaude, buildPrompt };