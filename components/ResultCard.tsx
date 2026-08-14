"use client";

import { Tier } from "@/data/tiers";
import { SITE_DOMAIN } from "@/lib/site";

export default function ResultCard({
  tier,
  percent,
  side,
  roastLine,
  photo,
  format = "portrait",
}: {
  tier: Tier;
  percent: number;
  side: "nepo" | "lapo";
  roastLine: string;
  photo: string | null;
  format?: "portrait" | "square";
}) {
  const isGold = tier.accent === "gold";
  const ring = isGold ? "var(--gold)" : "var(--red)";
  const arcText = isGold ? "var(--gold-text)" : "var(--red-text)";
  const sealFill = isGold ? "var(--gold-fill)" : "var(--red-fill)";
  const dotColor = isGold ? "var(--lilac)" : "var(--orange)";

  const dims = format === "portrait" ? { w: 300, h: 534, stamp: 104 } : { w: 300, h: 300, stamp: 72 };
  const arcId = `arc-${side}-${format}`;

  return (
    <div
      className="relative rounded-sm mx-auto"
      style={{
        width: dims.w,
        height: dims.h,
        background: "var(--paper)",
        boxShadow: "0 10px 30px rgba(23, 0, 42, 0.55)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: "var(--ink)", color: "var(--paper)" }}
      >
        <span
          className="text-[11px] tracking-[0.1em] uppercase flex items-center gap-1.5"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: dotColor }}
          />
          Nepo Detector
        </span>
        <span className="text-[11px] tracking-[0.1em] uppercase" style={{ fontFamily: "var(--font-mono)" }}>
          Alert
        </span>
      </div>

      <div className="px-6 pb-5 pt-2 flex flex-col" style={{ height: dims.h - 40 }}>
        <div className="flex items-end justify-center gap-3" style={{ marginTop: -34 }}>
          <div
            className="flex-shrink-0 rounded-lg flex items-center justify-center relative"
            style={{
              width: format === "portrait" ? 78 : 56,
              height: format === "portrait" ? 78 : 56,
              background: photo ? "var(--lilac)" : "var(--lilac-200)",
              border: photo ? "1.5px solid var(--ink)" : "1.5px dashed var(--gold)",
            }}
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="w-full h-full object-cover rounded-md" />
            ) : (
              <span
                className="text-[8px] uppercase text-center px-1 leading-tight"
                style={{ fontFamily: "var(--font-mono)", color: "var(--muted-2)" }}
              >
                Photo
                <br />
                optional
              </span>
            )}
          </div>

          <svg width={dims.stamp} height={dims.stamp} viewBox="0 0 132 132">
            <defs>
              <path id={arcId} d="M 16,66 A 50,50 0 1 1 116,66" fill="none" />
            </defs>
            <circle cx="66" cy="66" r="58" fill={sealFill} />
            <circle cx="66" cy="66" r="50" fill="none" stroke={ring} strokeWidth="2" strokeDasharray="4 4" />
            <text fontFamily="var(--font-mono)" fontSize="10" letterSpacing="2" fill={arcText}>
              <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
                CERTIFIED &middot; VERIFIED &middot;
              </textPath>
            </text>
            <text
              x="66"
              y="72"
              fontFamily="var(--font-display)"
              fontWeight={700}
              fontSize="30"
              textAnchor="middle"
              fill="var(--ink)"
            >
              {percent}%
            </text>
            <text
              x="66"
              y="90"
              fontFamily="var(--font-mono)"
              fontSize="9"
              letterSpacing="1.5"
              textAnchor="middle"
              fill="var(--muted)"
            >
              {side.toUpperCase()} SCORE
            </text>
          </svg>
        </div>

        <h3
          className="text-center mt-3 mb-4"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: format === "portrait" ? 24 : 20,
            color: "var(--ink)",
          }}
        >
          {tier.title}
        </h3>

        {format === "portrait" && (
          <>
            <div className="border-t border-dashed my-3.5" style={{ borderColor: "var(--divider)" }} />
            <div className="text-xs" style={{ fontFamily: "var(--font-mono)" }}>
              <Row label="Status" value="Successful" valueColor={arcText} />
              <Row label={`${side === "nepo" ? "Nepo" : "Lapo"} score`} value={`${percent}%`} />
              {/* No reference number: it means nothing to the person holding
                  the certificate and clutters a thing meant to be shared. The
                  tx_ref stays server-side, where it's actually used. */}
              <Row label="Date" value={new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} />
            </div>
            <div className="border-t border-dashed my-3.5" style={{ borderColor: "var(--divider)" }} />
          </>
        )}

        <p
          className="italic text-[13.5px] leading-relaxed"
          style={{ fontFamily: "var(--font-body)", color: "var(--ink-soft)" }}
        >
          &ldquo;{roastLine}&rdquo;
        </p>

        <div
          className="mt-auto pt-3.5 flex items-center justify-between text-[10.5px] tracking-wide"
          style={{ fontFamily: "var(--font-mono)", color: "var(--muted-2)" }}
        >
          <span>{SITE_DOMAIN}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between py-1" style={{ color: "var(--muted)" }}>
      <span>{label}</span>
      <span style={{ color: valueColor ?? "var(--ink)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
