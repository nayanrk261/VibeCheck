const assert = require('assert');
const { scanRepo } = require('../lib/scanner');
const { fetchRepoTree, detectTechStack, isRelevantFile } = require('../lib/github');
const { scoreSecurity, scorePerformance, computeOverall } = require('../lib/scoring');

async function testPipeline() {
    console.log("=== Running End-to-End Audit Pipeline Verification ===");

    // Simulate 25 files in a repo
    const mockTree = [];
    for (let i = 1; i <= 25; i++) {
        mockTree.push({ path: `server/controllers/controller_${i}.js`, type: 'blob', size: 1200 });
    }
    mockTree.push({ path: 'package.json', type: 'blob', size: 400 });
    mockTree.push({ path: '.env.example', type: 'blob', size: 150 });
    mockTree.push({ path: 'node_modules/express/index.js', type: 'blob', size: 5000 });
    mockTree.push({ path: 'dist/app.bundle.js', type: 'blob', size: 50000 });

    const mockFetchContent = async (owner, repo, filepath) => {
        if (filepath === 'package.json') return JSON.stringify({ dependencies: { express: "^4.18.2" } });
        if (filepath === '.env.example') return "API_KEY=sk-proj12345678901234567890";
        if (filepath.includes('controller_1.js')) return "const token = 'sk-123456789012345678901234567890123456789012345678';";
        return "// clean file content";
    };

    const selectedFiles = mockTree.filter(f => isRelevantFile(f.path));
    const techStack = detectTechStack(selectedFiles);
    const scanData = await scanRepo(selectedFiles, mockFetchContent, "testowner", "testrepo");

    assert.strictEqual(scanData.filesScanned, 27); // 25 controllers + package.json + .env.example
    assert.strictEqual(scanData.meta.filesSkipped, 0);
    assert.ok(scanData.findings.some(f => f.title === "OpenAI API Key"));
    assert.ok(scanData.findings.some(f => f.title === "Real Values in .env.example"));

    const coreFindings = scanData.findings.map(f => ({ ...f, track: "core" }));
    const security = scoreSecurity(coreFindings, true, false);
    const performance = scorePerformance({ responseTime: null, error: false });
    const overall = computeOverall(security.value, performance.value);

    assert.ok(typeof security.value === 'number');
    assert.ok(security.value < 100, "Security score reflects CRITICAL secret finding");

    console.log("Pipeline E2E Check Output:");
    console.log("- Tech Stack Detected:", techStack);
    console.log("- Files Scanned:", scanData.filesScanned);
    console.log("- Secrets Found:", scanData.secrets.length);
    console.log("- Core Findings Count:", coreFindings.length);
    console.log("- Computed Security Score:", security.value);
    console.log("- Audit Status:", overall !== null ? "scored" : "insufficient_data");
    console.log("✔ End-to-End Pipeline Verification Passed!");
}

testPipeline().catch(err => {
    console.error("Pipeline E2E failed:", err);
    process.exit(1);
});
