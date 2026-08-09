// Heuristic, regex-based checks for common security anti-patterns.
// These are pattern-matching heuristics, not a full static analyzer or a
// dynamic test — they're written to say "this needs a human look," not
// "this is definitely broken," and the fix text says so where the
// confidence is lower (e.g. IDOR, plaintext passwords).

const AUTH_ROUTE_PATTERN = /\.(post|get)\s*\(\s*['"`]\/[^'"`]*(login|signin|sign-in|signup|sign-up|register|reset-?password|forgot-?password|otp)[^'"`]*['"`]/i;
const RATE_LIMIT_USAGE = /express-rate-limit|rateLimit\s*\(/i;
const VALIDATION_LIB_USAGE = /require\(\s*['"`](zod|joi|yup|express-validator)['"`]\s*\)|from\s+['"`](zod|joi|yup|express-validator)['"`]/i;
const BODY_USAGE = /req\.body/;
const HASH_LIB_USAGE = /bcrypt|argon2|scrypt/i;
const PASSWORD_SAVE_SIGNAL = /password\s*[:=]\s*req\.body\.password/i;
const PERSIST_SIGNAL = /\.save\(\)|insertOne|new User|create\(/i;
const ID_PARAM_ROUTE = /\.(get|put|delete|patch)\s*\(\s*['"`][^'"`]*:id[^'"`]*['"`]/i;
const OWNERSHIP_CHECK = /req\.user|ownerId|userId\s*===|\.owner\b/i;
const MULTER_USAGE = /multer\s*\(/i;
const MULTER_SAFETY_CONFIG = /fileFilter\s*:|limits\s*:\s*\{[^}]*fileSize/is;
const DEBUG_ROUTE_PATTERN = /\.(get|post)\s*\(\s*['"`]\/(test|debug|seed-?data|admin-?backdoor|internal|__test)[^'"`]*['"`]/i;

function analyzeCodePatterns(fileContents) {
    let hasAuthRoute = false;
    let hasRateLimit = false;
    let hasValidationLib = false;
    let hasBodyUsage = false;
    let hasPlaintextPasswordSignal = false;
    const idorCandidateFiles = [];
    const unsafeUploadFiles = [];
    const debugRouteFiles = [];

    for (const { path, content } of fileContents) {
        if (typeof content !== "string") continue;

        if (AUTH_ROUTE_PATTERN.test(content)) hasAuthRoute = true;
        if (RATE_LIMIT_USAGE.test(content)) hasRateLimit = true;
        if (VALIDATION_LIB_USAGE.test(content)) hasValidationLib = true;
        if (BODY_USAGE.test(content)) hasBodyUsage = true;

        if (PASSWORD_SAVE_SIGNAL.test(content) && !HASH_LIB_USAGE.test(content) && PERSIST_SIGNAL.test(content)) {
            hasPlaintextPasswordSignal = true;
        }

        if (ID_PARAM_ROUTE.test(content) && !OWNERSHIP_CHECK.test(content)) {
            idorCandidateFiles.push(path);
        }

        if (MULTER_USAGE.test(content) && !MULTER_SAFETY_CONFIG.test(content)) {
            unsafeUploadFiles.push(path);
        }

        if (DEBUG_ROUTE_PATTERN.test(content)) {
            debugRouteFiles.push(path);
        }
    }

    const findings = [];

    if (hasAuthRoute && !hasRateLimit) {
        findings.push({
            title: "No rate limiting detected on auth routes",
            severity: "HIGH",
            category: "Abuse Prevention",
            description: "Found what looks like a login/signup/password-reset route, but no rate-limiting library (e.g. express-rate-limit) anywhere in the files we scanned. Without it, these endpoints are open to brute-force and credential-stuffing attacks.",
            fix: "Add express-rate-limit (or equivalent) to auth routes — a common baseline is 5 attempts/minute on login, 3/hour on password reset."
        });
    }

    if (hasBodyUsage && !hasValidationLib) {
        findings.push({
            title: "No input validation library detected",
            severity: "MEDIUM",
            category: "Input Validation",
            description: "Route handlers read from req.body, but no schema validation library (Zod, Joi, Yup, express-validator) was found in the files we scanned. Unvalidated input increases the risk of injection, type-confusion bugs, and malformed data reaching your database.",
            fix: "Validate and sanitize incoming request bodies with a schema library like Zod or Joi before using them."
        });
    }

    if (hasPlaintextPasswordSignal) {
        findings.push({
            title: "Possible plaintext password storage",
            severity: "CRITICAL",
            category: "Authentication",
            description: "Found code that appears to save a 'password' field directly from the request, with no hashing library (bcrypt/argon2/scrypt) detected in the files we scanned. This is a heuristic based on pattern matching, not a certainty — please verify manually.",
            fix: "Hash passwords with bcrypt or argon2 before storing them. Never store, log, or return plaintext passwords."
        });
    }

    if (idorCandidateFiles.length > 0) {
        findings.push({
            title: "Possible missing ownership check on ID-based route",
            severity: "MEDIUM",
            category: "Access Control",
            description: `Found route(s) using an :id parameter without an obvious ownership check (e.g. req.user, ownerId) nearby, in: ${idorCandidateFiles.slice(0, 5).join(", ")}${idorCandidateFiles.length > 5 ? `, and ${idorCandidateFiles.length - 5} more` : ""}. This is a heuristic and may be a false positive if the check happens elsewhere (e.g. shared middleware) — please verify manually.`,
            fix: "Confirm that any endpoint returning or modifying data by ID also checks that the requesting user actually owns/has access to that specific resource, not just that the ID exists."
        });
    }

    if (unsafeUploadFiles.length > 0) {
        findings.push({
            title: "File uploads may lack type/size validation",
            severity: "MEDIUM",
            category: "File Upload",
            description: `Found multer usage without an obvious fileFilter or size limit config nearby, in: ${unsafeUploadFiles.slice(0, 5).join(", ")}. Without these, an attacker can upload arbitrarily large files or disguise executable content as an "image."`,
            fix: "Add a fileFilter to restrict accepted MIME types, and set limits: { fileSize: ... } to cap upload size."
        });
    }

    if (debugRouteFiles.length > 0) {
        findings.push({
            title: "Debug/test endpoint found in code",
            severity: "HIGH",
            category: "Information Disclosure",
            description: `Found route(s) that look like debug/test/seed endpoints, in: ${debugRouteFiles.slice(0, 5).join(", ")}. These are common vibe-coded-app leftovers and often skip auth entirely.`,
            fix: "Remove debug/test/seed routes before deploying to production, or gate them behind an environment check that's hard-disabled outside development."
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
            fix: "npm install helmet, then app.use(helmet()) near the top of your Express app."
        }];
    }
    return [];
}

module.exports = { analyzeCodePatterns, checkMissingHelmet };