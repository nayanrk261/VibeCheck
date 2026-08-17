const axios = require("axios");
const { assertPublicUrl } = require("./ssrfGuard");

// Crawls the live URL's homepage HTML for links/references to a privacy
// policy, terms of service, and a cookie-consent mechanism. This is
// PRESENCE detection, not legal review — it tells you whether the basics
// exist, not whether the content is legally adequate.
//
// IMPORTANT LIMITATION: this only sees the raw, un-rendered HTML response.
// For a client-rendered SPA (React/Vue/etc. with no server-side rendering),
// the real page content — including privacy/terms links — is injected by
// JavaScript after load and simply isn't present in what we fetch. Treating
// "not found in raw HTML" as "missing" for those apps produces false
// positives and non-deterministic-looking results (the same app can look
// like it "has" or "lacks" a privacy policy from one run to the next,
// depending on nothing meaningful). So: if the page looks like an SPA
// shell, privacy/terms checks are marked unverifiable instead of failed,
// and don't penalize the score. Cookie-consent scripts are the exception —
// those load synchronously via a <script> tag in <head> even on SPAs, so
// that check stays reliable either way.

const COOKIE_CONSENT_SIGNATURES = [
    /cookieconsent/i,
    /cookie-consent/i,
    /cookieyes/i,
    /onetrust/i,
    /osano/i,
    /termly/i,
    /cookiebot/i,
];

const SPA_SHELL_SIGNATURES = [
    /<div\s+id=["']root["']/i,
    /<div\s+id=["']app["']/i,
    /<div\s+id=["']__next["']/i,
];

function looksLikeSpaShell(html) {
    // Strip scripts/styles/tags to estimate real visible text content.
    const textOnly = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .trim();

    const hasMountPoint = SPA_SHELL_SIGNATURES.some((re) => re.test(html));
    const veryLittleText = textOnly.length < 300;

    return hasMountPoint && veryLittleText;
}

async function checkLegalPages(liveUrl) {
    let safeUrl;
    try {
        safeUrl = await assertPublicUrl(liveUrl);
    } catch {
        return { findings: [], checked: false };
    }

    let html;
    try {
        const res = await axios.get(safeUrl, {
            timeout: 8000,
            maxRedirects: 3,
            validateStatus: () => true,
        });
        html = typeof res.data === "string" ? res.data : "";
    } catch {
        return { findings: [], checked: false };
    }

    if (!html) return { findings: [], checked: false };

    const findings = [];
    const isSpaShell = looksLikeSpaShell(html);

    const hasPrivacyLink = /href=["'][^"']*privacy[^"']*["']/i.test(html) || /privacy\s*policy/i.test(html);
    const hasTermsLink = /href=["'][^"']*(terms|tos)[^"']*["']/i.test(html) || /terms\s*(of\s*service|and\s*conditions)/i.test(html);
    const hasCookieConsent = COOKIE_CONSENT_SIGNATURES.some((re) => re.test(html));

    if (isSpaShell) {
        // Don't claim these are missing — we genuinely can't see rendered
        // content. One honest, non-penalizing note instead of two
        // potentially-wrong findings.
        if (!hasPrivacyLink && !hasTermsLink) {
            findings.push({
                title: "Could not verify privacy policy / terms of service",
                severity: "INFO",
                category: "Legal",
                description: "This looks like a client-rendered app (React/Vue/etc.) — the real page content loads via JavaScript after the initial request, so a static crawl can't reliably see whether privacy/terms links exist. This doesn't count against your score.",
                fix: "Manually confirm your privacy policy and terms of service are linked somewhere reachable from your homepage (footer, nav, or signup flow)."
            });
        }
    } else {
        if (!hasPrivacyLink) {
            findings.push({
                title: "No privacy policy link found",
                severity: "MEDIUM",
                category: "Legal",
                description: "No link or reference to a privacy policy was found on the homepage. Most jurisdictions (GDPR, CCPA, etc.) require one if you collect any user data.",
                fix: "Add a privacy policy page and link to it from your homepage or footer."
            });
        }

        if (!hasTermsLink) {
            findings.push({
                title: "No terms of service link found",
                severity: "LOW",
                category: "Legal",
                description: "No link or reference to terms of service was found on the homepage.",
                fix: "Add a terms of service page — it sets expectations for users and protects you legally."
            });
        }
    }

    if (!hasCookieConsent) {
        findings.push({
            title: "No cookie consent mechanism detected",
            severity: "LOW",
            category: "Legal",
            description: "No known cookie-consent banner was detected. This only matters if you actually set non-essential cookies (analytics, ads, etc.) for EU/UK visitors — if you don't, this may not apply to you.",
            fix: "If you use analytics or advertising cookies, add a consent banner (e.g. CookieYes, Osano, Cookiebot) before setting them."
        });
    }

    return { findings, checked: true, isSpaShell, hasPrivacyLink, hasTermsLink, hasCookieConsent };
}

module.exports = { checkLegalPages };