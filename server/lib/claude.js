const axios = require("axios");

const callClaude = async (prompt, retries = 3) => {
    try {
        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 2000
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );
        return response.data.choices[0].message.content;
    } catch(err) {
        if(err.response?.status === 429 && retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            return callClaude(prompt, retries - 1);
        }
        throw err;
    }
};

const buildPrompt = (githubData, scanData, headerData) => {
    return `
You are a senior security engineer reviewing a vibe-coded web application.

GITHUB ANALYSIS:
- Tech Stack: ${githubData.techStack.join(", ") || "Unknown"}
- Files Analyzed: ${githubData.fileCount}

SECRET SCAN:
- Secrets Found: ${scanData.secrets.length}
- Types: ${scanData.secrets.map(s => s.type).join(', ') || 'None'}
- ENV Check: ${scanData.envCheck.message}

HEADER ANALYSIS:
- Response Time: ${headerData.responseTime}ms
- HTTPS: ${headerData.httpsUsed}
- Missing Headers: ${headerData.findings.map(f => f.header).join(', ') || 'None'}

Respond with ONLY this JSON:
{
    "scores": { "security": 0, "codeQuality": 0, "uiUx": 0, "performance": 0, "overall": 0 },
    "summary": "<2-3 sentences>",
    "findings": [{ "title": "", "severity": "HIGH", "category": "", "description": "", "fix": "" }],
    "positives": [""]
}
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