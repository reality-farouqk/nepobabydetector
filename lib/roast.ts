import { Tier } from "@/data/tiers";
import { getFallbackRoast } from "@/lib/roastFallback";
import { BreakdownRow } from "@/lib/scoring";

/**
 * The personalised roast line — a paid feature.
 *
 * SERVER ONLY, and deliberately not exposed as its own route. It used to sit
 * behind `POST /api/roast`, which anyone could call: an open, unauthenticated
 * LLM endpoint funded by our API key. Generating it inside the post-payment
 * path instead closes that, and means we only spend tokens on people who paid.
 *
 * Free results use the tier's own `freeSummary`. That line is also what the
 * shared certificate and the /r/ landing page render, so putting the roast
 * behind the paywall costs nothing in the share loop — what people post is
 * unchanged either way.
 */

const MODEL = "llama-3.1-8b-instant";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Tidies the model's output into something that can be dropped straight into
 * the certificate.
 *
 * The prompt says "no quotes, no preamble" and the model ignores it maybe half
 * the time — measured, not guessed. Since ResultCard wraps the line in its own
 * curly quotes, an unstripped response renders as ""like this"". Also flattens
 * newlines, because a two-line roast breaks the card's fixed layout.
 */
export function cleanLine(raw: unknown): string {
  if (typeof raw !== "string") return "";

  let line = raw.trim().replace(/\s*\n+\s*/g, " ");

  // Drop a leading label like `Roast:` before looking at quotes.
  line = line.replace(/^(roast|line|here'?s( your roast)?)\s*[:\-—]\s*/i, "");

  // Strip one layer of wrapping quotes, straight or curly, only when the pair
  // actually matches — a line that merely ends in a quoted phrase is left alone.
  const pairs: [string, string][] = [
    ['"', '"'],
    ["'", "'"],
    ["“", "”"],
    ["‘", "’"],
  ];
  for (const [open, close] of pairs) {
    if (line.startsWith(open) && line.endsWith(close) && line.length > 2) {
      line = line.slice(1, -1).trim();
      break;
    }
  }

  return line;
}

/** The three most telling answers, which is what makes the line feel personal. */
function extremesFrom(breakdown: BreakdownRow[]): BreakdownRow[] {
  return breakdown.filter((r) => r.nepo === 10 || r.lapo === 10).slice(0, 3);
}

/**
 * Never throws and never returns empty — a failure here must not cost someone
 * the thing they just paid for, so it degrades to the pre-written pool.
 */
export async function generateRoast(tier: Tier, breakdown: BreakdownRow[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  const fallback = () =>
    getFallbackRoast(tier.key as Parameters<typeof getFallbackRoast>[0]) || tier.freeSummary;

  if (!apiKey) return fallback();

  const answerLines = extremesFrom(breakdown)
    .map((a) => `Q: "${a.questionText}" → chose: "${a.optionText}"`)
    .join("\n");

  if (!answerLines) return fallback();

  const prompt = `The user scored "${tier.title}" on the Nepo Detector, a fun Nigerian app that rates people from "Nepo Baby" (family wealth/connections) to "Lapo Baby" (named after LAPO Microfinance — pure hustle, no safety net).

Their most extreme answers were:
${answerLines}

Write ONE savage, funny, Nigerian-pidgin-flavored roast line under 30 words that specifically references these answers by content. Playful, never cruel. Never comment on appearance, body, race, tribe, or religion — stay strictly on the money/privilege/hustle theme. Return only the line, no quotes, no preamble.`;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 80,
        temperature: 0.9,
      }),
      cache: "no-store",
    });

    if (!res.ok) return fallback();

    const data = await res.json();
    return cleanLine(data?.choices?.[0]?.message?.content) || fallback();
  } catch {
    return fallback();
  }
}
