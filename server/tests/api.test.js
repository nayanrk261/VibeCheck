const assert = require('assert');
const http = require('http');
const express = require('express');
const { validateAuditRequest } = require('../middleware/validate');
const { assertPublicUrl } = require('../lib/ssrfGuard');
const { getSubmissionById, saveSubmission } = require('../lib/submissionStore');
const auditRouter = require('../routes/audit');
const submissionsRouter = require('../routes/submissions');

// Helper to launch in-memory server for API testing
function createTestApp() {
    const app = express();
    app.use(express.json({ limit: '100kb' }));
    app.use('/api', auditRouter);
    app.use('/api', submissionsRouter);
    app.use((err, req, res, next) => {
        res.status(err.status || 500).json({ error: "Something went wrong. Please try again." });
    });
    return app;
}

// HTTP request helper for testing Express endpoints
function makeRequest(server, method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const address = server.address();
        const reqHeaders = { 'Content-Type': 'application/json', ...headers };
        const payload = body ? JSON.stringify(body) : null;
        if (payload) reqHeaders['Content-Length'] = Buffer.byteLength(payload);

        const req = http.request(
            {
                hostname: '127.0.0.1',
                port: address.port,
                path,
                method,
                headers: reqHeaders
            },
            (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    let json = null;
                    try { json = JSON.parse(data); } catch {}
                    resolve({ status: res.statusCode, headers: res.headers, data: json || data });
                });
            }
        );

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runApiTests() {
    console.log("=== Running VibeCheck API, Validation & SSRF Regression Tests ===\n");

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

    const app = createTestApp();
    const server = http.createServer(app);

    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

    try {
        // --- 1. Zod Request Validation Tests ---
        await test("1. Validation: Rejects missing repository and live URL", async () => {
            const res = await makeRequest(server, 'POST', '/api/audit', {});
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.data.error, "Invalid request");
            assert.ok(res.data.details.some(d => d.includes("At least one of repoUrl or liveUrl is required")));
        });

        await test("2. Validation: Rejects invalid GitHub URL domain", async () => {
            const res = await makeRequest(server, 'POST', '/api/audit', { repoUrl: "https://gitlab.com/owner/repo" });
            assert.strictEqual(res.status, 400);
            assert.ok(res.data.details.some(d => d.includes("repoUrl must be a valid github.com repository URL")));
        });

        await test("3. Validation: Rejects malformed live URL", async () => {
            const res = await makeRequest(server, 'POST', '/api/audit', { liveUrl: "not-a-valid-url" });
            assert.strictEqual(res.status, 400);
            assert.ok(res.data.details.some(d => d.includes("Invalid")));
        });

        // --- 2. SSRF Protection Tests ---
        await test("4. SSRF Guard: Rejects localhost targets", async () => {
            await assert.rejects(
                async () => await assertPublicUrl("http://localhost:5000"),
                /cannot be scanned/i
            );
        });

        await test("5. SSRF Guard: Rejects 127.0.0.1 loopback IP", async () => {
            await assert.rejects(
                async () => await assertPublicUrl("http://127.0.0.1/admin"),
                /private or internal address/i
            );
        });

        await test("6. SSRF Guard: Rejects AWS cloud metadata IP (169.254.169.254)", async () => {
            await assert.rejects(
                async () => await assertPublicUrl("http://169.254.169.254/latest/meta-data/"),
                /private or internal address/i
            );
        });

        await test("7. SSRF Guard: Rejects non-HTTP protocols (file://, ftp://)", async () => {
            await assert.rejects(
                async () => await assertPublicUrl("file:///etc/passwd"),
                /Only http:\/\/ and https:\/\/ URLs are allowed/i
            );
        });

        // --- 3. GET /api/submissions/:id Endpoint Tests ---
        await test("8. GET /api/submissions/:id: Returns saved submission", async () => {
            const doc = await saveSubmission({
                repoUrl: 'https://github.com/test/repo',
                scores: { security: { value: 85, status: 'scored' } },
                findings: [{
                    title: 'Test Finding',
                    severity: 'HIGH',
                    category: 'Secrets',
                    file: 'src/app.js',
                    line: 12,
                    column: 5,
                    evidence: 'const k = "[REDACTED]";',
                    confidence: 'HIGH',
                    status: 'CONFIRMED'
                }],
                meta: { filesScanned: 5, secretsFound: 1 }
            });

            const res = await makeRequest(server, 'GET', `/api/submissions/${doc._id}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data._id, doc._id);
            assert.strictEqual(res.data.findings[0].title, 'Test Finding');
            assert.strictEqual(res.data.findings[0].line, 12);
            assert.strictEqual(res.data.findings[0].evidence, 'const k = "[REDACTED]";');
        });

        await test("9. GET /api/submissions/:id: Returns 404 for unknown submission ID", async () => {
            const unknownId = '507f1f77bcf86cd799439011';
            const res = await makeRequest(server, 'GET', `/api/submissions/${unknownId}`);
            assert.strictEqual(res.status, 404);
            assert.strictEqual(res.data.error, "Submission not found");
        });

        await test("10. GET /api/submissions/:id: Returns 404 for unknown/malformed string in memory store", async () => {
            const res = await makeRequest(server, 'GET', '/api/submissions/invalid-id-string');
            assert.strictEqual(res.status, 404);
            assert.strictEqual(res.data.error, "Submission not found");
        });

        // --- 4. End-to-End Audit & Fallback Tests ---
        await test("11. POST /api/audit: Scanner findings, evidence & metadata survive through API response", async () => {
            const github = require('../lib/github');
            const origFetchRepoTree = github.fetchRepoTree;
            const origFetchFileContent = github.fetchFileContent;

            github.fetchRepoTree = async () => [
                { path: 'package.json', type: 'blob' },
                { path: 'src/index.js', type: 'blob' },
                { path: 'src/config.js', type: 'blob' }
            ];
            github.fetchFileContent = async (owner, repo, path) => {
                if (path === 'package.json') return JSON.stringify({ name: 'sample-repo', dependencies: { express: '^4.18.2' } });
                if (path === 'src/config.js') return 'const apiKey = "TEST_MOCK_SECRET_VALUE_1234567890";';
                if (path === 'src/index.js') return 'const express = require("express"); const app = express();';
                return '';
            };

            try {
                const res = await makeRequest(server, 'POST', '/api/audit', {
                    repoUrl: "https://github.com/vibecheck-test/sample-repo",
                    auditMode: "core"
                });

                assert.strictEqual(res.status, 201);
                assert.strictEqual(res.data.success, true);
                assert.ok(res.data.submissionId);
                assert.ok(res.data.scores);
                assert.ok(Array.isArray(res.data.findings));
                assert.ok(res.data.meta);
                assert.strictEqual(typeof res.data.meta.filesScanned, 'number');
                assert.ok(res.data.findings.length > 0, "Expected findings from sample secret in src/config.js");
                assert.strictEqual(res.data.findings[0].file, 'src/config.js');
                assert.ok(res.data.findings[0].evidence, "Evidence snippet should be populated");
            } finally {
                github.fetchRepoTree = origFetchRepoTree;
                github.fetchFileContent = origFetchFileContent;
            }
        });

        await test("12. Persistence Fallback: In-memory store handles submissions when DB disconnected", async () => {
            const doc = await saveSubmission({ repoUrl: 'https://github.com/test/in-memory-fallback' });
            const retrieved = await getSubmissionById(doc._id);
            assert.ok(retrieved);
            assert.strictEqual(retrieved.repoUrl, 'https://github.com/test/in-memory-fallback');
        });

        // --- 5. GET /api/submissions History List Tests ---
        await test("13. GET /api/submissions: Returns recent submissions ordered newest first", async () => {
            const sub1 = await saveSubmission({
                repoUrl: 'https://github.com/test/history-1',
                createdAt: new Date(Date.now() - 100000)
            });
            const sub2 = await saveSubmission({
                repoUrl: 'https://github.com/test/history-2',
                createdAt: new Date(Date.now() + 100000)
            });

            const res = await makeRequest(server, 'GET', '/api/submissions');
            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.data));
            const idx1 = res.data.findIndex(s => s._id === sub1._id);
            const idx2 = res.data.findIndex(s => s._id === sub2._id);
            assert.ok(idx1 !== -1 && idx2 !== -1, "Both test submissions should be present in results");
            assert.ok(idx2 < idx1, "sub2 (newer createdAt) must appear before sub1 (older createdAt)");
        });

        await test("14. GET /api/submissions: Respects limit parameter and rejects invalid limit", async () => {
            const resLimited = await makeRequest(server, 'GET', '/api/submissions?limit=1');
            assert.strictEqual(resLimited.status, 200);
            assert.strictEqual(resLimited.data.length, 1);

            const resInvalid = await makeRequest(server, 'GET', '/api/submissions?limit=invalid');
            assert.strictEqual(resInvalid.status, 400);
            assert.strictEqual(resInvalid.data.error, "Invalid limit parameter");
        });

        await test("15. GET /api/submissions: Does not expose raw findings evidence snippets or secrets", async () => {
            await saveSubmission({
                repoUrl: 'https://github.com/test/sensitive-check',
                findings: [{
                    title: 'Secret Key',
                    severity: 'CRITICAL',
                    evidence: 'SECRET_API_KEY=sk_live_12345'
                }]
            });

            const res = await makeRequest(server, 'GET', '/api/submissions');
            assert.strictEqual(res.status, 200);
            const item = res.data.find(s => s.repoUrl === 'https://github.com/test/sensitive-check');
            assert.ok(item);
            assert.strictEqual(item.findings, undefined, "Raw findings array should not be returned in summary");
            assert.strictEqual(typeof item.findingsCount, 'number');
            assert.strictEqual(item.findingsCount, 1);
        });

    } finally {
        server.close();
    }

    console.log(`\n=== API Test Summary: ${passed} Passed, ${failed} Failed ===`);
    if (failed > 0) process.exit(1);
}

runApiTests().catch(err => {
    console.error("API test error:", err);
    process.exit(1);
});
