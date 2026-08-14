import { NextRequest, NextResponse } from "next/server";
import { getFallbackRoast } from "@/lib/roastFallback";
import { TierKey } from "@/data/tiers";

interface RoastRequestBody {
  tierKey: Exclude<TierKey, "undefined">;
  tierTitle: string;
  extremeAnswers: { questionText: string; optionText: string; side: "nepo" | "lapo" }[];
  photoDescription?: string | null; // pre-extracted flex-only description, never raw image data
}

/**
 * Generates one short, personalized roast line referencing the user's
 * specific most-extreme answers (and optional photo flex cues). Falls back
 * to a pre-written pool if no API key is configured or the call fails, so
 * the reveal never breaks.
 */
export async function POST(req: NextRequest) {
  const body: RoastRequestBody = await req.json();
  const { tierKey, tierTitle, extremeAnswers, photoDescription } = body;

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ line: getFallbackRoast(tierKey), source: "fallback" });
  }

  const answerLines = extremeAnswers
    .map((a) => `Q: "${a.questionText}" → chose: "${a.optionText}"`)
    .join("\n");

  const prompt = `The user scored "${tierTitle}" on the Nepo Detector, a fun Nigerian app that rates people from "Nepo Baby" (family wealth/connections) to "Lapo Baby" (named after LAPO Microfinance — pure hustle, no safety net).

Their most extreme answers were:
${answerLines}
${photoDescription ? `\nTheir photo shows (flex cues only): ${photoDescription}` : ""}

Write ONE savage, funny, Nigerian-pidgin-flavored roast line under 30 words that specifically references these answers by content. Playful, never cruel. Never comment on appearance, body, race, tribe, or religion — stay strictly on the money/privilege/hustle theme. Return only the line, no quotes, no preamble.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 80,
        temperature: 0.9,
      }),
    });

    if (!res.ok) throw new Error(`Groq API error: ${res.status}`);

    const data = await res.json();
    const line: string | undefined = data?.choices?.[0]?.message?.content?.trim();

    if (!line) throw new Error("Empty roast response");

    return NextResponse.json({ line, source: "ai" });
  } catch {
    return NextResponse.json({ line: getFallbackRoast(tierKey), source: "fallback" });
  }
}
