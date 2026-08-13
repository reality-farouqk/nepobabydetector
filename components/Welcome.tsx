"use client";

import { useEffect, useRef, useState } from "react";
import BrandMark from "./BrandMark";

/** Total splash time before we hand over to the vibe check. */
const DURATION_MS = 2800;
const LINE_MS = 700;

/**
 * Boot-up lines. Written as if the app is genuinely scanning you — the joke is
 * the deadpan instrument-panel tone applied to something unmeasurable.
 */
const LOADING_LINES = [
  "Calibrating privilege sensors…",
  "Scanning for generational wealth…",
  "Cross-checking your surname…",
  "Warming up the judgement engine…",
];

export default function Welcome({ onDone }: { onDone: () => void }) {
  const [line, setLine] = useState(0);

  // Held in a ref so the splash timer is set once and never restarted by a
  // parent re-render handing us a fresh `onDone` identity.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const finish = setTimeout(() => onDoneRef.current(), DURATION_MS);
    const cycle = setInterval(
      () => setLine((i) => Math.min(i + 1, LOADING_LINES.length - 1)),
      LINE_MS,
    );
    return () => {
      clearTimeout(finish);
      clearInterval(cycle);
    };
  }, []);

  return (
    <button
      onClick={onDone}
      aria-label="Skip intro"
      className="flex-1 w-full flex flex-col items-center justify-center px-8 text-center cursor-default"
      style={{ minHeight: "100dvh" }}
    >
      <BrandMark size={104} spinRing className="welcome-mark" />

      {/* Two-tone wordmark, matching the brand lockup. */}
      <h1
        className="welcome-rise mt-7 text-3xl tracking-tight"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          animationDelay: "260ms",
        }}
      >
        <span style={{ color: "var(--butter)" }}>NEPO</span>
        <span style={{ color: "var(--orange)" }}>DETECTOR</span>
      </h1>

      <p
        className="welcome-rise mt-1.5 text-[11px] tracking-[0.22em]"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--on-dark-muted)",
          animationDelay: "340ms",
        }}
      >
        CERTIFIED &middot; VERIFIED
      </p>

      <p
        className="welcome-rise mt-5 text-sm max-w-[19rem]"
        style={{ color: "var(--on-dark-muted)", animationDelay: "440ms" }}
      >
        Nepo Baby or Lapo Baby? Ten questions. No lying allowed.
      </p>

      <div
        className="welcome-rise mt-9 w-44 h-1 rounded-full overflow-hidden"
        style={{ background: "var(--border-dark)", animationDelay: "520ms" }}
      >
        <div
          className="welcome-bar h-full rounded-full"
          style={
            {
              background: "var(--orange)",
              "--welcome-duration": `${DURATION_MS}ms`,
            } as React.CSSProperties
          }
        />
      </div>

      <p
        aria-live="polite"
        className="mt-3 text-[11px] tracking-[0.08em] uppercase h-4"
        style={{ fontFamily: "var(--font-mono)", color: "var(--on-dark-muted)" }}
      >
        {LOADING_LINES[line]}
      </p>
    </button>
  );
}
