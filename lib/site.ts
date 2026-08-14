/**
 * Single source of truth for where this app lives.
 *
 * Imported by the layout (for metadataBase), the certificate footer and the
 * receipt email, so moving domains is one edit here rather than a grep across
 * the codebase for whichever spellings happened to be hardcoded.
 */

const FALLBACK_ORIGIN = "https://nepodetector.farouqkdesigns.com";

// Truthiness, not `??`: an env var declared but left blank in .env comes
// through as "" rather than undefined, and `new URL("")` throws at build time.
//
// NEXT_PUBLIC_SITE_URL is the one that reaches the browser — VERCEL_* vars are
// server-only, so on the client this falls through to the literal below. That's
// correct either way, since both name the same host.
const configuredUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : FALLBACK_ORIGIN);

/**
 * A bare hostname ("example.com") is the natural thing to put in an env var and
 * the one thing `new URL()` rejects — which fails the whole build, at
 * /_not-found, with no mention of the variable at fault. Add the scheme rather
 * than make everyone rediscover that.
 */
export function toOrigin(value: string): URL {
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withScheme);
  } catch {
    return new URL(FALLBACK_ORIGIN);
  }
}

/** Absolute origin, e.g. https://nepodetector.farouqkdesigns.com */
export const SITE_ORIGIN = toOrigin(configuredUrl);

/** Bare hostname for display — footers, the certificate, the email sign-off. */
export const SITE_DOMAIN = SITE_ORIGIN.hostname;
