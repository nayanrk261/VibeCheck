// Performance is measured, not guessed — a direct function of the response
// time we actually recorded.
function scorePerformance(headerData) {
  if (!headerData || headerData.error || headerData.responseTime == null) {
    return { value: null, status: "no_data" };
  }
  const t = headerData.responseTime;
  let value;
  if (t < 500) value = 100;
  else if (t < 1000) value = 85;
  else if (t < 2000) value = 65;
  else if (t < 3500) value = 45;
  else value = 25;
  return { value, status: "scored" };
}

// Categories that actually reflect security posture — Performance/Availability
// findings (slow response, "couldn't scan live URL") don't count against it.
const SECURITY_CATEGORIES = new Set(["Secrets", "Dependencies", "Headers", "Transport Security", "Exposure", "Abuse Prevention", "Input Validation", "Authentication", "Access Control", "File Upload", "Information Disclosure"]);
const SEVERITY_WEIGHT = { CRITICAL: 30, HIGH: 15, MEDIUM: 8, LOW: 3, INFO: 0 };

// Security score is now deterministic — starts at 100, real findings
// subtract real points based on severity. Same findings, same score, always.
function scoreSecurity(findings, hasRepoData, hasLiveData) {
  if (!hasRepoData && !hasLiveData) return { value: null, status: "no_data" };

  let score = 100;
  for (const f of findings) {
    if (!SECURITY_CATEGORIES.has(f.category)) continue;
    score -= SEVERITY_WEIGHT[f.severity] ?? 0;
  }
  score = Math.max(0, Math.min(100, score));
  return { value: score, status: "scored" };
}

// Overall is the average of whichever real (non-null) category scores exist.
// If none exist, there's nothing to average — return null so the caller can
// show an honest "not enough data" state.
function computeOverall(...values) {
  const parts = values.filter((v) => v != null);
  if (parts.length === 0) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

// Readiness is Track 2's score — deliberately a SEPARATE category set from
// Security. A secure-but-not-launch-ready app shouldn't look insecure, and
// vice versa. Never feeds into computeOverall.
const READINESS_CATEGORIES = new Set(["Legal", "Integrations", "SEO"]);

function scoreReadiness(findings, hasLiveData) {
  if (!hasLiveData) return { value: null, status: "no_data" };

  let score = 100;
  for (const f of findings) {
    if (!READINESS_CATEGORIES.has(f.category)) continue;
    score -= SEVERITY_WEIGHT[f.severity] ?? 0;
  }
  score = Math.max(0, Math.min(100, score));
  return { value: score, status: "scored" };
}

// Used only if the AI summary call fails outright (Groq down, malformed
// response after retries, etc.) so a single audit never fully fails just
// because the narrative-writing step couldn't run — every number and
// finding in the report is already deterministic by this point.
function buildFallbackSummary(security, performance, findings) {
  if (security.status === "no_data" && performance.status === "no_data") {
    return "There wasn't enough data to audit this submission.";
  }
  const critHigh = findings.filter(f => f.severity === "CRITICAL" || f.severity === "HIGH").length;
  const parts = [];
  if (security.status === "scored") parts.push(`Security score: ${security.value}/100`);
  if (performance.status === "scored") parts.push(`Performance score: ${performance.value}/100`);
  let text = parts.join(". ") + ".";
  text += critHigh > 0
    ? ` ${critHigh} critical/high severity issue${critHigh > 1 ? "s were" : " was"} found — see the findings below.`
    : " No critical or high severity issues were found.";
  return text;
}

module.exports = { scorePerformance, scoreSecurity, scoreReadiness, computeOverall, buildFallbackSummary };