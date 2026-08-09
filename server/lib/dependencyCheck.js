const axios = require("axios");

// OSV.dev — free, no API key, aggregates vuln data from the GitHub Advisory
// Database, npm audit advisories, and others. Replaces the old hardcoded
// 4-package "vulnerablePackages" list with a real, up-to-date check.
const OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch";

// package.json version ranges (^4.17.21, ~1.2.3, >=2.0.0) aren't exact
// versions, and we don't fetch/parse a lockfile. We strip the range
// operator and treat the remaining semver as "the version to check" — a
// reasonable approximation without needing lockfile access.
function cleanVersion(range) {
    if (!range || typeof range !== "string") return null;
    const match = range.match(/\d+\.\d+\.\d+/);
    return match ? match[0] : null;
}

async function checkDependencies(deps, ecosystem = "npm") {
    const entries = Object.entries(deps || {})
        .map(([name, range]) => ({ name, version: cleanVersion(range) }))
        .filter((e) => e.version);

    if (entries.length === 0) return [];

    const findings = [];
    const CHUNK_SIZE = 100; // OSV batch endpoint handles far more, chunk defensively

    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
        const chunk = entries.slice(i, i + CHUNK_SIZE);
        const queries = chunk.map((e) => ({
            package: { name: e.name, ecosystem },
            version: e.version,
        }));

        let data;
        try {
            const response = await axios.post(
                OSV_BATCH_URL,
                { queries },
                { timeout: 10000 }
            );
            data = response.data;
        } catch (err) {
            console.error("OSV batch query failed:", err.message);
            continue; // skip this chunk rather than failing the whole audit over a network blip
        }

        (data.results || []).forEach((result, idx) => {
            const pkg = chunk[idx];
            const vulnRefs = result.vulns || [];
            if (vulnRefs.length === 0) return;

            const topIds = vulnRefs.slice(0, 3).map((v) => v.id);

            findings.push({
                title: `Vulnerable dependency: ${pkg.name}`,
                severity: vulnRefs.length >= 3 ? "HIGH" : "MEDIUM",
                category: "Dependencies",
                description: `${pkg.name}@${pkg.version} has ${vulnRefs.length} known vulnerabilit${vulnRefs.length === 1 ? "y" : "ies"
                    } (${topIds.join(", ")}${vulnRefs.length > 3 ? ", ..." : ""}).`,
                fix: `Update ${pkg.name} to a patched version. See: ${topIds
                    .map((id) => `https://osv.dev/vulnerability/${id}`)
                    .join(", ")}`,
            });
        });
    }

    return findings;
}

module.exports = { checkDependencies };