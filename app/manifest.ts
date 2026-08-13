import type { MetadataRoute } from "next";

/**
 * Installable to the home screen. Worth having for a mobile-first Nigerian
 * audience where "add to home screen" is a common substitute for an app store
 * download, and it costs nothing beyond this file.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nepo Detector",
    short_name: "Nepo Detector",
    description: "Certified Nepo Baby or certified Lapo Baby? Ten questions. No lying allowed.",
    start_url: "/",
    display: "standalone",
    background_color: "#23003F",
    theme_color: "#23003F",
    icons: [
      {
        src: "/brand-assets/png/icon-light-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand-assets/png/icon-light-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/brand-assets/png/icon-dark-bg-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
