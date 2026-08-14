"use client";

import { useEffect, useRef, useState } from "react";
import BrandMark from "./BrandMark";

/**
 * The beat between the last question and the verdict.
 *
 * The result used to appear the instant the photo step ended, which threw away
 * the most emotionally loaded moment in the product. Tension then release is
 * the whole mechanic of a reveal; this buys ~2.4s of it, counting the score up
 * so the number lands last.
 *
 * Anyone who prefers reduced motion skips straight through — the delay has no
 * value if the animation isn't playing.
 */

const DURATION_MS = 2400;
const TICK_MS = 40;

const LINES = [
  "Reading your answers…",
  "Weighing the receipts…",
  "Consulting the family tree…",
  "Reaching a verdict…",
];

export default function Analysing({
  percent,
  onDone,
}: {
  percent: number;
  onDone: () => void;
}) {
  const [shown, setShown] = useState(0);
  const [line, setLine] = useState(0);

  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      onDoneRef.current();
      return;
    }

    const started = Date.now();
    const counter = setInterval(() => {
      const progress = Math.min((Date.now() - started) / DURATION_MS, 1);
      // Ease-out so it races up then settles, rather than crawling linearly.
      setShown(Math.round(percent * (1 - Math.pow(1 - progress, 3))));
    }, TICK_MS);

    const lines = setInterval(
      () => setLine((i) => Math.min(i + 1, LINES.length - 1)),
      DURATION_MS / LINES.length,
    );

    const finish = setTimeout(() => {
      // A short buzz as the verdict lands — on mobile this is what makes it
      // feel like a machine reached a conclusion about you.
      navigator.vibrate?.(18);
      onDoneRef.current();
    }, DURATION_MS);

    return () => {
      clearInterval(counter);
      clearInterval(lines);
      clearTimeout(finish);
    };
  }, [percent]);

  return (
    <div
      className="flex-1 w-full flex flex-col items-center justify-center px-8 text-center"
      style={{ minHeight: "100dvh" }}
    >
      <div className="relative flex items-center justify-center">
        <BrandMark size={132} spinRing />
        <span
          aria-hidden
          className="absolute text-3xl"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            color: "var(--butter)",
            // Sits over the glass, which is why the mark's own fill is muted here.
            textShadow: "0 2px 12px rgba(23,0,42,0.8)",
          }}
        >
          {shown}%
        </span>
      </div>

      <p
        aria-live="polite"
        className="mt-8 text-[11px] tracking-[0.14em] uppercase h-4"
        style={{ fontFamily: "var(--font-mono)", color: "var(--on-dark-muted)" }}
      >
        {LINES[line]}
      </p>
    </div>
  );
}
