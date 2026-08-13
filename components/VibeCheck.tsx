"use client";

import { useState } from "react";
import { VIBE_CHECK } from "@/data/vibeCheck";

export default function VibeCheck({ onContinue }: { onContinue: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);

  const selected = VIBE_CHECK.options.find((o) => o.key === picked);

  return (
    <div className="max-w-md mx-auto px-6 py-10">
      <p
        className="text-[11px] tracking-[0.12em] uppercase mb-3"
        style={{ fontFamily: "var(--font-mono)", color: "var(--on-dark-muted)" }}
      >
        Vibe check
      </p>
      <h1
        className="text-2xl mb-6"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--butter)" }}
      >
        {VIBE_CHECK.question}
      </h1>

      {!selected && (
        <div className="flex flex-col gap-3">
          {VIBE_CHECK.options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPicked(opt.key)}
              className="option-btn text-left px-4 py-3 rounded-md"
            >
              {opt.text}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="flex flex-col gap-6">
          <div
            className="px-4 py-3 rounded-md border-l-4"
            style={{
              background: "var(--surface-raised)",
              borderColor: "var(--orange)",
              color: "var(--butter)",
            }}
          >
            {selected.reaction}
          </div>
          <button
            onClick={onContinue}
            className="btn-primary self-start px-5 py-3 rounded-md font-medium"
          >
            That was just a taste. Run the Nepo Detector &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
