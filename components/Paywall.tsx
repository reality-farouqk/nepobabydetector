"use client";

import { useEffect, useRef, useState } from "react";
import { encodeAnswers } from "@/lib/answersCodec";
import { UNLOCK_PRICE_LABEL } from "@/lib/payment";
import { loadSession, saveSessionCharge } from "@/lib/session";

/**
 * Checkout via Flutterwave Standard.
 *
 * The button asks our server for a hosted payment link and then sends the
 * browser to it. Card number, PIN, OTP, 3DS and bank selection all happen on
 * Flutterwave's own site; this app never sees, stores or transmits a card
 * detail, and there is no payment SDK or key in the browser bundle. All we
 * collect is an email for the receipt.
 *
 * Flutterwave returns the user to /receipt, which re-verifies the transaction
 * server-side before showing anything.
 *
 * Presented as a dialog rather than a panel at the foot of the page: sitting
 * below the certificate and the share row, it was reliably scrolled past.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "redirecting" | "error";

export default function Paywall({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape closes, and the page behind stops scrolling while it's up.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "redirecting") onClose();
    };
    document.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, status]);

  async function handlePayClick() {
    setError(null);
    setStatus("redirecting");

    // Sent so the answers are stored against the transaction: if this person
    // pays and closes the tab, the webhook still has what it needs to email
    // them the full analysis.
    const stored = loadSession();

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          answers: stored ? encodeAnswers(stored.answers) : "",
          refCode: stored?.refCode ?? "",
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.link) {
        setStatus("error");
        // Error states are where trust is actually at risk, so these stay in
        // the detector's voice and always say what to do next — the worst
        // outcome is someone paying twice because we sounded uncertain.
        setError(
          data.error === "not_configured"
            ? "Checkout isn't switched on yet. Nothing was charged."
            : data.error === "rate_limited"
              ? // "Try again" is the wrong advice here — trying again is
                // precisely what's being refused.
                `Too many attempts. Wait about ${data.retryAfter ?? 60} seconds, then try once more. Nothing was charged.`
              : (data.detail ??
                "The detector couldn't open checkout. Nothing was charged — give it another go."),
        );
        return;
      }

      // Recorded before we leave so /receipt knows which reference to verify
      // when Flutterwave sends the user back.
      saveSessionCharge({ id: "", reference: data.txRef });
      window.location.href = data.link;
    } catch {
      setStatus("error");
      setError("Lost the connection before checkout opened. Nothing was charged — try again.");
    }
  }

  if (!open) return null;

  return (
    <div
      className="paywall-backdrop"
      // Clicking the backdrop dismisses, but not while we're mid-redirect —
      // closing then would look like the payment was cancelled.
      onClick={() => status !== "redirecting" && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="paywall-dialog panel w-full max-w-[320px] rounded-lg px-5 py-5 text-center"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          disabled={status === "redirecting"}
          className="absolute top-2 right-3 text-lg leading-none disabled:opacity-30"
          style={{ color: "var(--on-dark-muted)" }}
        >
          &times;
        </button>

        <p id="paywall-title" className="text-sm mb-1" style={{ color: "var(--butter)" }}>
          Unlock your full breakdown
        </p>
        <p className="text-[11px] mb-3" style={{ color: "var(--on-dark-muted)" }}>
          The real reasons behind your score, line by line.
        </p>

        <label className="sr-only" htmlFor="paywall-email">
          Email address
        </label>
        <input
        id="paywall-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === "redirecting"}
        className="w-full rounded-md px-3 py-2 text-sm mb-2 disabled:opacity-50"
        style={{
          background: "var(--indigo-900)",
          border: "1px solid var(--border-dark)",
          color: "var(--on-dark)",
        }}
        />
        <p className="text-[10px] mb-3" style={{ color: "var(--on-dark-muted)" }}>
        We send your receipt and full analysis here &mdash; so your result is safe
        even if you close this tab.
        </p>

        <button
        onClick={handlePayClick}
        disabled={!EMAIL_RE.test(email) || status === "redirecting"}
        className="btn-primary w-full py-2.5 rounded-md text-sm font-medium"
        >
        {status === "redirecting" ? "Taking you to checkout…" : `Pay ${UNLOCK_PRICE_LABEL}`}
        </button>

        <p className="text-[10px] mt-2" style={{ color: "var(--on-dark-muted)" }}>
        Card, transfer or USSD &mdash; paid securely on Flutterwave.
        </p>

        {error && (
          <p className="text-[11px] mt-2" style={{ color: "var(--orange)" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
