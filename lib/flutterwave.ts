/**
 * Flutterwave v4 ("Next Gen") server-side client.
 *
 * SERVER ONLY — this module reads FLW_CLIENT_SECRET. Never import it from a
 * "use client" component, or the secret ends up in the browser bundle.
 *
 * v4 drops v3's static secret key in favour of OAuth 2.0 client credentials:
 * you exchange the client id/secret for a short-lived bearer token, then call
 * the API with it. Tokens last 10 minutes.
 */

const TOKEN_URL =
  "https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token";

/** Sandbox by default; point FLW_BASE_URL at production when going live. */
export const FLW_BASE_URL =
  process.env.FLW_BASE_URL ?? "https://developersandbox-api.flutterwave.com";

export class FlutterwaveConfigError extends Error {}

interface CachedToken {
  token: string;
  /** Epoch ms after which we stop trusting the token. */
  expiresAt: number;
}

// Module-level cache. In serverless this is per-instance, which is fine: a cold
// instance just mints its own token. Avoids a token round-trip on every call.
let cached: CachedToken | null = null;

/**
 * Returns a valid access token, minting a new one when needed. Flutterwave
 * recommends refreshing at least a minute before expiry, so we retire tokens
 * 60s early rather than racing the clock.
 */
export async function getAccessToken(): Promise<string> {
  const clientId = process.env.FLW_CLIENT_ID;
  const clientSecret = process.env.FLW_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new FlutterwaveConfigError("FLW_CLIENT_ID / FLW_CLIENT_SECRET are not set");
  }

  if (cached && Date.now() < cached.expiresAt) {
    return cached.token;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    cached = null;
    throw new Error(`Flutterwave token request failed: ${res.status}`);
  }

  const data: { access_token?: string; expires_in?: number } = await res.json();

  if (!data.access_token) {
    cached = null;
    throw new Error("Flutterwave token response had no access_token");
  }

  const lifetime = typeof data.expires_in === "number" ? data.expires_in : 600;
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(lifetime - 60, 30) * 1000,
  };

  return cached.token;
}

/** Clears the cached token. Exposed for tests and for retrying after a 401. */
export function resetTokenCache(): void {
  cached = null;
}

/**
 * Calls a v4 endpoint with a bearer token attached.
 *
 * X-Trace-Id gives Flutterwave support a handle on a specific request; it must
 * be at least 12 characters. X-Idempotency-Key is only meaningful on writes, so
 * callers opt into it.
 */
export async function flwFetch(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<Response> {
  const { idempotencyKey, headers, ...rest } = init;
  const token = await getAccessToken();

  return fetch(`${FLW_BASE_URL}${path}`, {
    ...rest,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Trace-Id": crypto.randomUUID(),
      ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
      ...headers,
    },
  });
}
