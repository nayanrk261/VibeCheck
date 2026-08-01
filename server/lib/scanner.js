const SECRET_PATTERNS = [
    {
        type: "OpenAI API Key",
        severity: "CRITICAL",
        pattern: /sk-[a-zA-Z0-9]{48}/g,
        message: "OpenAI API key hardcoded in code"
    },
    {
        type: "AWS API Key",
        severity: "CRITICAL",
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
    },
    {
        type: "CORS Wildcard",
        severity: "HIGH",
        pattern: /cors\(\s*\{\s*origin\s*:\s*['"`]\*['"`]/g,
        message: "CORS is set to allow all origins (*) — anyone can call your API"
    },
    {
        type: "Sensitive Data Logging",
        severity: "MEDIUM",
        pattern: /console\.log\([^)]*?(password|token|secret|key|auth)[^)]*?\)/gi,
        message: "Sensitive data may be logged to console"
    },
    {
        type: "Stack Trace Exposure",
        severity: "MEDIUM",
        pattern: /res\.(send|json)\([^)]*?err\.(stack|message)/g,
        message: "Error stack traces exposed to client"
    },
    {
        type: "Hardcoded IP",
        severity: "LOW",
        pattern: /['"`](https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g,
        message: "Hardcoded IP address found — use environment variables"
    },
    {
        type: "Dangerous eval()",
        severity: "HIGH",
        pattern: /\beval\s*\(/g,
        message: "eval() usage detected — major security risk"
    },
    {
        type: "SQL Injection Risk",
        severity: "HIGH",
        pattern: /query\s*\(\s*[`'"]\s*(SELECT|INSERT|UPDATE|DELETE)[^`'"]*\$\{/gi,
        message: "Possible SQL injection — string interpolation in SQL query"
    },
    {
        type: "Insecure Randomness",
        severity: "MEDIUM",
        pattern: /Math\.random\(\)/g,
        message: "Math.random() is not cryptographically secure — use crypto.randomBytes()"
    },
    {
        type: "Security TODO",
        severity: "LOW",
        pattern: /(TODO|FIXME|HACK|XXX).{0,50}(auth|security|password|token|secret)/gi,
        message: "Unresolved security-related TODO comment found"
    },
    {
        type: "Weak JWT Secret",
        severity: "HIGH",
        pattern: /jwt\.sign\([^)]+,\s*['"`][^'"`]{1,20}['"`]/g,
        message: "JWT signed with short/weak secret — use a long random secret"
    },
    {
        type: "Real Values in .env.example",
        severity: "HIGH",
        pattern: /(API_KEY|SECRET|PASSWORD|TOKEN)\s*=\s*[^\s\n]{8,}/gi,
        message: "Possible real credentials in .env.example file"
    },
];

const scanFileForSecrets = (filepath, Content) => {
    const findings = [];

    if (typeof Content !== 'string') return findings;

    for (const secretType of SECRET_PATTERNS) {
        secretType.pattern.lastIndex = 0;
        const matches = Content.match(secretType.pattern);
        if (matches) {
            findings.push({
                type: secretType.type,
                severity: secretType.severity,
                message: secretType.message,
                location: filepath,
                matchCount: matches.length
            });
        }
    }
    return findings;
};

const checkEnvInGitignore = (files) => {
    const gitignore = files.find((file) => file.path === ".gitignore");
    const envFile = files.find((file) => file.path === ".env");

    if (!envFile) {
        return {
            hasEnvFile: false,
            envInGitignore: true,
            message: ".env file not found in repo — likely gitignored (good practice)"
        };
    }

    if (!gitignore) {
        return {
            hasEnvFile: true,
            envInGitignore: false,
            message: ".env file exists but no .gitignore found — .env may be exposed"
        };
    }

    return {
        hasEnvFile: true,
        envInGitignore: true,
        message: ".env is properly gitignored"
    };
};

const scanRepo = async (files, fetchfilecontent, owner, repo) => {
    const allFindings = [];
    const filesToScan = files.slice(0, 15);

    for (const file of filesToScan) {
        try {
            const content = await fetchfilecontent(owner, repo, file.path);
            const findings = scanFileForSecrets(file.path, content);
            allFindings.push(...findings);
        } catch(err) {
            console.error(`Skipping ${file.path}: ${err.message}`);
        }
    }

    // Package.json vulnerability check
    const packageJson = files.find(f => f.path === 'package.json');
    if (packageJson) {
        try {
            const content = await fetchfilecontent(owner, repo, packageJson.path);
            const pkg = typeof content === 'string' ? JSON.parse(content) : content;
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };

            const vulnerablePackages = [
                { name: 'lodash', issue: 'Prototype pollution vulnerability' },
                { name: 'axios', issue: 'SSRF vulnerability in older versions' },
                { name: 'jsonwebtoken', issue: 'Algorithm confusion attack possible' },
                { name: 'multer', issue: 'DoS vulnerability in older versions' },
            ];

            vulnerablePackages.forEach(vp => {
                if (deps[vp.name]) {
                    allFindings.push({
                        type: "Potentially Vulnerable Dependency",
                        severity: "MEDIUM",
                        message: `${vp.name} found — ${vp.issue}. Ensure you're using latest version.`,
                        location: "package.json",
                        matchCount: 1
                    });
                }
            });
        } catch(e) {
            console.error(`package.json scan failed: ${e.message}`);
        }
    }

    const envCheck = checkEnvInGitignore(files);

    return {
        secrets: allFindings,
        envCheck: envCheck,
        filesScanned: filesToScan.length
    };
};

module.exports = {
    scanRepo,
    scanFileForSecrets,
    checkEnvInGitignore
};