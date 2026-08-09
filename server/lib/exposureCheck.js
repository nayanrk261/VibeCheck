const axios = require("axios");
const { assertPublicUrl } = require("./ssrfGuard");

// Checked on the LIVE URL (not the repo) — this is about what the deployed
// server actually exposes to the internet, not what's in source control.
const EXPOSURE_CHECKS = [
    {
        path: "/.env",
        title: "Exposed .env file",
        severity: "CRITICAL",
        category: "Exposure",
        description: "The .env file is publicly reachable at this URL — this can leak API keys, database credentials, and other secrets directly.",
        fix: "Make sure your hosting/server config never serves dotfiles, and confirm .env isn't in your deployed build output.",
        isRealHit: (body) => typeof body === "string" && /=/m.test(body) && body.length < 20000 && !/<!doctype html/i.test(body),
    },
    {
        path: "/.git/HEAD",
        title: "Exposed .git directory",
        severity: "HIGH",
        category: "Exposure",
        description: "The .git directory is publicly reachable at this URL — an attacker can potentially reconstruct your full source history, including anything ever committed (even if later removed).",
        fix: "Block access to .git in your server/hosting config, and make sure your deploy step only ships the built app, not the repository itself.",
        isRealHit: (body) => typeof body === "string" && (body.includes("ref:") || /^[0-9a-f]{40}/m.test(body)),
    },
];

async function checkExposedFiles(liveUrl) {
    let safeBase;
    try {
        safeBase = await assertPublicUrl(liveUrl);
    } catch {
        return []; // blocked/unreachable — already reported elsewhere
    }

    const origin = new URL(safeBase).origin;
    const findings = [];

    for (const check of EXPOSURE_CHECKS) {
        try {
            const res = await axios.get(origin + check.path, {
                timeout: 6000,
                maxRedirects: 0,
                validateStatus: () => true,
            });

            // A 200 alone isn't enough evidence — many SPAs return their
            // index.html for any unknown path. Require the body to actually
            // look like the real file, not a generic fallback page.
            if (res.status === 200 && check.isRealHit(res.data)) {
                findings.push({
                    title: check.title,
                    severity: check.severity,
                    category: check.category,
                    description: check.description,
                    fix: check.fix,
                });
            }
        } catch {
            // network error/timeout on this specific path — skip it, don't fail the audit
        }
    }

    return findings;
}

module.exports = { checkExposedFiles };