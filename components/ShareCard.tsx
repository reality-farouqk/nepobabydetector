"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import { networkShareUrls, shareImagePath, sharePageUrl, shareText } from "@/lib/share";
import {
  DownloadIcon,
  FacebookIcon,
  LinkIcon,
  ShareIcon,
  TelegramIcon,
  WhatsAppIcon,
  XIcon,
} from "./ShareIcons";

/**
 * Share the certificate.
 *
 * Three tiers of capability, best first:
 *   1. OS share sheet with the PNG attached — one tap to WhatsApp, Instagram,
 *      TikTok, anything installed. Mobile Chrome/Safari.
 *   2. OS share sheet with just the link, if files aren't supported.
 *   3. Per-network links + a download button, for desktop.
 *
 * Instagram and TikTok get no direct button because neither accepts a prefilled
 * web share — for those the honest flow is save-then-post, which is what the
 * download button is for.
 */

type Net = keyof ReturnType<typeof networkShareUrls>;

/** Each network's own brand colour, so the row is scannable by colour alone. */
const NETWORKS: { key: Net; label: string; Icon: typeof WhatsAppIcon; color: string }[] = [
  { key: "whatsapp", label: "WhatsApp", Icon: WhatsAppIcon, color: "#25D366" },
  { key: "facebook", label: "Facebook", Icon: FacebookIcon, color: "#0866FF" },
  { key: "x", label: "X", Icon: XIcon, color: "#FFFFFF" },
  { key: "telegram", label: "Telegram", Icon: TelegramIcon, color: "#29A9EB" },
];

export default function ShareCard({
  percent,
  tierTitle,
  side,
}: {
  percent: number;
  tierTitle: string;
  side: "nepo" | "lapo";
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const pageUrl = sharePageUrl(percent);
  const text = shareText(tierTitle, percent, side);
  const imgPath = shareImagePath(percent);
  const links = networkShareUrls(text, pageUrl);

  async function fetchImageFile(): Promise<File | null> {
    try {
      const res = await fetch(imgPath);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new File([blob], `nepo-detector-${percent}.png`, { type: "image/png" });
    } catch {
      return null;
    }
  }

  async function handleNativeShare() {
    setNote(null);
    setBusy(true);
    try {
      const file = await fetchImageFile();

      // canShare({files}) must be checked separately — plenty of browsers
      // expose share() but reject file payloads.
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text, title: "Nepo Detector" });
        track("share", { method: "native-file", percent });
        return;
      }

      if (navigator.share) {
        await navigator.share({ text, url: pageUrl, title: "Nepo Detector" });
        track("share", { method: "native-link", percent });
        return;
      }

      await handleCopy();
    } catch {
      // A cancelled share sheet throws AbortError; nothing has gone wrong.
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    setBusy(true);
    setNote(null);
    try {
      const file = await fetchImageFile();
      if (!file) throw new Error("no image");
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      track("share", { method: "download", percent });
      setNote("Saved. Post it to Instagram or TikTok from your gallery.");
    } catch {
      setNote("Couldn't save the image. Try the share button instead.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    try {
      // Just the URL. Pasting a link into a chat should give a link that
      // unfurls, not a paragraph the sender has to edit down.
      await navigator.clipboard.writeText(pageUrl);
      track("share", { method: "copy", percent });
      setNote("Link copied.");
    } catch {
      setNote("Couldn't copy — long-press the link to share it.");
    }
  }

  return (
    <div className="panel max-w-[300px] mx-auto mt-4 rounded-md px-4 py-4 text-center">
      <p className="text-sm mb-1" style={{ color: "var(--butter)" }}>
        Show your receipts
      </p>
      <p className="text-[11px] mb-3" style={{ color: "var(--on-dark-muted)" }}>
        Your certificate, ready to post.
      </p>

      <button
        onClick={handleNativeShare}
        disabled={busy}
        className="btn-primary w-full py-2.5 rounded-md text-sm font-medium flex items-center justify-center gap-2"
      >
        <ShareIcon size={16} />
        {busy ? "Preparing…" : "Share my certificate"}
      </button>

      <div className="grid grid-cols-2 gap-1.5 mt-2">
        {NETWORKS.map(({ key, label, Icon, color }) => (
          <a
            key={key}
            href={links[key]}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("share", { method: key, percent })}
            className="btn-ghost py-2 rounded-md text-[12px] no-underline flex items-center justify-center gap-1.5"
          >
            <span style={{ color, display: "flex" }}>
              <Icon size={14} />
            </span>
            {label}
          </a>
        ))}
      </div>

      <div className="flex gap-1.5 mt-1.5">
        <button
          onClick={handleDownload}
          disabled={busy}
          className="btn-ghost flex-1 py-2 rounded-md text-[12px] flex items-center justify-center gap-1.5"
        >
          <DownloadIcon size={14} />
          Save image
        </button>
        <button
          onClick={handleCopy}
          className="btn-ghost flex-1 py-2 rounded-md text-[12px] flex items-center justify-center gap-1.5"
        >
          <LinkIcon size={14} />
          Copy link
        </button>
      </div>

      {note && (
        <p className="text-[11px] mt-2" style={{ color: "var(--on-dark-muted)" }}>
          {note}
        </p>
      )}
    </div>
  );
}
