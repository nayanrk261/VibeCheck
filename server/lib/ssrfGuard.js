// SSRF guard.
//
// The audit endpoint accepts a user-supplied `liveUrl` and the server fetches
// it directly (see lib/headers.js). Without this check, anyone could point
// liveUrl at internal infrastructure — cloud metadata endpoints
// (169.254.169.254), localhost, an internal admin panel, a database on the
// same VPC — and use VibeCheck's server as a proxy to reach it.
//
// This resolves the hostname and rejects the request if it (or any of its
// resolved addresses) falls in a private/loopback/link-local/reserved range.
//
// Known limitation: this checks the IP at request time, not at connection
// time, so it does not fully close a DNS-rebinding attack (where the DNS
// record changes between our check and axios's actual connection a moment
// later). For a public GitHub repo / marketing site auditor this residual
// risk is low, but if VibeCheck ever handles anything more sensitive,
// upgrade this to pin the resolved IP and connect directly to it.

const dns = require("dns").promises;
const net = require("net");
const ipaddr = require("ipaddr.js");

const BLOCKED_RANGES = new Set([
  "private",
  "loopback",
  "linkLocal",
  "uniqueLocal",
  "reserved",
  "carrierGradeNat",
  "broadcast",
  "unspecified",
]);

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
]);

function isBlockedAddress(addr) {
  let parsed;
  try {
    parsed = ipaddr.process(addr); // normalizes IPv4-mapped IPv6 etc.
  } catch {
    return true; // if we can't parse it, don't trust it
  }

  const range = parsed.range();

  if (range === "ipv4Mapped") {
    // e.g. ::ffff:169.254.169.254 — unwrap and check the embedded IPv4
    const v4 = parsed.toIPv4Address();
    return BLOCKED_RANGES.has(v4.range());
  }

  return BLOCKED_RANGES.has(range);
}

/**
 * Throws if the URL is not safe to fetch server-side.
 * Returns the normalized URL string on success.
 */
async function assertPublicUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http:// and https:// URLs are allowed");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error("This host cannot be scanned");
  }

  const addresses = net.isIP(hostname)
    ? [hostname]
    : (await dns.lookup(hostname, { all: true }).catch(() => {
        throw new Error("Could not resolve host");
      })).map((r) => r.address);

  if (!addresses.length) {
    throw new Error("Could not resolve host");
  }

  for (const addr of addresses) {
    if (isBlockedAddress(addr)) {
      throw new Error(
        "This URL resolves to a private or internal address and cannot be scanned"
      );
    }
  }

  return parsed.toString();
}

module.exports = { assertPublicUrl };