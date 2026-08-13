# Nepo Detector — Brand Assets

Colors used throughout: Dark Indigo `#23003F`, Red `#F94500`, Light Purple `#BCACCE`, Light Yellow `#FFFDB4`.

## /svg — vector source files (use these for print, app store listings, or re-exporting at any size)

- `icon-light.svg` — full icon with dark indigo circle background. Use on light surfaces.
- `icon-dark-bg.svg` — icon with transparent background, meant to sit directly on a dark indigo (or similarly dark) surface.
- `icon-mono.svg` — single-color (indigo) outline version for watermarks, stamps, or single-color print contexts.
- `wordmark-light.svg` / `wordmark-dark.svg` — text lockup only, no icon.
- `lockup-horizontal-light.svg` / `lockup-horizontal-dark.svg` — icon + wordmark side by side, for headers/nav bars.

## /png — rasterized exports

- `icon-light-{64,128,192,256,512,1024}.png` — app icons / social profile pictures. 512 and 1024 cover app store submission sizes; 192 covers Android/PWA manifest icons.
- `icon-dark-bg-{...}.png` — same size set, transparent background version.
- `icon-mono-{...}.png` — same size set, single-color version.
- `favicon.ico` — multi-resolution (16/32/48/64/128/256px) favicon, ready to drop in as `/public/favicon.ico`.
- `wordmark-{light,dark}@2x.png` / `@4x.png` — retina-ready wordmark exports.
- `lockup-horizontal-{light,dark}@2x.png` — retina-ready horizontal lockup exports.

## Fonts used

- **Space Grotesk** (700 weight) — wordmark, headline text
- **IBM Plex Mono** (500 weight) — tagline, data/receipt-style text

Both are free on Google Fonts. For the live web app, load them via `<link>` (already set up in the Next.js build) rather than baking them into every asset.

## Notes

- The dashed ring and stamp-style construction intentionally echoes the "certificate" motif used on the result cards, so the logo and in-app reveal feel like the same system.
- `icon-mono.svg` is the one to hand off if you ever need single-color merch, a wax-seal-style favicon, or a printed stamp — everything else assumes full color.
