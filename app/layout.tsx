import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Absolute base for og:image and friends. Without this Next falls back to
 * localhost, which silently ships broken link previews to production.
 * Vercel supplies the deployment host; NEXT_PUBLIC_SITE_URL overrides both.
 */
// Truthiness, not `??`: an env var declared but left blank in .env comes
// through as "" rather than undefined, and `new URL("")` throws at build time.
const configuredUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://nepodetector.ng");

/**
 * A bare hostname ("example.com") is the natural thing to put in an env var and
 * the one thing `new URL()` rejects — which fails the whole build, at
 * /_not-found, with no mention of the variable at fault. Add the scheme rather
 * than make everyone rediscover that.
 */
function toOrigin(value: string): URL {
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withScheme);
  } catch {
    return new URL("https://nepodetector.ng");
  }
}

export const metadata: Metadata = {
  metadataBase: toOrigin(configuredUrl),
  title: "Nepo Detector",
  description: "Certified Nepo Baby or certified Lapo Baby? Ten questions. No lying allowed.",
  openGraph: {
    title: "Nepo Detector",
    description: "Certified Nepo Baby or certified Lapo Baby? Ten questions. No lying allowed.",
    siteName: "Nepo Detector",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nepo Detector",
    description: "Certified Nepo Baby or certified Lapo Baby? Ten questions. No lying allowed.",
  },
};

export const viewport: Viewport = {
  themeColor: "#23003F",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
