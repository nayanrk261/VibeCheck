const assert = require('assert');
const { scanRepo, MAX_FILE_SIZE, MAX_TOTAL_BYTES, MAX_SCANNED_FILES } = require('../lib/scanner');
const { isRelevantFile, detectTechStack } = require('../lib/github');

async function runTests() {
    console.log("=== Running VibeCheck Scanner Tests (P1-A) ===\n");

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

    // Test 1: Normal JS/TS repository scanning
    await test("1. Normal JS/TS repository is scanned", async () => {
        const mockFiles = [
            { path: "src/index.ts" },
            { path: "src/auth/login.js" },
            { path: "package.json" }
        ];

        const mockFetch = async (owner, repo, filepath) => {
            if (filepath === "package.json") return JSON.stringify({ dependencies: { express: "^4.18.2" } });
            if (filepath === "src/auth/login.js") return `const secret = "sk-123456789012345678901234567890123456789012345678";`;
            return `console.log("hello");`;
        };

        const result = await scanRepo(mockFiles, mockFetch, "owner", "repo");
        assert.strictEqual(result.filesScanned, 3);
        assert.strictEqual(result.meta.filesSelected, 3);
        assert.strictEqual(result.meta.filesSkipped, 0);
        assert.ok(result.findings.some(f => f.title === "OpenAI API Key"));
    });

    // Test 2: More than 20 relevant files scanned
    await test("2. More than 20 relevant files can now be scanned", async () => {
        const mockFiles = [];
        for (let i = 1; i <= 35; i++) {
            mockFiles.push({ path: `src/component_${i}.tsx` });
        }

        const mockFetch = async (owner, repo, filepath) => `// File ${filepath}`;

        const result = await scanRepo(mockFiles, mockFetch, "owner", "repo");
        assert.strictEqual(result.filesScanned, 35);
        assert.strictEqual(result.meta.filesSelected, 35);
        assert.strictEqual(result.meta.filesSkipped, 0);
        assert.ok(result.filesScanned > 20, "Should scan more than 20 files");
    });

    // Test 3: Ignored directories are not scanned
    await test("3. Ignored directories are not selected/scanned", async () => {
        const ignoredPaths = [
            "node_modules/express/index.js",
            ".git/config",
            "dist/bundle.js",
            "build/app.js",
            "coverage/lcov-report/index.html",
            "vendor/autoload.php",
            "__pycache__/app.cpython-310.pyc",
            ".venv/lib/python3.10/site-packages/pkg.py",
            ".next/server/pages/index.js",
            "target/release/app"
        ];

        for (const p of ignoredPaths) {
            assert.strictEqual(isRelevantFile(p), false, `Path ${p} should be ignored`);
        }

        const validPaths = [
            "src/index.js",
            "server/controllers/userController.js",
            "lib/vendor_utils.js" // Note: file named vendor_utils.js, not in vendor/ folder
        ];

        for (const p of validPaths) {
            assert.strictEqual(isRelevantFile(p), true, `Path ${p} should be allowed`);
        }
    });

    // Test 4: Large files are skipped safely
    await test("4. Large files are skipped safely", async () => {
        const largeContent = "A".repeat(600 * 1024); // 600 KB
        const mockFiles = [
            { path: "src/normal.js" },
            { path: "src/large_data.js", size: 600 * 1024 }
        ];

        const mockFetch = async (owner, repo, filepath) => {
            if (filepath === "src/large_data.js") return largeContent;
            return `console.log("normal");`;
        };

        const result = await scanRepo(mockFiles, mockFetch, "owner", "repo");
        assert.strictEqual(result.filesScanned, 1);
        assert.strictEqual(result.meta.filesSkipped, 1);
        assert.strictEqual(result.meta.skipReasons.file_too_large, 1);
        assert.strictEqual(result.meta.skippedFiles[0].reason, "file_too_large");
    });

    // Test 5: Unsupported / binary files do not crash scanner
    await test("5. Unsupported/binary files do not crash the scanner", async () => {
        const binaryPaths = ["logo.png", "app.exe", "font.woff2", "archive.zip"];
        for (const p of binaryPaths) {
            assert.strictEqual(isRelevantFile(p), false, `Binary file ${p} should be excluded by isRelevantFile`);
        }

        // Test fetched binary content handling (e.g. contains null byte)
        const mockFiles = [{ path: "src/binary_data.json" }];
        const mockFetch = async () => "Hello\0WorldBinaryData";

        const result = await scanRepo(mockFiles, mockFetch, "owner", "repo");
        assert.strictEqual(result.filesScanned, 0);
        assert.strictEqual(result.meta.filesSkipped, 1);
        assert.strictEqual(result.meta.skipReasons.binary_content, 1);
    });

    // Test 6: Expanded file type coverage
    await test("6. Expanded file types are supported & tech stack detected", async () => {
        const mockFiles = [
            { path: "main.py" },
            { path: "app.go" },
            { path: "Main.java" },
            { path: "index.php" },
            { path: "app.rb" },
            { path: "main.rs" },
            { path: "config.yaml" },
            { path: "Dockerfile" },
            { path: "deploy.sh" }
        ];

        for (const f of mockFiles) {
            assert.strictEqual(isRelevantFile(f.path), true, `File ${f.path} should be relevant`);
        }

        const stack = detectTechStack(mockFiles);
        assert.ok(stack.includes("Python"));
        assert.ok(stack.includes("Go"));
        assert.ok(stack.includes("Java"));
        assert.ok(stack.includes("PHP"));
        assert.ok(stack.includes("Ruby"));
        assert.ok(stack.includes("Rust"));
        assert.ok(stack.includes("Docker"));

        const mockFetch = async (owner, repo, filepath) => {
            if (filepath === "main.py") return `# TODO: fix auth security\nAWS_KEY = "AKIA1234567890ABCDEF"`;
            return `# Sample file for ${filepath}`;
        };

        const result = await scanRepo(mockFiles, mockFetch, "owner", "repo");
        assert.strictEqual(result.filesScanned, 9);
        assert.ok(result.findings.some(f => f.title === "AWS API Key"));
        assert.ok(result.findings.some(f => f.title === "Security TODO"));
    });

    // Test 7: Complete audit pipeline execution
    await test("7. Complete audit pipeline scanner integration works", async () => {
        const mockFiles = [
            { path: "src/routes/auth.js" },
            { path: "package.json" },
            { path: ".env.example" }
        ];

        const mockFetch = async (owner, repo, filepath) => {
            if (filepath === "package.json") {
                return JSON.stringify({ dependencies: { express: "^4.18.2" } });
            }
            if (filepath === "src/routes/auth.js") {
                return `
                    app.post('/api/login', (req, res) => {
                        const password = req.body.password;
                        db.query("SELECT * FROM users WHERE id = " + req.body.id);
                        eval(req.body.code);
                    });
                `;
            }
            if (filepath === ".env.example") {
                return `API_KEY=sk-proj12345678901234567890`;
            }
            return "";
        };

        const scanData = await scanRepo(mockFiles, mockFetch, "myowner", "myrepo");

        assert.ok(scanData.meta, "meta should be defined");
        assert.strictEqual(scanData.meta.filesScanned, 3);
        assert.ok(scanData.findings.length > 0, "Should discover findings");
        assert.ok(scanData.findings.some(f => f.title === "No helmet middleware detected"));
        assert.ok(scanData.findings.some(f => f.title === "No rate limiting detected on auth routes"));
        assert.ok(scanData.findings.some(f => f.title === "Dangerous eval()"));
    });

    console.log(`\n=== Test Summary: ${passed} Passed, ${failed} Failed ===`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error("Test execution error:", err);
    process.exit(1);
});
