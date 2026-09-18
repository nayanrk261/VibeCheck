const axios = require("axios");
const { assertPublicUrl } = require("./ssrfGuard");

/**
 * Safely fetches live HTML content for production readiness analysis.
 * Uses SSRF guard to ensure the host is public before making the network call.
 */
async function fetchLiveHtml(rawUrl) {
    if (!rawUrl) return { html: "", fetched: false };

    try {
        const safeUrl = await assertPublicUrl(rawUrl);
        const response = await axios.get(safeUrl, {
            timeout: 8000,
            maxRedirects: 3,
            headers: {
                "User-Agent": "VibeCheck-Auditor/1.0 (+https://vibecheck.app)"
            },
            validateStatus: (status) => status < 400
        });

        if (typeof response.data === "string") {
            return { html: response.data, fetched: true };
        }
        return { html: "", fetched: false };
    } catch (err) {
        console.error(`Live HTML fetch failed for ${rawUrl}:`, err.message);
        return { html: "", fetched: false };
    }
}

module.exports = { fetchLiveHtml };
