import type { Metadata } from "next";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export const metadata: Metadata = {
  title: "Nothing detected",
};

/**
 * 404.
 *
 * Also what a mistyped or truncated share link lands on — WhatsApp and X clip
 * long URLs often enough that this is a real path, not a rare one. So it stays
 * in the detector's voice and offers the obvious next step rather than
 * apologising at a dead end.
 */
export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
      <BrandMark size={84} spinRing />

      <p
        className="mt-7 text-[11px] tracking-[0.14em] uppercase"
        style={{ fontFamily: "var(--font-mono)", color: "var(--on-dark-muted)" }}
      >
        Error 404
      </p>

      <h1
        className="mt-2 text-2xl"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--butter)" }}
      >
        Nothing detected here
      </h1>

      <p className="mt-3 text-sm max-w-[20rem]" style={{ color: "var(--on-dark-muted)" }}>
        The detector swept this page and found no trace of anything. Either the
        link was mistyped, or it got clipped somewhere along the way.
      </p>

      <Link
        href="/"
        className="btn-primary mt-8 px-6 py-3 rounded-md text-sm font-medium no-underline"
      >
        Run the detector on yourself &rarr;
      </Link>

      <p className="mt-3 text-[11px]" style={{ color: "var(--on-dark-muted)" }}>
        Ten questions. No lying allowed.
      </p>
    </div>
  );
}
