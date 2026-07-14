const axios = require('axios');

const SECURITY_HEADERS = [
    {
        name : "content-security-policy",
        description : "Prevents XSS attacks by controlling resource loading",
        severity: "HIGH"
    },
    {
        name: "x-frame-options",
        description: "Prevents clickjacking attacks",
        severity: "MEDIUM"        
    },
    {
        name: "strict-transport-security",
        description: "Enforces HTTPS connections",
        severity: "HIGH"
    },
    {
        name: "x-content-type-options",
        description: "Prevents MIME type sniffing",
        severity: "LOW"
    }
];

const analyzeHeaders = async (url) => {
    const findings = [];
    const startTime = Date.now();

    let response;
    try{
        response = await axios.get(url, {
            timeout : 10000,
            validateStatus : () => true
        });
    }
    catch(err){
        return {
            error: true,
            message: `Could not reach ${url}: ${err.message}`,
            findings: [],
            responseTime: null,
            httpsUsed: url.startsWith("https://")
        };
    }

    const responseTime = Date.now() - startTime;
    const headers = response.headers;

    for(const secHeader of SECURITY_HEADERS){
        const isPresent = headers[secHeader.name] !== undefined;

        if(!isPresent){
            findings.push({
                type: "Missing Security Header",
                severity: secHeader.severity,
                header: secHeader.name,
                description: secHeader.description,
                fix: `Add ${secHeader.name} header to your server response`
            });
        }
    }

    const httpsUsed = url.startsWith("https://");
    if(!httpsUsed){
        findings.push({
            type : "No HTTPS",
            severity : "CRITICAL",
            header : "protocol",
            description : "App is served over HTTP — data is not encrypted",
            fix: "Enable HTTPS — most hosting platforms (Vercel, Render) do this automatically"
        });
    }

    if(responseTime > 3000){
        findings.push({
            type: "Slow Response Time",
            severity: "MEDIUM",
            header: "performance",
            description: `App took ${responseTime}ms to respond — should be under 3000ms`,
            fix: "Optimize server response time — check database queries, add caching"
        });
    }

    return {
        error: false,
        responseTime,
        httpsUsed,
        statusCode: response.status,
        findings
    };
}

module.exports = { analyzeHeaders };