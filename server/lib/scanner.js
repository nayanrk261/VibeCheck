const SECRET_PATTERNS = [
    {
        type : "OpenAI API Key",
        severity : "CRITICAL",
        pattern: /sk-[a-zA-Z0-9]{48}/g,
        message: "OpenAI API key hardcoded in code"       
    },
    {
        type : "AWS API Key",
        severity : "CRITICAL",
        pattern: /AKIA[0-9A-Z]{16}/g,
        message: "AWS Access key hardcoded in code"
    },
    {
        type: "Private Key",
        severity: "CRITICAL",
        pattern: /-----BEGIN [A-Z]+ PRIVATE KEY-----/g,
        message: "Private key found in code"
    },
    {
        type: "MongoDB URI",
        severity: "HIGH",
        pattern: /mongodb(\+srv)?:\/\/[^\s"']+/g,
        message: "MongoDB connection string hardcoded in code"
    },
    {
        type: "JWT Secret",
        severity: "HIGH",
        pattern: /(jwt|secret|token)['":\s]+[a-zA-Z0-9_\-]{16,}/gi,
        message: "Possible JWT secret hardcoded in code"
    },
    {
        type: "Generic API Key",
        severity: "MEDIUM",
        pattern: /(api_key|apikey|api-key)['":\s=]+[a-zA-Z0-9_\-]{16,}/gi,
        message: "Possible API key hardcoded in code"
    }
];

const scanFileForSecrets = (filepath,Content) => {
    const findings = [];

    for(const secretType of SECRET_PATTERNS) {
        secretType.pattern.lastIndex = 0;

        const matches = Content.match(secretType.pattern);

        if(matches){
            findings.push({
                type : secretType.type,
                severity : secretType.severity,
                message : secretType.message,
                location : filepath,
                matchCount : matches.length
            });
        }
    }
    return findings;
}

const checkEnvInGitignore = (files) => {
    const gitignore = files.find((file) => file.path === ".gitignore");
    const envFile = files.find((file) => file.path === ".env");

    if(!envFile){
        return{
            hasEnvFile : false,
            envInGitignore  : false,
            message : "No .env file found",

        };
    }

    if(!gitignore){
        return{
            hasEnvFile : true,
            envInGitignore : false,
            message : ".env file exists but no .gitignore found — .env may be exposed"
        };
    }

    return{
        hasEnvFile : true,
        envInGitignore : true,
        message : ".env is properly gitignored"
    };
}

const scanRepo = async (files, fetchfilecontent, owner, repo) => {
    const allFindings = [];

    const filesToScan = files.slice(0,15);

    for(const file of filesToScan){
        try{
            const content = await fetchfilecontent(owner, repo, file.path);
            const findings = scanFileForSecrets(file.path, content);
            allFindings.push(...findings);
        }catch(err){
            console.error(`Skipping ${file.path}: ${err.message}`);
        }
    }

    const envCheck = checkEnvInGitignore(files);

    return{
        secrets : allFindings,
        envCheck : envCheck,
        filesScanned : filesToScan.length
    };
}

module.exports = {
    scanRepo,
    scanFileForSecrets,
    checkEnvInGitignore
};