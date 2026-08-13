/**
 * Flutterwave v3 server-side client.
 *
 * SERVER ONLY — reads FLW_SECRET_KEY. Never import from a "use client" file.
 *
 * v3 rather than v4 on purpose: v3 ships a hosted checkout modal, so card
 * details are entered on Flutterwave's own iframe and never touch this app's
 * form, servers or logs. v4 has no hosted checkout yet, and its direct API
 * would mean collecting raw card numbers ourselves — which is exactly the
 * exposure this build is avoiding. Revisit when v4 Checkout ships.
 *
 * Auth is a static bearer secret; there is no OAuth token dance in v3.
 */

const API_BASE = "https://api.flutterwave.com/v3";

export class FlutterwaveConfigError extends Error {}

export async function flwFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const secretKey = process.env.FLW_SECRET_KEY;

  if (!secretKey) {
    throw new FlutterwaveConfigError("FLW_SECRET_KEY is not set");
  }

  const { headers, ...rest } = init;

  return fetch(`${API_BASE}${path}`, {
    ...rest,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...headers,
    },
  });
}
