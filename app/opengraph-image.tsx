import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Nepo Detector — Certified Nepo Baby or certified Lapo Baby?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social preview card. This app lives or dies on people sharing their result,
 * so the link unfurl is a real surface, not an afterthought.
 *
 * The brand lockup is embedded as a data URI rather than fetched over the
 * network: og image generation runs at build time where there is no origin to
 * fetch from, and the real artwork beats re-drawing the wordmark in a fallback
 * font (ImageResponse has no Space Grotesk unless we ship the font binary).
 */
export default async function OpengraphImage() {
  const lockup = await readFile(
    join(process.cwd(), "public/brand-assets/png/lockup-horizontal-dark@2x.png"),
  );
  const lockupSrc = `data:image/png;base64,${lockup.toString("base64")}`;

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
          background: "#23003F",
        }}
      >
        <img src={lockupSrc} alt="" width={840} height={225} />
        <div
          style={{
            marginTop: 24,
            fontSize: 34,
            color: "#BCACCE",
            letterSpacing: "-0.01em",
          }}
        >
          Ten questions. No lying allowed.
        </div>
      </div>
    ),
    size,
  );
}
