"use client";

import { useRef, useState } from "react";

export default function PhotoUpload({
  onDone,
}: {
  onDone: (photoDataUrl: string | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [confirmedAge, setConfirmedAge] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="max-w-md mx-auto px-6 py-10">
      <p
        className="text-[11px] tracking-[0.12em] uppercase mb-3"
        style={{ fontFamily: "var(--font-mono)", color: "var(--on-dark-muted)" }}
      >
        Optional
      </p>
      <h2
        className="text-xl mb-2"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--butter)" }}
      >
        Put your face on the certificate
      </h2>
      <p className="text-sm mb-6" style={{ color: "var(--on-dark-muted)" }}>
        It stays on your device and never leaves it &mdash; we don&apos;t upload or store it. Skip if
        you&apos;d rather not.
      </p>

      <div className="flex flex-col items-center gap-4">
        <label
          className="flex items-center gap-2 text-xs mb-1"
          style={{ color: "var(--on-dark-muted)" }}
        >
          <input
            type="checkbox"
            checked={confirmedAge}
            onChange={(e) => setConfirmedAge(e.target.checked)}
            style={{ accentColor: "var(--orange)" }}
          />
          I confirm I&apos;m 18 or older
        </label>

        <button
          onClick={() => confirmedAge && inputRef.current?.click()}
          disabled={!confirmedAge}
          className="w-28 h-28 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 disabled:opacity-40"
          style={{ borderColor: "var(--lilac)", background: "var(--surface-raised)" }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Your photo preview" className="w-full h-full object-cover rounded-md" />
          ) : (
            <span
              className="text-[10px] uppercase tracking-wide text-center px-2"
              style={{ fontFamily: "var(--font-mono)", color: "var(--on-dark-muted)" }}
            >
              Tap to add photo
            </span>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <div className="flex gap-3 mt-2">
          <button
            onClick={() => onDone(null)}
            className="btn-ghost px-4 py-2 rounded-md text-sm"
          >
            Skip
          </button>
          <button
            onClick={() => onDone(preview)}
            disabled={!preview}
            className="btn-primary px-4 py-2 rounded-md text-sm font-medium"
          >
            Continue with photo
          </button>
        </div>
      </div>
    </div>
  );
}
