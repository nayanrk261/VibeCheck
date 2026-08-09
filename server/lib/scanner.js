const { checkDependencies } = require("./dependencyCheck");
const { analyzeCodePatterns, checkMissingHelmet } = require("./patternCheck");

const SECRET_PATTERNS = [
    {
        type: "OpenAI API Key",
        severity: "CRITICAL",
        pattern: /sk-[a-zA-Z0-9]{48}/g,
        message: "OpenAI API key hardcoded in code",
        fix: "Move this key to an environment variable, remove it from git history, and rotate it immediately in your OpenAI dashboard."
    },
    {
        type: "AWS API Key",
        severity: "CRITICAL",
        pattern: /AKIA[0-9A-Z]{16}/g,
        message: "AWS Access key hardcoded in code",
        fix: "Move this key to an environment variable, remove it from git history, and rotate it immediately in the AWS IAM console."
    },
    {
        type: "Private Key",
        severity: "CRITICAL",
        pattern: /-----BEGIN [A-Z]+ PRIVATE KEY-----/g,
        message: "Private key found in code",
        fix: "Remove this key from the repo and git history immediately, and rotate/reissue it — treat it as compromised."
    },
    {
        type: "MongoDB URI",
        severity: "HIGH",
        pattern: /mongodb(\+srv)?:\/\/[^\s"']+/g,
        message: "MongoDB connection string hardcoded in code",
        fix: "Move the connection string to an environment variable and rotate the database credentials."
    },
    {
        type: "JWT Secret",
        severity: "HIGH",
        pattern: /(jwt|secret|token)['":\s]+[a-zA-Z0-9_\-]{16,}/gi,
        message: "Possible JWT secret hardcoded in code",
        fix: "Move this to an environment variable and use a long, randomly generated secret (32+ bytes)."
    },
    {
        type: "Generic API Key",
        severity: "MEDIUM",
        pattern: /(api_key|apikey|api-key)['":\s=]+[a-zA-Z0-9_\-]{16,}/gi,
        message: "Possible API key hardcoded in code",
        fix: "Move this key to an environment variable and rotate it if it was ever pushed to a public repo."
    },
    {
        type: "CORS Wildcard",
        severity: "HIGH",
        pattern: /cors\(\s*\{\s*origin\s*:\s*['"`]\*['"`]/g,
        message: "CORS is set to allow all origins (*) — anyone can call your API",
        fix: "Restrict CORS to your actual frontend origin(s) instead of using a wildcard."
    },
    {
        type: "Sensitive Data Logging",
        severity: "MEDIUM",
        pattern: /console\.log\([^)]*?(password|token|secret|key|auth)[^)]*?\)/gi,
        message: "Sensitive data may be logged to console",
        fix: "Remove or redact sensitive fields before logging — logs often end up in third-party services."
    },
    {
        type: "Stack Trace Exposure",
        severity: "MEDIUM",
        pattern: /res\.(send|json)\([^)]*?err\.(stack|message)/g,
        message: "Error stack traces exposed to client",
        fix: "Return a generic error message to the client and log the detailed error server-side only."
    },
    {
        type: "Hardcoded IP",
        severity: "LOW",
        pattern: /['"`](https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g,
        message: "Hardcoded IP address found — use environment variables",
        fix: "Move this to a configuration/environment variable so it's not baked into source control."
    },
    {
        type: "Dangerous eval()",
        severity: "HIGH",
        pattern: /\beval\s*\(/g,
        message: "eval() usage detected — major security risk",
        fix: "Avoid eval() entirely — use JSON.parse, a safe expression parser, or refactor to avoid dynamic code execution."
    },
    {
        type: "SQL Injection Risk",
        severity: "HIGH",
        pattern: /query\s*\(\s*[`'"]\s*(SELECT|INSERT|UPDATE|DELETE)[^`'"]*\$\{/gi,
        message: "Possible SQL injection — string interpolation in SQL query",
        fix: "Use parameterized queries / prepared statements instead of interpolating values into SQL strings."
    },
    {
        type: "Insecure Randomness",
        severity: "MEDIUM",
        pattern: /Math\.random\(\)/g,
        message: "Math.random() is not cryptographically secure — use crypto.randomBytes()",
        fix: "Use crypto.randomBytes() (Node) or an equivalent CSPRNG for anything security-sensitive (tokens, IDs, secrets)."
    },
    {
        type: "Security TODO",
        severity: "LOW",
        pattern: /(TODO|FIXME|HACK|XXX).{0,50}(auth|security|password|token|secret)/gi,
        message: "Unresolved security-related TODO comment found",
        fix: "Resolve this before launch — an unresolved security TODO is a known gap, not an unknown one."
    },
    {
        type: "Weak JWT Secret",
        severity: "HIGH",
        pattern: /jwt\.sign\([^)]+,\s*['"`][^'"`]{1,20}['"`]/g,
        message: "JWT signed with short/weak secret — use a long random secret",
        fix: "Use a randomly generated secret of 32+ bytes, stored in an environment variable."
    },
    {
        type: "Real Values in .env.example",
        severity: "HIGH",
        pattern: /(API_KEY|SECRET|PASSWORD|TOKEN)\s*=\s*[^\s\n]{8,}/gi,
        message: "Possible real credentials in .env.example file",
        fix: "Replace real values in .env.example with placeholders like 'your_api_key_here', and rotate the real credential if it was ever committed."
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
                fix: secretType.fix,
                location: filepath,
                matchCount: matches.length
            });
        }
    }
    return findings;
};

// Aggregates raw per-file matches into one report finding per secret type
// (so 5 files logging tokens doesn't become 5 separate findings), and
// converts them into the same {title, severity, category, description, fix}
// shape used everywhere else in the report.
const aggregateSecretFindings = (rawFindings) => {
    const byType = {};
    for (const f of rawFindings) {
        if (!byType[f.type]) {
            byType[f.type] = { ...f, locations: [f.location] };
        } else {
            byType[f.type].locations.push(f.location);
            byType[f.type].matchCount += f.matchCount;
        }
    }
    return Object.values(byType).map((f) => {
        const shown = f.locations.slice(0, 5).join(", ");
        const extra = f.locations.length > 5 ? ` and ${f.locations.length - 5} more file(s)` : "";
        return {
            title: f.type,
            severity: f.severity,
            category: "Secrets",
            description: `${f.message}. Found in: ${shown}${extra}.`,
            fix: f.fix,
        };
    });
};

const checkEnvInGitignore = (files) => {
    const gitignore = files.find((file) => file.path === ".gitignore");
    const envFile = files.find((file) => file.path === ".env");

    if (!envFile) {
        return {
            hasEnvFile: false,
            envInGitignore: true,
            message: ".env file not found in repo — likely gitignored (good practice)",
            positive: ".env file is not present in the repository — it's likely properly gitignored.",
            finding: null
        };
    }

    if (!gitignore) {
        return {
            hasEnvFile: true,
            envInGitignore: false,
            message: ".env file exists but no .gitignore found — .env may be exposed",
            positive: null,
            finding: {
                title: ".env file may be committed to the repository",
                severity: "HIGH",
                category: "Secrets",
                description: "A .env file exists in this repo and no .gitignore was found, so it may have been committed along with real secrets inside.",
                fix: "Add .env to .gitignore immediately, remove it from git history (git filter-repo or BFG), and rotate any credentials it contained."
            }
        };
    }

    return {
        hasEnvFile: true,
        envInGitignore: true,
        message: ".env is properly gitignored",
        positive: ".env is present locally but properly excluded via .gitignore.",
        finding: null
    };
};

// Auth/route/controller files are the highest-value targets for the pattern
// checks below, but tree order doesn't guarantee they're in the first N
// files. Bubble likely-relevant files to the front before slicing.
const PRIORITY_KEYWORDS = ['auth', 'login', 'signup', 'register', 'user', 'route', 'controller', 'middleware', 'server', 'app', 'index', 'password', 'payment', 'admin'];

function prioritizeFiles(files) {
    return [...files].sort((a, b) => {
        const scoreA = PRIORITY_KEYWORDS.some(k => a.path.toLowerCase().includes(k)) ? 0 : 1;
        const scoreB = PRIORITY_KEYWORDS.some(k => b.path.toLowerCase().includes(k)) ? 0 : 1;
        return scoreA - scoreB;
    });
}

const scanRepo = async (files, fetchfilecontent, owner, repo) => {
    const rawSecrets = [];
    const fetchedContents = [];
    const filesToScan = prioritizeFiles(files).slice(0, 20);

    for (const file of filesToScan) {
        try {
            const content = await fetchfilecontent(owner, repo, file.path);
            fetchedContents.push({ path: file.path, content });
            const findings = scanFileForSecrets(file.path, content);
            rawSecrets.push(...findings);
        } catch (err) {
            console.error(`Skipping ${file.path}: ${err.message}`);
        }
    }

    const findings = [...aggregateSecretFindings(rawSecrets)];
    const positives = [];

    if (rawSecrets.length === 0) {
        positives.push("No hardcoded secrets or API keys were found in the files we scanned.");
    }

    // Heuristic pattern checks — rate limiting, input validation, plaintext
    // passwords, IDOR — reusing content already fetched above, no extra
    // GitHub API calls needed.
    findings.push(...analyzeCodePatterns(fetchedContents));

    // Real dependency vulnerability check via OSV.dev, replacing the old
    // hardcoded 4-package list.
    const packageJson = files.find(f => f.path === 'package.json');
    let pkg = null;
    if (packageJson) {
        try {
            const content = await fetchfilecontent(owner, repo, packageJson.path);
            pkg = typeof content === 'string' ? JSON.parse(content) : content;
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            const depFindings = await checkDependencies(deps);
            findings.push(...depFindings);
            if (depFindings.length === 0 && Object.keys(deps).length > 0) {
                positives.push("No known vulnerabilities found in your listed dependencies (OSV.dev).");
            }
            findings.push(...checkMissingHelmet(pkg));
        } catch (e) {
            console.error(`package.json scan failed: ${e.message}`);
        }
    }

    const envCheck = checkEnvInGitignore(files);
    if (envCheck.finding) findings.push(envCheck.finding);
    if (envCheck.positive) positives.push(envCheck.positive);

    return {
        secrets: rawSecrets,
        findings,
        positives,
        envCheck,
        filesScanned: filesToScan.length
    };
};

module.exports = {
    scanRepo,
    scanFileForSecrets,
    checkEnvInGitignore
};