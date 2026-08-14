import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import { SITE_ORIGIN } from "@/lib/site";
export const metadata: Metadata = {
  // Absolute base for og:image and friends. Without this Next falls back to
  // localhost, which silently ships broken link previews to production.
  // Resolution lives in lib/site.ts so the domain is defined in exactly one place.
  metadataBase: SITE_ORIGIN,
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
      <body className="min-h-full flex flex-col">{children}<Analytics /></body>
    </html>
  );
}
