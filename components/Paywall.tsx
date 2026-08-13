"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethod, UNLOCK_PRICE_LABEL } from "@/lib/payment";
import { saveSessionCharge } from "@/lib/session";

interface NextAction {
  type?: string;
  redirect_url?: { url?: string };
  payment_instruction?: { note?: string };
  requires_bank_transfer?: {
    account_number?: string;
    account_bank_name?: string;
    account_expiration_datetime?: string;
  };
}

interface Bank {
  code: string;
  name: string;
}

type Stage = "details" | "working" | "otp" | "pin" | "waiting" | "error";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  card: "Card",
  ussd: "USSD",
  bank_transfer: "Transfer",
};

const fieldStyle: React.CSSProperties = {
  background: "var(--indigo-900)",
  border: "1px solid var(--border-dark)",
  color: "var(--on-dark)",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Turns Flutterwave's wording into something a payer can act on. Anything we
 * don't recognise is passed through — their messages are usually decent.
 */
function friendlyError(detail: string | undefined, fallback: string): string {
  if (!detail) return fallback;
  if (/invalid bank code/i.test(detail)) {
    return "That bank doesn't support USSD payments. Try another bank, or pay by card or transfer.";
  }
  if (/redirect url/i.test(detail)) {
    return "Checkout is misconfigured for this environment. Please try card or transfer.";
  }
  return detail;
}

/** How long to keep polling an async method (transfer/USSD) before giving up. */
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export default function Paywall() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("details");
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("card");

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState("");

  const [code, setCode] = useState(""); // OTP or PIN
  const [instruction, setInstruction] = useState<NextAction | null>(null);

  const charge = useRef<{ id: string; reference: string } | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the bank list only when USSD is actually chosen.
  useEffect(() => {
    if (method !== "ussd" || banks.length) return;
    let cancelled = false;
    fetch("/api/banks")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d.banks)) setBanks(d.banks);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [method, banks.length]);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  /**
   * Records the charge against the stored session and hands over to /receipt,
   * which re-verifies server-side, renders the full analysis and sends the
   * email. Every success path funnels through here.
   */
  const completePayment = useCallback(() => {
    router.push("/receipt");
  }, [router]);

  const verify = useCallback(async (): Promise<boolean> => {
    if (!charge.current) return false;
    try {
      const res = await fetch("/api/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chargeId: charge.current.id,
          reference: charge.current.reference,
        }),
      });
      const data = await res.json();
      return data.verified === true;
    } catch {
      return false;
    }
  }, []);

  /** Polls until the charge is confirmed paid, or we run out of patience. */
  const pollUntilPaid = useCallback(() => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    const tick = async () => {
      if (await verify()) {
        completePayment();
        return;
      }
      if (Date.now() >= deadline) {
        setStage("error");
        setError(
          "We haven't seen that payment yet. If you've been debited it can take a moment — reload this page shortly.",
        );
        return;
      }
      pollTimer.current = setTimeout(tick, POLL_INTERVAL_MS);
    };

    pollTimer.current = setTimeout(tick, POLL_INTERVAL_MS);
  }, [verify, completePayment]);

  /** Routes on whatever Flutterwave says it needs next. */
  const handleNextAction = useCallback(
    async (next: NextAction | null, status?: string) => {
      if (status === "succeeded" || (await verify())) {
        completePayment();
        return;
      }

      switch (next?.type) {
        case "redirect_url":
          if (next.redirect_url?.url) {
            window.location.href = next.redirect_url.url;
            return;
          }
          break;
        case "requires_otp":
          setCode("");
          setStage("otp");
          return;
        case "requires_pin":
          setCode("");
          setStage("pin");
          return;
        case "payment_instruction":
        case "requires_bank_transfer":
          setInstruction(next);
          setStage("waiting");
          pollUntilPaid();
          return;
      }

      // No actionable next step: treat as pending and watch for it to land.
      setStage("waiting");
      pollUntilPaid();
    },
    [verify, completePayment, pollUntilPaid],
  );

  async function startCheckout() {
    setError(null);
    setStage("working");

    const [expiryMonth, expiryYear] = expiry.split("/").map((s) => s.trim());

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          method,
          ...(method === "card"
            ? { card: { number: cardNumber, expiryMonth, expiryYear, cvv } }
            : {}),
          ...(method === "ussd" ? { ussd: { bankCode } } : {}),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStage("error");
        setError(
          friendlyError(data.detail, "That payment couldn't be started. Please try again."),
        );
        return;
      }

      charge.current = { id: data.chargeId, reference: data.reference };
      // Recorded now, not on success: a 3DS card sends the browser off-site to
      // the bank before any success handler runs, and the return trip has to be
      // able to find this charge again.
      saveSessionCharge({ id: data.chargeId, reference: data.reference, method });
      await handleNextAction(data.nextAction, data.status);
    } catch {
      setStage("error");
      setError("Network problem — check your connection and try again.");
    }
  }

  async function submitAuthorization() {
    setError(null);
    const type = stage === "otp" ? "otp" : "pin";
    setStage("working");

    try {
      const res = await fetch("/api/authorize-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargeId: charge.current?.id, type, value: code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStage(type);
        setError(friendlyError(data.detail, `That ${type.toUpperCase()} wasn't accepted.`));
        return;
      }

      await handleNextAction(data.nextAction, data.status);
    } catch {
      setStage(type);
      setError("Network problem — please try again.");
    }
  }

  const detailsValid =
    EMAIL_RE.test(email) &&
    (method === "card"
      ? cardNumber.replace(/\s/g, "").length >= 13 && /^\d{2}\s*\/\s*\d{2,4}$/.test(expiry) && cvv.length >= 3
      : method === "ussd"
        ? bankCode !== ""
        : true);

  return (
    <div className="panel max-w-[300px] mx-auto mt-4 rounded-md px-4 py-4">
      <p className="text-sm mb-3 text-center" style={{ color: "var(--butter)" }}>
        Unlock your full breakdown &mdash; the real reasons behind your score.
      </p>

      {stage === "details" && (
        <>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-label="Email address"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md px-3 py-2 text-sm mb-3"
            style={fieldStyle}
          />

          <div className="flex gap-1.5 mb-3">
            {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className="flex-1 rounded-md py-1.5 text-[11px] font-medium"
                style={
                  method === m
                    ? { background: "var(--orange)", color: "var(--butter)" }
                    : { ...fieldStyle }
                }
              >
                {METHOD_LABELS[m]}
              </button>
            ))}
          </div>

          {method === "card" && (
            <>
              <input
                inputMode="numeric"
                autoComplete="cc-number"
                aria-label="Card number"
                placeholder="Card number"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full rounded-md px-3 py-2 text-sm mb-2"
                style={fieldStyle}
              />
              <div className="flex gap-2 mb-3">
                <input
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  aria-label="Expiry date"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-1/2 rounded-md px-3 py-2 text-sm"
                  style={fieldStyle}
                />
                <input
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  aria-label="CVV"
                  placeholder="CVV"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  className="w-1/2 rounded-md px-3 py-2 text-sm"
                  style={fieldStyle}
                />
              </div>
            </>
          )}

          {method === "ussd" && (
            <select
              aria-label="Your bank"
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full rounded-md px-3 py-2 text-sm mb-3"
              style={fieldStyle}
            >
              <option value="">{banks.length ? "Choose your bank" : "Loading banks…"}</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {method === "bank_transfer" && (
            <p className="text-[11px] mb-3 text-center" style={{ color: "var(--on-dark-muted)" }}>
              We&apos;ll show you an account to transfer to.
            </p>
          )}

          <button
            onClick={startCheckout}
            disabled={!detailsValid}
            className="btn-primary w-full py-2.5 rounded-md text-sm font-medium"
          >
            Pay {UNLOCK_PRICE_LABEL}
          </button>
        </>
      )}

      {stage === "working" && (
        <p className="text-sm text-center py-3" style={{ color: "var(--on-dark-muted)" }}>
          Talking to your bank…
        </p>
      )}

      {(stage === "otp" || stage === "pin") && (
        <>
          <p className="text-[11px] mb-2 text-center" style={{ color: "var(--on-dark-muted)" }}>
            {stage === "otp"
              ? "Enter the OTP your bank just sent you."
              : "Enter your 4-digit card PIN."}
          </p>
          <input
            inputMode="numeric"
            aria-label={stage === "otp" ? "One-time password" : "Card PIN"}
            placeholder={stage === "otp" ? "OTP" : "PIN"}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-md px-3 py-2 text-sm mb-3 text-center tracking-[0.3em]"
            style={fieldStyle}
          />
          <button
            onClick={submitAuthorization}
            disabled={code.length < (stage === "otp" ? 4 : 4)}
            className="btn-primary w-full py-2.5 rounded-md text-sm font-medium"
          >
            Confirm
          </button>
        </>
      )}

      {stage === "waiting" && (
        <div className="text-center">
          {instruction?.requires_bank_transfer ? (
            <div
              className="rounded-md px-3 py-3 mb-3 text-left"
              style={{ background: "var(--indigo-900)" }}
            >
              <p className="text-[10px] mb-1" style={{ color: "var(--on-dark-muted)" }}>
                Transfer {UNLOCK_PRICE_LABEL} to
              </p>
              <p
                className="text-lg font-medium"
                style={{ color: "var(--butter)", fontFamily: "var(--font-mono)" }}
              >
                {instruction.requires_bank_transfer.account_number}
              </p>
              <p className="text-[11px]" style={{ color: "var(--on-dark)" }}>
                {instruction.requires_bank_transfer.account_bank_name}
              </p>
            </div>
          ) : (
            <p className="text-[12px] mb-3" style={{ color: "var(--on-dark)" }}>
              {instruction?.payment_instruction?.note ?? "Follow the prompt on your phone."}
            </p>
          )}
          <p className="text-[11px]" style={{ color: "var(--on-dark-muted)" }}>
            Waiting for payment… this unlocks automatically.
          </p>
        </div>
      )}

      {stage === "error" && (
        <button
          onClick={() => {
            setStage("details");
            setError(null);
          }}
          className="btn-ghost w-full py-2 rounded-md text-sm mt-1"
        >
          Try again
        </button>
      )}

      {error && (
        <p className="text-[11px] mt-2 text-center" style={{ color: "var(--orange)" }}>
          {error}
        </p>
      )}

      {stage === "details" && (
        <p className="text-[10px] mt-2 text-center" style={{ color: "var(--on-dark-muted)" }}>
          Sandbox mode &mdash; use a Flutterwave test card.
        </p>
      )}
    </div>
  );
}
