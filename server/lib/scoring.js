// Performance is measured, not guessed — it's a direct function of the
// response time we actually recorded. Same input always produces the same
// score, unlike asking an LLM to invent a "performance score" from nothing.

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

// Overall is the average of whichever real (non-null) category scores we
// have. If we have none, there's nothing to average — return null so the
// caller can show an honest "not enough data" state instead of a fake 0.
function computeOverall(...values) {
  const parts = values.filter((v) => v != null);
  if (parts.length === 0) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

module.exports = { scorePerformance, computeOverall };