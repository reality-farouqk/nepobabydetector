import { TierKey } from "@/data/tiers";

/**
 * Pre-written fallback lines so the reveal never breaks if the LLM call
 * fails or is rate-limited. Not personalized to specific answers — the
 * live AI roast (see /app/api/roast) handles that when it succeeds.
 */
export const ROAST_FALLBACKS: Record<Exclude<TierKey, "undefined">, string[]> = {
  nepo81: [
    "You've never once refreshed your balance in fear. We salute the ancestors.",
    "Somewhere, an uncle is still paying for this exact energy.",
    "Soft life isn't a phase for you, it's a permanent address.",
  ],
  nepo61: [
    "Cushioned, but you still post like you're grinding. We see the edit.",
    "Half hustle, half inheritance — the classic combo plate.",
    "You struggle on main and thrive in the group chat.",
  ],
  balanced: [
    "One foot in comfort, one foot in sapa. Very Nigerian of you.",
    "Not fully cushioned, not fully struggling — the national average.",
    "You're the friend who can help sometimes and needs help sometimes.",
  ],
  lapo21: [
    "One uncle in reserve and a whole lot of hustle carrying the rest.",
    "You're building the safety net your kids will inherit.",
    "Mostly grind, occasionally rescued. Balanced chaos.",
  ],
  lapo0: [
    "Pure grind, zero cushion, and still showing up. Respect the resilience.",
    "Your loan apps know your name better than your family does.",
    "No safety net, just vibes, faith, and a functioning WiFi connection.",
  ],
};

export function getFallbackRoast(tier: Exclude<TierKey, "undefined">): string {
  const lines = ROAST_FALLBACKS[tier];
  return lines[Math.floor(Math.random() * lines.length)];
}
