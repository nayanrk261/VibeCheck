// Detects whether a fetched HTML page is likely a client-rendered SPA shell
// (React/Vue/etc. with no server-side rendering) — i.e. the real content
// loads via JavaScript after the initial request, so a static crawl can't
// reliably see it. Shared by any Track 2 check that reads raw HTML and
// needs to avoid penalizing content it structurally cannot see.

const SPA_SHELL_SIGNATURES = [
    /<div\s+id=["']root["']/i,
    /<div\s+id=["']app["']/i,
    /<div\s+id=["']__next["']/i,
];

function looksLikeSpaShell(html) {
    const textOnly = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .trim();

    const hasMountPoint = SPA_SHELL_SIGNATURES.some((re) => re.test(html));
    const veryLittleText = textOnly.length < 300;

    return hasMountPoint && veryLittleText;
}

module.exports = { looksLikeSpaShell };