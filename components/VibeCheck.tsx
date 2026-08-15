"use client";

import { useEffect, useRef, useState } from "react";
import { VIBE_CHECK, VibeCheckOption } from "@/data/vibeCheck";

/**
 * The warm-up question, and the first promise the app makes about itself.
 *
 * The reaction used to appear instantly in a plain box, which gave away nothing
 * about what the product is. Now the detector visibly *reads* your answer and
 * then stamps a verdict onto it — the same rubber-stamp motif as the seal on
 * the certificate, so the joke and the payoff belong to the same world.
 *
 * Sequence: pick → the other options clear → a scan line sweeps the answer →
 * the stamp slams down, the card flinches, a shockwave rolls out → the reaction
 * and CTA rise in.
 */

const SCAN_MS = 850;

type Phase = "choosing" | "scanning" | "revealed";

export default function VibeCheck({ onContinue }: { onContinue: () => void }) {
  const [selected, setSelected] = useState<VibeCheckOption | null>(null);
  const [phase, setPhase] = useState<Phase>("choosing");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function pick(option: VibeCheckOption) {
    navigator.vibrate?.(8);
    setSelected(option);

    // Nothing to wait for if the animation won't play.
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPhase("revealed");
      return;
    }

    setPhase("scanning");
    timer.current = setTimeout(() => {
      // A firmer buzz as the stamp lands.
      navigator.vibrate?.(22);
      setPhase("revealed");
    }, SCAN_MS);
  }

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

      {phase === "choosing" && (
        <div className="flex flex-col gap-3">
          {VIBE_CHECK.options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => pick(opt)}
              className="option-btn text-left px-4 py-3 rounded-md"
            >
              {opt.text}
            </button>
          ))}
        </div>
      )}

      {selected && phase !== "choosing" && (
        <div className="flex flex-col gap-5">
          {/* The chosen answer, now the thing being examined. Not clipped —
              the stamp is allowed to overhang the edge like a real one would. */}
          <div
            className={`relative rounded-md px-4 py-5 ${
              phase === "revealed" ? "impact-shake" : ""
            }`}
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-dark)",
              color: "var(--on-dark)",
            }}
          >
            {/* Space kept clear on the right so the stamp never lands on words. */}
            <span className="block pr-24">{selected.text}</span>

            {phase === "scanning" && (
              // Its own clipping layer, so the sweep stays inside the card
              // without the card cropping the stamp later.
              <span
                aria-hidden
                className="absolute inset-0 overflow-hidden rounded-md pointer-events-none"
              >
                <span className="scan-line" />
              </span>
            )}

            {phase === "revealed" && (
              <>
                <span
                  aria-hidden
                  className="shockwave absolute rounded-full pointer-events-none"
                  style={{
                    top: "50%",
                    right: 6,
                    width: 86,
                    height: 86,
                    marginTop: -43,
                    border: "2px solid var(--orange)",
                  }}
                />
                <Stamp verdict={selected.verdict} />
              </>
            )}
          </div>

          {phase === "scanning" && (
            <p
              aria-live="polite"
              className="text-[11px] tracking-[0.14em] uppercase text-center"
              style={{ fontFamily: "var(--font-mono)", color: "var(--on-dark-muted)" }}
            >
              Reading the room…
            </p>
          )}

          {phase === "revealed" && (
            <>
              <p
                className="welcome-rise text-[15px] leading-relaxed"
                style={{ color: "var(--butter)", animationDelay: "260ms" }}
              >
                {selected.reaction}
              </p>
              <button
                onClick={onContinue}
                className="welcome-rise btn-primary self-start px-5 py-3 rounded-md font-medium"
                style={{ animationDelay: "420ms" }}
              >
                That was just a taste. Run the Nepo Detector &rarr;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** The rubber stamp — same dashed-ring language as the certificate seal. */
function Stamp({ verdict }: { verdict: string }) {
  return (
    <span
      className="stamp-slam absolute flex flex-col items-center justify-center rounded-full pointer-events-none"
      style={{
        top: "50%",
        right: 6,
        width: 86,
        height: 86,
        marginTop: -43,
        border: "3px dashed var(--orange)",
        background: "rgba(249, 69, 0, 0.12)",
      }}
      role="img"
      aria-label={`Verdict: ${verdict}`}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: verdict.length > 7 ? 11 : 13,
          letterSpacing: 1,
          fontWeight: 600,
          color: "var(--orange)",
        }}
      >
        {verdict}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 7,
          letterSpacing: 1.4,
          color: "var(--on-dark-muted)",
          marginTop: 2,
        }}
      >
        DETECTOR
      </span>
    </span>
  );
}
