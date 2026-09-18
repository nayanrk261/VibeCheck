// Checks dependencies, file contents, and live HTML for common integration signals
// (Auth, Payments, Analytics). Categorized as "Integrations" for Track 2 Readiness.

const AUTH_PACKAGES = [
    "@clerk/nextjs", "@clerk/clerk-sdk-node", "@clerk/express",
    "next-auth", "@auth/core", "firebase", "@firebase/app",
    "@supabase/supabase-js", "@supabase/auth-helpers-nextjs",
    "auth0", "express-openid-connect", "passport", "jsonwebtoken", "bcrypt", "argon2"
];

const PAYMENT_PACKAGES = [
    "stripe", "@stripe/stripe-js", "@stripe/react-stripe-js",
    "@paypal/checkout-server-sdk", "@paypal/react-paypal-js", "paypal-rest-sdk",
    "razorpay", "lemonsqueezy", "@lemon-squeezy/wedges", "paddle-sdk", "@paddle/paddle-js"
];

const ANALYTICS_SIGNATURES = [
    { name: "Google Analytics / Tag Manager", regex: /gtag|googletagmanager/i },
    { name: "Plausible Analytics", regex: /plausible\.js/i },
    { name: "PostHog", regex: /posthog/i },
    { name: "Mixpanel", regex: /mixpanel/i },
    { name: "Vercel Analytics", regex: /_vercel\/insights|vercel-analytics/i },
    { name: "Segment", regex: /cdn\.segment\.com/i },
    { name: "Amplitude", regex: /amplitude\.com/i },
    { name: "Fathom Analytics", regex: /cdn\.usefathom\.com/i }
];

/**
 * Checks dependencies and code file contents for Auth and Payment integration signals.
 */
function checkAuthAndPayments(dependencies = {}, fileContents = []) {
    const findings = [];
    const deps = dependencies || {};

    const hasAuthDep = AUTH_PACKAGES.some((pkg) => Boolean(deps[pkg]));
    const hasPaymentDep = PAYMENT_PACKAGES.some((pkg) => Boolean(deps[pkg]));

    // Search file contents for inline signals if package.json didn't list them explicitly
    let hasAuthSignal = hasAuthDep;
    let hasPaymentSignal = hasPaymentDep;

    if (!hasAuthSignal || !hasPaymentSignal) {
        for (const { content } of fileContents) {
            if (typeof content !== "string") continue;
            if (!hasAuthSignal && (/\b(clerk|supabase|nextAuth|firebase|auth0|jwt)\b/i.test(content))) {
                hasAuthSignal = true;
            }
            if (!hasPaymentSignal && (/\b(stripe|paypal|razorpay|lemonsqueezy|paddle)\b/i.test(content))) {
                hasPaymentSignal = true;
            }
        }
    }

    if (!hasAuthSignal) {
        findings.push({
            title: "No standard auth integration detected",
            severity: "MEDIUM",
            category: "Integrations",
            description: "No common authentication provider (Clerk, NextAuth, Supabase, Firebase, Auth0, Passport) was detected in dependencies or scanned files.",
            fix: "If your application requires user authentication, ensure a secure SDK is integrated."
        });
    }

    if (!hasPaymentSignal) {
        findings.push({
            title: "No payment provider SDK detected",
            severity: "INFO",
            category: "Integrations",
            description: "No common payment gateway SDK (Stripe, PayPal, Razorpay, LemonSqueezy, Paddle) was detected.",
            fix: "If your app is a commercial SaaS, integrate a payment gateway before production launch."
        });
    }

    return findings;
}

/**
 * Checks live HTML for analytics tracking scripts.
 */
function checkAnalytics(html) {
    if (!html) return [];

    const findings = [];
    const detected = [];

    for (const sig of ANALYTICS_SIGNATURES) {
        if (sig.regex.test(html)) {
            detected.push(sig.name);
        }
    }

    if (detected.length === 0) {
        findings.push({
            title: "No analytics tool detected",
            severity: "LOW",
            category: "Integrations",
            description: "No common analytics tracking script (Google Analytics, Plausible, PostHog, Mixpanel) was detected on the homepage HTML.",
            fix: "Add an analytics tool to track user usage and retention in production."
        });
    }

    return findings;
}

module.exports = {
    checkAuthAndPayments,
    checkAnalytics
};
