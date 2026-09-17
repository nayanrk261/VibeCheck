const { getLineAndColumn, getEvidenceSnippet, redactEvidence, maskComments } = require("./evidenceUtils");

const AUTH_ROUTE_PATTERN = /\.(post|get)\s*\(\s*['"`]\/[^'"`]*(login|signin|sign-in|signup|sign-up|register|reset-?password|forgot-?password|otp)[^'"`]*['"`]/i;
const RATE_LIMIT_USAGE = /express-rate-limit|rateLimit\s*\(/i;
const VALIDATION_LIB_USAGE = /require\(\s*['"`](zod|joi|yup|express-validator|validator|ajv|superstruct|valibot|typebox)['"`]\s*\)|from\s+['"`](zod|joi|yup|express-validator|validator|ajv|superstruct|valibot|typebox)['"`]/i;
const INLINE_VALIDATION_SIGNAL = /\.(safeParse|parse|validate|validateAsync|check)\s*\(|z\.object|Joi\.object|yup\.object/i;
const BODY_USAGE = /req\.body/;
const HASH_LIB_USAGE = /bcrypt|argon2|scrypt/i;
const PASSWORD_SAVE_SIGNAL = /password\s*[:=]\s*req\.body\.password/i;
const PERSIST_SIGNAL = /\.save\(\)|insertOne|new User|create\(/i;
const ID_PARAM_ROUTE = /\.(get|put|delete|patch)\s*\(\s*['"`][^'"`]*:id[^'"`]*['"`]/i;
const OWNERSHIP_CHECK = /req\.user|ownerId|userId\s*===|\.owner\b/i;
const MULTER_USAGE = /multer\s*\(/i;
const MULTER_SAFETY_CONFIG = /fileFilter\s*:|limits\s*:\s*\{[^}]*fileSize/is;
const DEBUG_ROUTE_PATTERN = /\.(get|post)\s*\(\s*['"`]\/(test|debug|seed-?data|admin-?backdoor|internal|__test)[^'"`]*['"`]/i;

function findMatchLocation(content, pattern) {
    if (typeof content !== "string") return null;
    const masked = maskComments(content);
    pattern.lastIndex = 0;
    const match = pattern.exec(masked);
    if (!match) return null;
    const offset = match.index;
    const { line, column } = getLineAndColumn(content, offset);
    const rawSnippet = getEvidenceSnippet(content, offset);
    const evidence = redactEvidence(rawSnippet);
    return { line, column, evidence };
}

function analyzeCodePatterns(fileContents) {
    let authHit = null;
    let hasRateLimit = false;
    let hasValidationLib = false;
    let bodyHit = null;
    let passHit = null;
    const idorCandidates = [];
    const unsafeUploads = [];
    const debugRouteHits = [];

    for (const { path, content } of fileContents) {
        if (typeof content !== "string") continue;

        const masked = maskComments(content);

        if (!authHit) {
            const matchLoc = findMatchLocation(content, AUTH_ROUTE_PATTERN);
            if (matchLoc) authHit = { file: path, ...matchLoc };
        }

        if (RATE_LIMIT_USAGE.test(content) || RATE_LIMIT_USAGE.test(masked)) hasRateLimit = true;
        if (VALIDATION_LIB_USAGE.test(content) || INLINE_VALIDATION_SIGNAL.test(content)) hasValidationLib = true;

        if (!bodyHit) {
            const matchLoc = findMatchLocation(content, BODY_USAGE);
            if (matchLoc) bodyHit = { file: path, ...matchLoc };
        }

        if (!passHit) {
            if (PASSWORD_SAVE_SIGNAL.test(masked) && !HASH_LIB_USAGE.test(masked) && PERSIST_SIGNAL.test(masked)) {
                const matchLoc = findMatchLocation(content, PASSWORD_SAVE_SIGNAL);
                if (matchLoc) passHit = { file: path, ...matchLoc };
            }
        }

        if (ID_PARAM_ROUTE.test(masked) && !OWNERSHIP_CHECK.test(masked)) {
            const matchLoc = findMatchLocation(content, ID_PARAM_ROUTE);
            idorCandidates.push({ file: path, ...(matchLoc || { line: null, column: null, evidence: ":id route without ownership check" }) });
        }

        if (MULTER_USAGE.test(masked) && !MULTER_SAFETY_CONFIG.test(masked)) {
            const matchLoc = findMatchLocation(content, MULTER_USAGE);
            unsafeUploads.push({ file: path, ...(matchLoc || { line: null, column: null, evidence: "multer usage without safety limits" }) });
        }

        if (DEBUG_ROUTE_PATTERN.test(masked)) {
            const matchLoc = findMatchLocation(content, DEBUG_ROUTE_PATTERN);
            debugRouteHits.push({ file: path, ...(matchLoc || { line: null, column: null, evidence: "Debug/test route found" }) });
        }
    }

    const findings = [];

    if (authHit && !hasRateLimit) {
        findings.push({
            title: "No rate limiting detected on auth routes",
            severity: "HIGH",
            category: "Abuse Prevention",
            description: "Found what looks like a login/signup/password-reset route, but no rate-limiting library (e.g. express-rate-limit) anywhere in the files we scanned. Without it, these endpoints are open to brute-force and credential-stuffing attacks.",
            fix: "Add express-rate-limit (or equivalent) to auth routes — a common baseline is 5 attempts/minute on login, 3/hour on password reset.",
            file: authHit.file,
            line: authHit.line,
            column: authHit.column,
            evidence: authHit.evidence,
            confidence: "MEDIUM",
            status: "REVIEW"
        });
    }

    if (bodyHit && !hasValidationLib) {
        findings.push({
            title: "Unvalidated request body usage",
            severity: "MEDIUM",
            category: "Input Validation",
            description: "Route handlers read from req.body, but no schema validation library (Zod, Joi, Yup, express-validator) or validation schema was detected in the scanned files. Unvalidated input increases the risk of injection, type-confusion bugs, and malformed data reaching your database.",
            fix: "Validate and sanitize incoming request bodies with a schema library like Zod or Joi before using them.",
            file: bodyHit.file,
            line: bodyHit.line,
            column: bodyHit.column,
            evidence: bodyHit.evidence,
            confidence: "LOW",
            status: "REVIEW"
        });
    }

    if (passHit) {
        findings.push({
            title: "Possible plaintext password storage",
            severity: "CRITICAL",
            category: "Authentication",
            description: "Found code that appears to save a 'password' field directly from the request, with no hashing library (bcrypt/argon2/scrypt) detected in the files we scanned. This is a heuristic based on pattern matching, not a certainty — please verify manually.",
            fix: "Hash passwords with bcrypt or argon2 before storing them. Never store, log, or return plaintext passwords.",
            file: passHit.file,
            line: passHit.line,
            column: passHit.column,
            evidence: passHit.evidence,
            confidence: "MEDIUM",
            status: "REVIEW"
        });
    }

    if (idorCandidates.length > 0) {
        const idorFilesList = idorCandidates.map(c => c.file);
        const primary = idorCandidates[0];
        findings.push({
            title: "Possible missing ownership check on ID-based route",
            severity: "MEDIUM",
            category: "Access Control",
            description: `Found route(s) using an :id parameter without an obvious ownership check (e.g. req.user, ownerId) nearby, in: ${idorFilesList.slice(0, 5).join(", ")}${idorFilesList.length > 5 ? `, and ${idorFilesList.length - 5} more` : ""}. This is a heuristic and may be a false positive if the check happens elsewhere (e.g. shared middleware) — please verify manually.`,
            fix: "Confirm that any endpoint returning or modifying data by ID also checks that the requesting user actually owns/has access to that specific resource, not just that the ID exists.",
            file: primary.file,
            line: primary.line,
            column: primary.column,
            evidence: primary.evidence,
            confidence: "LOW",
            status: "REVIEW"
        });
    }

    if (unsafeUploads.length > 0) {
        const uploadFilesList = unsafeUploads.map(c => c.file);
        const primary = unsafeUploads[0];
        findings.push({
            title: "File uploads may lack type/size validation",
            severity: "MEDIUM",
            category: "File Upload",
            description: `Found multer usage without an obvious fileFilter or size limit config nearby, in: ${uploadFilesList.slice(0, 5).join(", ")}. Without these, an attacker can upload arbitrarily large files or disguise executable content as an "image."`,
            fix: "Add a fileFilter to restrict accepted MIME types, and set limits: { fileSize: ... } to cap upload size.",
            file: primary.file,
            line: primary.line,
            column: primary.column,
            evidence: primary.evidence,
            confidence: "MEDIUM",
            status: "REVIEW"
        });
    }

    if (debugRouteHits.length > 0) {
        const debugFilesList = debugRouteHits.map(c => c.file);
        const primary = debugRouteHits[0];
        findings.push({
            title: "Debug/test endpoint found in code",
            severity: "HIGH",
            category: "Information Disclosure",
            description: `Found route(s) that look like debug/test/seed endpoints, in: ${debugFilesList.slice(0, 5).join(", ")}. These are common vibe-coded-app leftovers and often skip auth entirely.`,
            fix: "Remove debug/test/seed routes before deploying to production, or gate them behind an environment check that's hard-disabled outside development.",
            file: primary.file,
            line: primary.line,
            column: primary.column,
            evidence: primary.evidence,
            confidence: "MEDIUM",
            status: "REVIEW"
        });
    }

    return findings;
}

// package.json-based check — cheap and reliable, no regex guessing needed.
function checkMissingHelmet(pkg) {
    const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
    if (deps.express && !deps.helmet) {
        return [{
            title: "No helmet middleware detected",
            severity: "MEDIUM",
            category: "Headers",
            description: "This project uses Express but doesn't list helmet as a dependency. Helmet sets a solid baseline of security headers (X-Frame-Options, X-Content-Type-Options, HSTS, etc.) with one line of setup.",
            fix: "npm install helmet, then app.use(helmet()) near the top of your Express app.",
            file: "package.json",
            line: null,
            column: null,
            evidence: "Express dependency present without helmet",
            confidence: "HIGH",
            status: "CONFIRMED"
        }];
    }
    return [];
}

module.exports = { analyzeCodePatterns, checkMissingHelmet };