const assert = require('assert');
const { scanRepo } = require('../lib/scanner');
const { checkDependencies } = require('../lib/dependencyCheck');
const { mapHeaderFindings } = require('../lib/findings');
const { getLineAndColumn, getEvidenceSnippet, redactEvidence } = require('../lib/evidenceUtils');
const { scoreSecurity } = require('../lib/scoring');

async function runEvidenceTests() {
    console.log("=== Running VibeCheck Evidence & Location Tests (P1-B) ===\n");

    let passed = 0;
    let failed = 0;

    const test = async (name, fn) => {
        try {
            await fn();
            console.log(`✔ PASS: ${name}`);
            passed++;
        } catch (err) {
            console.error(`✘ FAIL: ${name}`);
            console.error(err);
            failed++;
        }
    };

    // Test 1: File path accuracy
    await test("1. Finding gets correct file path", async () => {
        const mockFiles = [{ path: "src/services/paymentService.ts" }];
        const mockFetch = async () => `const key = "sk-123456789012345678901234567890123456789012345678";`;

        const result = await scanRepo(mockFiles, mockFetch, "o", "r");
        const finding = result.findings.find(f => f.title === "OpenAI API Key");
        assert.ok(finding, "OpenAI API Key finding should be present");
        assert.strictEqual(finding.file, "src/services/paymentService.ts");
    });

    // Test 2: 1-based line number calculation
    await test("2. Known match gets correct 1-based line number", async () => {
        const content = `// Line 1\n// Line 2\nconst key = "sk-123456789012345678901234567890123456789012345678";\n// Line 4`;
        const offset = content.indexOf('sk-');
        const { line, column } = getLineAndColumn(content, offset);

        assert.strictEqual(line, 3, "Should be on line 3");
        assert.strictEqual(column, 14, "Should be at column 14 (after 'const key = \"')");
    });

    // Test 3: Column calculation
    await test("3. Column is calculated correctly", async () => {
        const content = `abc\ndefg`;
        const { line, column } = getLineAndColumn(content, 4); // 'd' in 'defg'
        assert.strictEqual(line, 2);
        assert.strictEqual(column, 1);
    });

    // Test 4: Evidence snippet extraction
    await test("4. Evidence snippet is short and relevant", async () => {
        const content = `function test() {\n    console.log("secret:", "sk-123456789012345678901234567890123456789012345678");\n}`;
        const offset = content.indexOf('sk-');
        const snippet = getEvidenceSnippet(content, offset);
        assert.ok(snippet.includes("console.log"));
        assert.ok(!snippet.includes("function test()"), "Snippet should not include other lines");
    });

    // Test 5: Secret redaction
    await test("5. Secret evidence is redacted", async () => {
        const rawSecret = `const OPENAI_KEY = "sk-123456789012345678901234567890123456789012345678";`;
        const redacted = redactEvidence(rawSecret);
        assert.ok(!redacted.includes("sk-123456789012345678901234567890123456789012345678"), "Raw secret must NOT be present");
        assert.ok(redacted.includes("sk-[REDACTED]") || redacted.includes("[REDACTED]"));
    });

    // Test 6: Controlled confidence values
    await test("6. Confidence is one of allowed values (HIGH, MEDIUM, LOW)", async () => {
        const mockFiles = [{ path: "src/auth.js" }];
        const mockFetch = async () => `// TODO: fix auth security\nconst key = "sk-123456789012345678901234567890123456789012345678";`;

        const result = await scanRepo(mockFiles, mockFetch, "o", "r");
        const validConfidences = new Set(["HIGH", "MEDIUM", "LOW"]);
        for (const f of result.findings) {
            assert.ok(validConfidences.has(f.confidence), `Confidence ${f.confidence} must be HIGH, MEDIUM, or LOW`);
        }
    });

    // Test 7: Controlled status values
    await test("7. Status is one of allowed values (CONFIRMED, REVIEW)", async () => {
        const mockFiles = [{ path: "src/auth.js" }];
        const mockFetch = async () => `const key = "sk-123456789012345678901234567890123456789012345678";`;

        const result = await scanRepo(mockFiles, mockFetch, "o", "r");
        const validStatuses = new Set(["CONFIRMED", "REVIEW"]);
        for (const f of result.findings) {
            assert.ok(validStatuses.has(f.status), `Status ${f.status} must be CONFIRMED or REVIEW`);
        }
    });

    // Test 8: Dependency findings do not invent line numbers
    await test("8. Dependency findings keep line/column null", async () => {
        const depFindings = await checkDependencies({ express: "4.17.1" });
        for (const f of depFindings) {
            assert.strictEqual(f.file, "package.json");
            assert.strictEqual(f.line, null, "Dependency line should be null");
            assert.strictEqual(f.column, null, "Dependency column should be null");
            assert.ok(f.evidence.includes("Package: express"), "Evidence should describe package");
            assert.strictEqual(f.confidence, "HIGH");
            assert.strictEqual(f.status, "CONFIRMED");
        }
    });

    // Test 9: Header findings do not invent source locations
    await test("9. Header findings keep file/line/column null", async () => {
        const mockHeaderData = {
            error: false,
            findings: [{ type: "Missing Security Header", header: "X-Frame-Options", severity: "MEDIUM", description: "Missing X-Frame-Options", fix: "Add header" }]
        };
        const mapped = mapHeaderFindings(mockHeaderData);
        assert.strictEqual(mapped.length, 1);
        assert.strictEqual(mapped[0].file, null);
        assert.strictEqual(mapped[0].line, null);
        assert.strictEqual(mapped[0].column, null);
        assert.strictEqual(mapped[0].evidence, "Missing X-Frame-Options response header");
        assert.strictEqual(mapped[0].confidence, "HIGH");
        assert.strictEqual(mapped[0].status, "CONFIRMED");
    });

    // Test 10: Existing scoring still works
    await test("10. Existing scoring algorithm still works with enhanced findings", async () => {
        const findings = [
            { category: "Secrets", severity: "CRITICAL" },
            { category: "Headers", severity: "MEDIUM" }
        ];
        const scoreRes = scoreSecurity(findings, true, true);
        assert.strictEqual(scoreRes.value, 100 - 30 - 8); // 62
        assert.strictEqual(scoreRes.status, "scored");
    });

    // Test 11: Complete audit pipeline works
    await test("11. Audit pipeline works and findings are not lost", async () => {
        const mockFiles = [
            { path: "src/server.js" },
            { path: "package.json" }
        ];
        const mockFetch = async (owner, repo, filepath) => {
            if (filepath === "package.json") return JSON.stringify({ dependencies: { express: "^4.18.2" } });
            return `app.post('/login', (req, res) => { eval(req.body.code); });`;
        };

        const result = await scanRepo(mockFiles, mockFetch, "owner", "repo");
        assert.ok(result.findings.length > 0, "Findings should be discovered");
        assert.ok(result.findings.every(f => f.title && f.severity && f.category), "All findings must keep title, severity, category");
    });

    console.log(`\n=== Test Summary: ${passed} Passed, ${failed} Failed ===`);
    if (failed > 0) {
        process.exit(1);
    }
}

runEvidenceTests().catch(err => {
    console.error("Evidence test execution error:", err);
    process.exit(1);
});
