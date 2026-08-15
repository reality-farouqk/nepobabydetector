import { NextRequest, NextResponse } from "next/server";

/**
 * Fixed-window rate limiting for the unauthenticated API routes.
 *
 * Two backends, chosen by what's configured:
 *
 *   - **Upstash Redis** when `UPSTASH_REDIS_REST_URL` + `_TOKEN` are set. Shared
 *     across every serverless instance, so the limit is the real limit. Called
 *     over its REST API so this needs no SDK and no new dependency.
 *   - **In-memory** otherwise. Zero config and it works immediately, but each
 *     serverless instance keeps its own counter — on Vercel a burst spread
 *     across instances gets a fresh allowance each time. Treat it as a speed
 *     bump for casual hammering, not a real ceiling.
 *
 * **Fails open.** If the store errors or times out, the request is allowed. The
 * routes behind this take money and deliver paid results; briefly letting an
 * abuser through is a far smaller failure than turning away a paying customer
 * because Redis hiccuped.
 */

export interface RateLimitRule {
  /** Namespaces the counter, so routes don't share an allowance. */
  name: string;
  limit: number;
  windowSec: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfter: number;
}

/** Per-instance counters, used when no Redis is configured. */
const memory = new Map<string, { count: number; resetAt: number }>();

function clientId(req: NextRequest): string {
  // Vercel and most proxies put the real client first in x-forwarded-for.
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
  return ip || "unknown";
}

function memoryHit(key: string, rule: RateLimitRule, now: number): RateLimitResult {
  // Opportunistic prune so the map can't grow without bound.
  if (memory.size > 5000) {
    for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
  }

  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + rule.windowSec * 1000 });
    return { ok: true, remaining: rule.limit - 1, retryAfter: 0 };
  }

  entry.count += 1;
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
  return {
    ok: entry.count <= rule.limit,
    remaining: Math.max(rule.limit - entry.count, 0),
    retryAfter,
  };
}

async function redisHit(
  key: string,
  rule: RateLimitRule,
  url: string,
  token: string,
): Promise<RateLimitResult> {
  // INCR then EXPIRE in one round trip. EXPIRE is unconditional rather than
  // NX-guarded: re-arming the TTL each hit inside a fixed window is harmless,
  // and it means a key can never be left without one.
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(rule.windowSec)],
    ]),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Upstash ${res.status}`);

  const body: { result?: number; error?: string }[] = await res.json();
  const count = Number(body?.[0]?.result);
  if (!Number.isFinite(count)) throw new Error("Unexpected pipeline response");

  return {
    ok: count <= rule.limit,
    remaining: Math.max(rule.limit - count, 0),
    retryAfter: rule.windowSec,
  };
}

export async function rateLimit(
  req: NextRequest,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const now = Date.now();
  const window = Math.floor(now / (rule.windowSec * 1000));
  const key = `rl:${rule.name}:${clientId(req)}:${window}`;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      return await redisHit(key, rule, url, token);
    } catch {
      // Fall through to the local counter rather than failing the request.
      return memoryHit(key, rule, now);
    }
  }

  return memoryHit(key, rule, now);
}

/**
 * Applies a rule and returns a ready-made 429 when the caller is over it.
 * Returns null to mean "carry on".
 */
export async function rateLimited(
  req: NextRequest,
  rule: RateLimitRule,
): Promise<NextResponse | null> {
  const result = await rateLimit(req, rule);
  if (result.ok) return null;

  return NextResponse.json(
    { error: "rate_limited", retryAfter: result.retryAfter },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
