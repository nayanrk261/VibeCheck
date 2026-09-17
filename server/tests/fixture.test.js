const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { scanRepo } = require('../lib/scanner');
const { checkDependencies } = require('../lib/dependencyCheck');

async function runFixtureTests() {
    console.log("==========================================================");
    console.log("   VibeCheck Local Security Fixture Test Suite (Phase 2)  ");
    console.log("==========================================================\n");

    const fixturesDir = path.join(__dirname, 'fixtures');

    // Helper to read fixture content
    const getFixtureFile = (relPath) => {
        const fullPath = path.join(fixturesDir, relPath);
        return fs.readFileSync(fullPath, 'utf8');
    };

    const resultsTable = [];

    const recordResult = (fixture, expectedFinding, detected, locationOk, evidenceOk, severity, confidence, status, classification, notes = "") => {
        resultsTable.push({
            fixture,
            expectedFinding,
            detected: detected ? "YES" : "NO",
            locationOk: locationOk ? "YES" : (locationOk === false ? "NO" : "N/A"),
            evidenceOk: evidenceOk ? "YES" : (evidenceOk === false ? "NO" : "N/A"),
            severity: severity || "N/A",
            confidence: confidence || "N/A",
            status: status || "N/A",
            classification,
            notes
        });
    };

    // -------------------------------------------------------------
    // FIXTURE 1: Hardcoded Secret (OpenAI API Key & AWS Key)
    // -------------------------------------------------------------
    console.log("--> Testing Fixture 1: Hardcoded Secret...");
    const secretContent = getFixtureFile('fixture_secret.js');
    const secretScan = await scanRepo(
        [{ path: 'fixture_secret.js' }],
        async () => secretContent,
        'owner', 'repo'
    );

    const openAiFinding = secretScan.findings.find(f => f.title === "OpenAI API Key");
    const awsFinding = secretScan.findings.find(f => f.title === "AWS API Key");

    if (openAiFinding) {
        const locOk = openAiFinding.file === 'fixture_secret.js' && openAiFinding.line === 2 && openAiFinding.column === 25;
        const evOk = openAiFinding.evidence.includes('[REDACTED]') && !openAiFinding.evidence.includes('sk-000000');
        recordResult(
            'fixture_secret.js',
            'OpenAI API Key',
            true,
            locOk,
            evOk,
            openAiFinding.severity,
            openAiFinding.confidence,
            openAiFinding.status,
            'TRUE POSITIVE',
            `Line: ${openAiFinding.line}, Col: ${openAiFinding.column}, Ev: "${openAiFinding.evidence}"`
        );
    } else {
        recordResult('fixture_secret.js', 'OpenAI API Key', false, false, false, null, null, null, 'FALSE NEGATIVE');
    }

    if (awsFinding) {
        const locOk = awsFinding.file === 'fixture_secret.js' && awsFinding.line === 3;
        const evOk = awsFinding.evidence.includes('[REDACTED]') && !awsFinding.evidence.includes('AKIA000000');
        recordResult(
            'fixture_secret.js',
            'AWS API Key',
            true,
            locOk,
            evOk,
            awsFinding.severity,
            awsFinding.confidence,
            awsFinding.status,
            'TRUE POSITIVE',
            `Line: ${awsFinding.line}, Col: ${awsFinding.column}, Ev: "${awsFinding.evidence}"`
        );
    } else {
        recordResult('fixture_secret.js', 'AWS API Key', false, false, false, null, null, null, 'FALSE NEGATIVE');
    }

    // -------------------------------------------------------------
    // FIXTURE 2: Dangerous eval()
    // -------------------------------------------------------------
    console.log("--> Testing Fixture 2: Dangerous eval()...");
    const evalContent = getFixtureFile('fixture_eval.js');
    const evalScan = await scanRepo(
        [{ path: 'fixture_eval.js' }],
        async () => evalContent,
        'owner', 'repo'
    );

    const evalFinding = evalScan.findings.find(f => f.title === "Dangerous eval()");
    if (evalFinding) {
        const locOk = evalFinding.file === 'fixture_eval.js' && evalFinding.line === 9;
        const evOk = evalFinding.evidence.includes('eval(userInput)');
        recordResult(
            'fixture_eval.js',
            'Dangerous eval()',
            true,
            locOk,
            evOk,
            evalFinding.severity,
            evalFinding.confidence,
            evalFinding.status,
            'TRUE POSITIVE',
            `Line: ${evalFinding.line}, Col: ${evalFinding.column}, Ev: "${evalFinding.evidence}"`
        );
    } else {
        recordResult('fixture_eval.js', 'Dangerous eval()', false, false, false, null, null, null, 'FALSE NEGATIVE');
    }

    // -------------------------------------------------------------
    // FIXTURE 3: Wildcard CORS
    // -------------------------------------------------------------
    console.log("--> Testing Fixture 3: Wildcard CORS...");
    const corsContent = getFixtureFile('fixture_cors.js');
    const corsScan = await scanRepo(
        [{ path: 'fixture_cors.js' }],
        async () => corsContent,
        'owner', 'repo'
    );

    const corsFinding = corsScan.findings.find(f => f.title === "CORS Wildcard");
    if (corsFinding) {
        const locOk = corsFinding.file === 'fixture_cors.js' && corsFinding.line === 5;
        const evOk = corsFinding.evidence.includes("origin: '*'");
        recordResult(
            'fixture_cors.js',
            'CORS Wildcard',
            true,
            locOk,
            evOk,
            corsFinding.severity,
            corsFinding.confidence,
            corsFinding.status,
            'TRUE POSITIVE',
            `Line: ${corsFinding.line}, Col: ${corsFinding.column}, Ev: "${corsFinding.evidence}"`
        );
    } else {
        recordResult('fixture_cors.js', 'CORS Wildcard', false, false, false, null, null, null, 'FALSE NEGATIVE');
    }

    // -------------------------------------------------------------
    // FIXTURE 4: Weak Authentication Pattern
    // -------------------------------------------------------------
    console.log("--> Testing Fixture 4: Weak Auth Pattern...");
    const authContent = getFixtureFile('fixture_weak_auth.js');
    const authScan = await scanRepo(
        [{ path: 'fixture_weak_auth.js' }],
        async () => authContent,
        'owner', 'repo'
    );

    const rateLimitFinding = authScan.findings.find(f => f.title === "No rate limiting detected on auth routes");
    const plaintextPassFinding = authScan.findings.find(f => f.title === "Possible plaintext password storage");

    if (rateLimitFinding) {
        const locOk = rateLimitFinding.file === 'fixture_weak_auth.js' && rateLimitFinding.line === 5;
        const evOk = rateLimitFinding.evidence.includes("/api/login");
        recordResult(
            'fixture_weak_auth.js',
            'No rate limiting on auth routes',
            true,
            locOk,
            evOk,
            rateLimitFinding.severity,
            rateLimitFinding.confidence,
            rateLimitFinding.status,
            'TRUE POSITIVE',
            `Line: ${rateLimitFinding.line}, Ev: "${rateLimitFinding.evidence}"`
        );
    } else {
        recordResult('fixture_weak_auth.js', 'No rate limiting on auth routes', false, false, false, null, null, null, 'FALSE NEGATIVE');
    }

    if (plaintextPassFinding) {
        const locOk = plaintextPassFinding.file === 'fixture_weak_auth.js' && plaintextPassFinding.line === 7;
        const evOk = plaintextPassFinding.evidence.includes("password");
        recordResult(
            'fixture_weak_auth.js',
            'Possible plaintext password storage',
            true,
            locOk,
            evOk,
            plaintextPassFinding.severity,
            plaintextPassFinding.confidence,
            plaintextPassFinding.status,
            'TRUE POSITIVE',
            `Line: ${plaintextPassFinding.line}, Ev: "${plaintextPassFinding.evidence}"`
        );
    } else {
        recordResult('fixture_weak_auth.js', 'Possible plaintext password storage', false, false, false, null, null, null, 'FALSE NEGATIVE');
    }

    // -------------------------------------------------------------
    // FIXTURE 5: Missing Input Validation
    // -------------------------------------------------------------
    console.log("--> Testing Fixture 5: Missing Input Validation...");
    const valContent = getFixtureFile('fixture_missing_validation.js');
    const valScan = await scanRepo(
        [{ path: 'fixture_missing_validation.js' }],
        async () => valContent,
        'owner', 'repo'
    );

    const valFinding = valScan.findings.find(f => f.title === "Unvalidated request body usage" || f.title === "No input validation library detected");
    if (valFinding) {
        const locOk = valFinding.file === 'fixture_missing_validation.js' && valFinding.line === 5;
        const evOk = valFinding.evidence.includes("req.body");
        recordResult(
            'fixture_missing_validation.js',
            'Unvalidated request body usage',
            true,
            locOk,
            evOk,
            valFinding.severity,
            valFinding.confidence,
            valFinding.status,
            'TRUE POSITIVE',
            `Line: ${valFinding.line}, Ev: "${valFinding.evidence}"`
        );
    } else {
        recordResult('fixture_missing_validation.js', 'Unvalidated request body usage', false, false, false, null, null, null, 'FALSE NEGATIVE');
    }

    // -------------------------------------------------------------
    // FIXTURE 6: Vulnerable Dependency (package.json OSV integration)
    // -------------------------------------------------------------
    console.log("--> Testing Fixture 6: Vulnerable Dependency...");
    const depFindings = await checkDependencies({ express: "4.17.1" });
    const expressVuln = depFindings.find(f => f.title.includes("express"));

    if (expressVuln) {
        const locOk = expressVuln.file === 'package.json' && expressVuln.line === null && expressVuln.column === null;
        const evOk = expressVuln.evidence.includes("express@4.17.1") && expressVuln.evidence.includes("Advisories:");
        recordResult(
            'package.json',
            'Vulnerable dependency: express',
            true,
            locOk,
            evOk,
            expressVuln.severity,
            expressVuln.confidence,
            expressVuln.status,
            'TRUE POSITIVE',
            `File: ${expressVuln.file}, Line: null, Ev: "${expressVuln.evidence}"`
        );
    } else {
        recordResult('package.json', 'Vulnerable dependency: express', false, false, false, null, null, null, 'FALSE NEGATIVE');
    }

    // -------------------------------------------------------------
    // FIXTURE 7: Exposed Configuration (.env in repo without .gitignore)
    // -------------------------------------------------------------
    console.log("--> Testing Fixture 7: Exposed Configuration (.env without .gitignore)...");
    const envScan = await scanRepo(
        [{ path: '.env', size: 100 }],
        async () => "DB_PASSWORD=secret",
        'owner', 'repo'
    );

    const envFinding = envScan.findings.find(f => f.title === ".env file may be committed to the repository");
    if (envFinding) {
        const locOk = envFinding.file === '.env' && envFinding.line === 1;
        const evOk = envFinding.evidence.includes('.env');
        recordResult(
            '.env (repo)',
            '.env committed without .gitignore',
            true,
            locOk,
            evOk,
            envFinding.severity,
            envFinding.confidence,
            envFinding.status,
            'TRUE POSITIVE',
            `Ev: "${envFinding.evidence}"`
        );
    } else {
        recordResult('.env (repo)', '.env committed without .gitignore', false, false, false, null, null, null, 'FALSE NEGATIVE');
    }

    // -------------------------------------------------------------
    // FIXTURE 8: Clean Repository
    // -------------------------------------------------------------
    console.log("--> Testing Fixture 8: Clean Application...");
    const cleanIndexContent = getFixtureFile('fixture_clean_app/index.js');
    const cleanPkgContent = getFixtureFile('fixture_clean_app/package.json');
    const cleanGitignoreContent = getFixtureFile('fixture_clean_app/.gitignore');

    const cleanFiles = [
        { path: 'index.js' },
        { path: 'package.json' },
        { path: '.gitignore' }
    ];

    const cleanFetch = async (owner, repo, filepath) => {
        if (filepath === 'index.js') return cleanIndexContent;
        if (filepath === 'package.json') return cleanPkgContent;
        if (filepath === '.gitignore') return cleanGitignoreContent;
        return '';
    };

    const cleanScan = await scanRepo(cleanFiles, cleanFetch, 'owner', 'repo');
    const unexpectedFindings = cleanScan.findings;

    if (unexpectedFindings.length === 0) {
        recordResult(
            'fixture_clean_app/',
            'Clean App (No security findings)',
            true,
            true,
            true,
            'NONE',
            'N/A',
            'N/A',
            'TRUE NEGATIVE (Clean)',
            'Zero false positives generated!'
        );
    } else {
        for (const f of unexpectedFindings) {
            recordResult(
                'fixture_clean_app/',
                `Unexpected: ${f.title}`,
                true,
                false,
                false,
                f.severity,
                f.confidence,
                f.status,
                'FALSE POSITIVE',
                `False positive finding detected: ${f.title}`
            );
        }
    }

    // Print Detailed Results Summary Table
    console.log("\n========================================================================================================================");
    console.log("                                        FIXTURE TEST RESULTS TABLE                                                      ");
    console.log("========================================================================================================================");
    console.table(resultsTable);

    const totalCount = resultsTable.length;
    const truePositives = resultsTable.filter(r => r.classification === 'TRUE POSITIVE').length;
    const falsePositives = resultsTable.filter(r => r.classification === 'FALSE POSITIVE').length;
    const falseNegatives = resultsTable.filter(r => r.classification === 'FALSE NEGATIVE').length;
    const cleanPasses = resultsTable.filter(r => r.classification === 'TRUE NEGATIVE (Clean)').length;

    console.log(`\nSummary: ${totalCount} Checks Run | True Positives: ${truePositives} | Clean Pass: ${cleanPasses} | False Positives: ${falsePositives} | False Negatives: ${falseNegatives}`);
    
    if (falsePositives > 0 || falseNegatives > 0) {
        console.error("Fixture test completed with discrepancies (reported honestly above).");
    } else {
        console.log("✔ ALL FIXTURE TESTS PASSED WITH 100% ACCURACY!");
    }
}

runFixtureTests().catch(err => {
    console.error("Fixture test execution error:", err);
    process.exit(1);
});
