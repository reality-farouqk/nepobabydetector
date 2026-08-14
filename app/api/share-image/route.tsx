import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { getTier } from "@/data/tiers";
import { SITE_DOMAIN } from "@/lib/site";

/**
 * The shareable certificate, rendered server-side.
 *
 * Server-side rather than html-to-canvas in the browser because it needs no
 * client dependency, renders identically everywhere, and — the real reason —
 * produces a plain image URL. WhatsApp, Facebook and X can unfurl a URL;
 * they can't unfurl a canvas blob. Instagram and TikTok have no share URL at
 * all, so those get the same PNG via download.
 *
 * 1080×1080: square is the one aspect ratio that survives every feed intact.
 */

export const runtime = "nodejs";

const SIZE = 1080;
const INDIGO = "#23003F";
const INDIGO_DEEP = "#17002A";
const ORANGE = "#F94500";
const LILAC = "#BCACCE";
const BUTTER = "#FFFDB4";
const INK_SOFT = "#3A2350";
const PLUM = "#5B2E86";

/** Only what we can render safely — everything else is derived server-side. */
function readParams(req: NextRequest) {
  const raw = Number(req.nextUrl.searchParams.get("p"));
  const percent = Number.isFinite(raw) ? Math.min(100, Math.max(0, Math.round(raw))) : 50;
  return { percent };
}

export async function GET(req: NextRequest) {
  const { percent } = readParams(req);
  const tier = getTier(percent);
  const side = percent >= 50 ? "NEPO" : "LAPO";
  const isNepo = tier.accent === "gold";
  const accent = isNepo ? PLUM : ORANGE;
  const sealFill = isNepo ? "#DED4E8" : "#FFDCC9";

  const [font, icon] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/SpaceGrotesk-Bold.ttf")),
    readFile(join(process.cwd(), "public/brand-assets/png/icon-dark-bg-256.png")),
  ]);
  const iconSrc = `data:image/png;base64,${icon.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: INDIGO_DEEP,
          padding: 48,
          fontFamily: "Space Grotesk",
        }}
      >
        {/* The certificate */}
        <div
          style={{
            width: 984,
            height: 984,
            display: "flex",
            flexDirection: "column",
            borderRadius: 28,
            background: BUTTER,
            overflow: "hidden",
          }}
        >
          {/* Header strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: INDIGO,
              padding: "26px 40px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              {/* Satori renders this, not the browser — next/image has no
                  meaning inside an ImageResponse tree. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={iconSrc} width={52} height={52} alt="" />
              <div style={{ display: "flex", marginLeft: 16, fontSize: 30 }}>
                <span style={{ color: BUTTER }}>NEPO</span>
                <span style={{ color: ORANGE }}>DETECTOR</span>
              </div>
            </div>
            <div style={{ color: LILAC, fontSize: 20, letterSpacing: 4 }}>ALERT</div>
          </div>

          {/* Body */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 56px",
            }}
          >
            {/* Seal */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: 340,
                height: 340,
                borderRadius: 170,
                background: sealFill,
                border: `6px dashed ${accent}`,
              }}
            >
              {/* Template literals, not `{percent}%` — adjacent JSX nodes count as
                  multiple children and Satori rejects those without display:flex. */}
              <div style={{ color: INDIGO, fontSize: 128, lineHeight: 1 }}>{`${percent}%`}</div>
              <div style={{ color: accent, fontSize: 24, letterSpacing: 6, marginTop: 10 }}>
                {`${side} SCORE`}
              </div>
            </div>

            <div
              style={{
                color: INDIGO,
                fontSize: 62,
                textAlign: "center",
                marginTop: 44,
                lineHeight: 1.15,
              }}
            >
              {tier.title}
            </div>

            <div
              style={{
                color: INK_SOFT,
                fontSize: 27,
                textAlign: "center",
                marginTop: 22,
                lineHeight: 1.5,
                maxWidth: 760,
              }}
            >
              {tier.freeSummary}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "26px 40px",
              borderTop: `2px dashed #D9D37B`,
              color: "#7A6A88",
              fontSize: 22,
            }}
          >
            <span>{SITE_DOMAIN}</span>
            <span>CERTIFIED · VERIFIED</span>
          </div>
        </div>
      </div>
    ),
    {
      width: SIZE,
      height: SIZE,
      fonts: [{ name: "Space Grotesk", data: font, weight: 700, style: "normal" }],
      headers: {
        // Deterministic for a given score, so let it cache hard.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
