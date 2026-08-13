export interface VibeCheckOption {
  key: "A" | "B" | "C";
  text: string;
  reaction: string;
}

export const VIBE_CHECK = {
  question:
    "Quick vibe check — when last did you check your account balance before buying something?",
  options: [
    {
      key: "A",
      text: "\"Balance ke? I just tap and go\"",
      reaction: "Oga see money. Let's see if that energy holds up...",
    },
    {
      key: "B",
      text: "\"Every single time, prayerfully\"",
      reaction: "The struggle is already speaking through the screen.",
    },
    {
      key: "C",
      text: "\"Depends on the day, depends on the vibes\"",
      reaction: "Ah, a balanced soul. Let's dig deeper.",
    },
  ] as VibeCheckOption[],
};
