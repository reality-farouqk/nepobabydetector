import { SITE_ORIGIN } from "@/lib/site";

/**
 * Share links and codes.
 *
 * A result has no database row, so the score itself is the URL: /r/93-NPD4242
 * carries everything needed to re-render the certificate. That makes shared
 * links stateless, permanent, and cheap — and it means the page a friend opens
 * unfurls with the sharer's actual result rather than a generic banner.
 */

/**
 * Compact, URL-safe code for one result.
 *
 * The score alone — reference codes are deliberately kept off everything the
 * user sees, including the URL they paste into a group chat. The older
 * `93-NPD4242` form is still parsed so links already shared keep working.
 */
export function shareCode(percent: number): string {
  return String(Math.min(100, Math.max(0, Math.round(percent))));
}

export function parseShareCode(code: string): { percent: number; ref: string } | null {
  const match = /^(\d{1,3})(?:-([A-Za-z0-9]{1,12}))?$/.exec(code);
  if (!match) return null;
  const percent = Number(match[1]);
  if (percent > 100) return null;
  return { percent, ref: match[2] ?? "" };
}

/** The 1080×1080 PNG itself. */
export function shareImagePath(percent: number): string {
  return `/api/share-image?p=${Math.round(percent)}`;
}

/** The public page a friend lands on, which unfurls as the certificate. */
export function sharePageUrl(percent: number): string {
  return new URL(`/r/${shareCode(percent)}`, SITE_ORIGIN).toString();
}

/** What gets posted alongside the image. */
export function shareText(tierTitle: string, percent: number, side: "nepo" | "lapo"): string {
  return `I'm ${percent}% ${side} — "${tierTitle}". Run the Nepo Detector on yourself:`;
}

/**
 * Per-network share URLs, for when the OS share sheet isn't available.
 * Instagram and TikTok are absent on purpose: neither accepts a prefilled web
 * share, so those go through "save the image, then post it".
 */
export function networkShareUrls(text: string, url: string) {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
  };
}
