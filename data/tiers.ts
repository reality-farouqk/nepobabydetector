export type TierKey = "nepo81" | "nepo61" | "balanced" | "lapo21" | "lapo0" | "undefined";

export interface Tier {
  key: TierKey;
  min: number; // inclusive lower bound of nepo %
  max: number; // inclusive upper bound of nepo %
  title: string;
  accent: "gold" | "red";
  freeSummary: string;
  fullBreakdownIntro: string;
}

export const TIERS: Tier[] = [
  {
    key: "nepo81",
    min: 81,
    max: 100,
    title: "Certified Nepo Baby",
    accent: "gold",
    freeSummary:
      "The safety net has a safety net. You've never truly free-fallen — and honestly, good for you.",
    fullBreakdownIntro:
      "Generational wealth cushioning at every turn. Here's exactly which answers gave you away.",
  },
  {
    key: "nepo61",
    min: 61,
    max: 80,
    title: "Nepo-Leaning, But They Try",
    accent: "gold",
    freeSummary:
      "You've got a cushion, but you at least pretend to hustle for the 'Gram.",
    fullBreakdownIntro:
      "Soft life with occasional struggle cosplay. Let's look at the performative grind.",
  },
  {
    key: "balanced",
    min: 41,
    max: 60,
    title: "The Balanced Hybrid",
    accent: "gold",
    freeSummary:
      "One foot in family backup, one foot in real hustle. The most Nigerian-middle-class result there is.",
    fullBreakdownIntro:
      "Genuinely the most relatable tier. Here's exactly which answers tipped which way.",
  },
  {
    key: "lapo21",
    min: 21,
    max: 40,
    title: "Lapo-Leaning Hustler",
    accent: "red",
    freeSummary:
      "You've had help once or twice, but mostly this is survival mode with occasional airbags.",
    fullBreakdownIntro:
      "Still got that one uncle in reserve. Here's the hustle answers that carried you.",
  },
  {
    key: "lapo0",
    min: 0,
    max: 20,
    title: "Certified Lapo Baby",
    accent: "red",
    freeSummary:
      "No safety net, no cushion, just vibes and loan apps. Respect.",
    fullBreakdownIntro:
      "Full grind mode, no cushion in sight. Let's celebrate the receipts.",
  },
];

export function getTier(nepoPercent: number): Tier {
  return (
    TIERS.find((t) => nepoPercent >= t.min && nepoPercent <= t.max) ?? TIERS[2]
  );
}
