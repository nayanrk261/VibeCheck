const assert = require('assert');
const { scanRepo } = require('../lib/scanner');
const { maskComments } = require('../lib/evidenceUtils');

async function runCommentTests() {
    console.log("=== Running Comment-Aware Matching Tests ===\n");

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

    // Test 1: Pattern appearing ONLY inside a comment -> no finding
    await test("1. Pattern appearing only inside a comment generates no finding", async () => {
        const mockFiles = [{ path: "src/comment_only.js" }];
        const mockFetch = async () => `
            // TODO: sk-123456789012345678901234567890123456789012345678
            /* eval(userInput) */
            // cors({ origin: '*' })
        `;

        const result = await scanRepo(mockFiles, mockFetch, "owner", "repo");
        const secrets = result.findings.filter(f => f.category === "Secrets" && f.title !== "Security TODO");
        const evalHit = result.findings.find(f => f.title === "Dangerous eval()");
        const corsHit = result.findings.find(f => f.title === "CORS Wildcard");

        assert.strictEqual(secrets.length, 0, "Secrets inside comments must be ignored");
        assert.strictEqual(evalHit, undefined, "eval() inside comments must be ignored");
        assert.strictEqual(corsHit, undefined, "CORS wildcard inside comments must be ignored");
    });

    // Test 2: Pattern appearing in executable code -> finding
    await test("2. Pattern appearing in executable code generates finding", async () => {
        const mockFiles = [{ path: "src/code.js" }];
        const mockFetch = async () => `const res = eval(userCode);`;

        const result = await scanRepo(mockFiles, mockFetch, "owner", "repo");
        const evalHit = result.findings.find(f => f.title === "Dangerous eval()");
        assert.ok(evalHit, "eval() in executable code must be detected");
    });

    // Test 3: Comment before executable occurrence -> executable occurrence gets correct line
    await test("3. Comment before executable occurrence preserves correct line/column", async () => {
        const mockFiles = [{ path: "src/app.js" }];
        const mockFetch = async () => `// Line 1: // eval(old)\n// Line 2\nconst res = eval(newCode);\n`;

        const result = await scanRepo(mockFiles, mockFetch, "owner", "repo");
        const evalHit = result.findings.find(f => f.title === "Dangerous eval()");
        assert.ok(evalHit);
        assert.strictEqual(evalHit.line, 3, "Should point to line 3, not line 1 comment");
        assert.strictEqual(evalHit.file, "src/app.js");
    });

    // Test 4: Multi-line comment containing pattern -> ignored
    await test("4. Multi-line comment containing pattern is ignored", async () => {
        const mockFiles = [{ path: "src/multiline.js" }];
        const mockFetch = async () => `/*\n * eval(danger)\n * sk-123456789012345678901234567890123456789012345678\n */\nconsole.log('clean');`;

        const result = await scanRepo(mockFiles, mockFetch, "owner", "repo");
        const evalHit = result.findings.find(f => f.title === "Dangerous eval()");
        const secretHits = result.findings.filter(f => f.category === "Secrets" && f.title !== "Security TODO");

        assert.strictEqual(evalHit, undefined);
        assert.strictEqual(secretHits.length, 0);
    });

    // Test 5: String literals should NOT be incorrectly treated as comments
    await test("5. String literals and URLs are not treated as comments", async () => {
        const code = `const url = "https://example.com/api//v1";\nconst key = "sk-123456789012345678901234567890123456789012345678";`;
        const masked = maskComments(code);

        assert.ok(masked.includes("https://example.com/api//v1"), "URL slashes inside strings must NOT be masked");
        assert.ok(masked.includes("sk-123456789012345678901234567890123456789012345678"), "Secrets inside quotes must NOT be masked");

        const mockFiles = [{ path: "src/strings.js" }];
        const result = await scanRepo(mockFiles, async () => code, "owner", "repo");
        const keyHit = result.findings.find(f => f.title === "OpenAI API Key");
        assert.ok(keyHit, "Secret inside string literal must still be detected");
    });

    console.log(`\n=== Comment Test Summary: ${passed} Passed, ${failed} Failed ===`);
    if (failed > 0) process.exit(1);
}

runCommentTests().catch(err => {
    console.error("Comment test failure:", err);
    process.exit(1);
});
