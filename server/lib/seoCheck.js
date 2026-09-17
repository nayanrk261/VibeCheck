const axios = require("axios");
const { assertPublicUrl } = require("./ssrfGuard");
const { looksLikeSpaShell } = require("./spaDetect");

// robots.txt / sitemap.xml require their own requests (different paths from
// the homepage), but title/meta description reuse the homepage HTML already
// fetched by liveHtmlFetch.js — no extra request for those.

async function checkRobotsAndSitemap(liveUrl) {
    let safeUrl;
    try {
        safeUrl = await assertPublicUrl(liveUrl);
    } catch {
        return { findings: [] };
    }

    const origin = new URL(safeUrl).origin;
    const findings = [];

    const checkPath = async (path) => {
        try {
            const res = await axios.get(origin + path, {
                timeout: 6000,
                maxRedirects: 3,
                validateStatus: () => true,
            });
            return res.status === 200;
        } catch {
            return false; // treat network errors as "not found" rather than crashing the check
        }
    };

    const [hasRobots, hasSitemap] = await Promise.all([
        checkPath("/robots.txt"),
        checkPath("/sitemap.xml"),
    ]);

    if (!hasRobots) {
        findings.push({
            title: "No robots.txt found",
            severity: "LOW",
            category: "SEO",
            description: "No robots.txt was found at the site root. Not critical, but it's the standard way to guide search engine crawlers.",
            fix: "Add a robots.txt file at your site root — even a minimal one that allows all crawling is better than none."
        });
    }

    if (!hasSitemap) {
        findings.push({
            title: "No sitemap.xml found",
            severity: "LOW",
            category: "SEO",
            description: "No sitemap.xml was found at the site root. Helps search engines discover and index your pages faster.",
            fix: "Generate a sitemap.xml (most frameworks have a plugin for this) and link it from robots.txt."
        });
    }

    return { findings };
}

function checkMetaTags(html) {
    if (!html) return [];

    const findings = [];
    const isSpaShell = looksLikeSpaShell(html);

    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    const hasRealTitle = titleMatch && titleMatch[1].trim().length > 0 && !/^(vite app|react app|create react app|document)$/i.test(titleMatch[1].trim());

    const hasMetaDescription = /<meta\s+name=["']description["']\s+content=["'][^"']+["']/i.test(html);

    if (!hasRealTitle) {
        findings.push({
            title: "Missing or default page title",
            severity: "MEDIUM",
            category: "SEO",
            description: "No meaningful <title> tag was found — either missing, empty, or still the framework default (e.g. \"Vite App\"). This is what shows in browser tabs and search results.",
            fix: "Set a real, descriptive <title> tag for your homepage."
        });
    }

    if (!hasMetaDescription) {
        if (isSpaShell) {
            findings.push({
                title: "Could not verify meta description",
                severity: "INFO",
                category: "SEO",
                description: "This looks like a client-rendered app — meta tags injected via JavaScript (e.g. react-helmet) after load aren't visible to a static crawl. This doesn't count against your score.",
                fix: "Manually confirm a meta description is set, ideally via server-side rendering or static tags in index.html so search engines can see it without executing JS."
            });
        } else {
            findings.push({
                title: "Missing meta description",
                severity: "LOW",
                category: "SEO",
                description: "No <meta name=\"description\"> tag was found. This is what search engines typically show as the snippet under your link in results.",
                fix: "Add a concise <meta name=\"description\" content=\"...\"> tag summarizing your app."
            });
        }
    }

    return findings;
}

module.exports = { checkRobotsAndSitemap, checkMetaTags };