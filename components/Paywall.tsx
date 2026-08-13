"use client";

import { useState } from "react";
import { UNLOCK_PRICE_LABEL } from "@/lib/payment";
import { saveSessionCharge } from "@/lib/session";

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
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "redirecting" | "error";

export default function Paywall() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handlePayClick() {
    setError(null);
    setStatus("redirecting");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok || !data.link) {
        setStatus("error");
        setError(
          data.error === "not_configured"
            ? "Checkout isn't configured yet. Set FLW_SECRET_KEY to take payments."
            : (data.detail ?? "We couldn't start that payment. Please try again."),
        );
        return;
      }

      // Recorded before we leave so /receipt knows which reference to verify
      // when Flutterwave sends the user back.
      saveSessionCharge({ id: "", reference: data.txRef });
      window.location.href = data.link;
    } catch {
      setStatus("error");
      setError("Network problem — check your connection and try again.");
    }
  }

  return (
    <div className="panel max-w-[300px] mx-auto mt-4 rounded-md px-4 py-4 text-center">
      <p className="text-sm mb-3" style={{ color: "var(--butter)" }}>
        Unlock your full breakdown &mdash; the real reasons behind your score.
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
        We send your receipt and full analysis here.
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
  );
}
