/**
 * The Nepo Detector icon — the champagne coupe inside a dashed "certificate"
 * ring, matching public/brand-assets/svg/icon-{light,dark-bg}.svg.
 *
 * Inlined rather than loaded as an <img> so the ring can be animated
 * independently of the glass and so the splash needs no extra network request.
 * If the artwork is ever revised, re-sync this with the SVG source.
 */
export default function BrandMark({
  size = 96,
  /** "on-dark" is transparent-backed; "on-light" adds the indigo disc. */
  variant = "on-dark",
  /** Slowly rotates the dashed ring, like a detector sweeping. */
  spinRing = false,
  className,
}: {
  size?: number;
  variant?: "on-dark" | "on-light";
  spinRing?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 150 150"
      className={className}
      role="img"
      aria-label="Nepo Detector"
    >
      {variant === "on-light" && <circle cx="75" cy="75" r="66" fill="var(--indigo)" />}

      <circle
        cx="75"
        cy="75"
        r="70"
        fill="none"
        stroke="var(--lilac)"
        strokeWidth="3"
        strokeDasharray="5 5"
        className={spinRing ? "brand-ring" : undefined}
      />

      {/* Bowl, rim, stem, foot */}
      <path
        d="M 46 45 C 46 75, 62 92, 75 98 C 88 92, 104 75, 104 45 Z"
        fill="var(--butter)"
        stroke="var(--orange)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <ellipse
        cx="75"
        cy="45"
        rx="29"
        ry="6"
        fill="var(--indigo)"
        stroke="var(--orange)"
        strokeWidth="3"
      />
      <rect x="71" y="98" width="8" height="30" rx="2" fill="var(--orange)" />
      <ellipse cx="75" cy="130" rx="24" ry="6" fill="var(--orange)" />

      {/* Bubbles */}
      <circle cx="63" cy="58" r="2.4" fill="var(--lilac)" />
      <circle cx="70" cy="48" r="1.8" fill="var(--lilac)" />
      <circle cx="58" cy="70" r="1.6" fill="var(--lilac)" />
      <circle cx="88" cy="55" r="2" fill="var(--lilac)" />
    </svg>
  );
}
