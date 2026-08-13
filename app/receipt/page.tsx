"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ResultCard from "@/components/ResultCard";
import BrandMark from "@/components/BrandMark";
import { getTier } from "@/data/tiers";
import { scoreSession } from "@/lib/scoring";
import { UNLOCK_PRICE_LABEL } from "@/lib/payment";
import { StoredSession, loadSession, saveSessionCharge } from "@/lib/session";

/**
 * Where a successful payment lands.
 *
 * Reached two ways: the Inline modal's callback pushes here, and it is also the
 * `redirect_url` Flutterwave uses for methods that leave the page (some bank
 * and USSD flows), which return with `transaction_id` / `tx_ref` in the query
 * string. Either way the transaction is re-verified server-side on arrival —
 * arriving at this URL, with any query string, proves nothing on its own.
 */

type State = "loading" | "ready" | "paid_no_session" | "unpaid" | "missing";
type MailState = "sending" | "sent" | "failed" | "not_configured";

const LEAN_LABEL: Record<string, string> = {
  nepo: "Nepo",
  lapo: "Lapo",
  mixed: "Both ways",
  pass: "Passed",
};

/** The transaction to check: query string first (redirect), then the session. */
function resolveTransaction(stored: StoredSession | null): { id: string; ref: string } | null {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("transaction_id");
    const ref = params.get("tx_ref");
    if (id && ref) return { id, ref };
  }
  if (stored?.charge) return { id: stored.charge.id, ref: stored.charge.reference };
  return null;
}

export default function ReceiptPage() {
  const [state, setState] = useState<State>("loading");
  const [session, setSession] = useState<StoredSession | null>(null);
  const [method, setMethod] = useState<string | null>(null);
  const [txRef, setTxRef] = useState<string | null>(null);
  const [mail, setMail] = useState<MailState>("sending");
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const sent = useRef(false);

  const emailReceipt = useCallback(
    async (stored: StoredSession, tx: { id: string; ref: string }) => {
      // React mounts effects twice in dev; without this the user gets two
      // receipts for one payment.
      if (sent.current) return;
      sent.current = true;

      const score = scoreSession(stored.questions, stored.answers);
      if (score.nepoPercent === null) return;

      const tier = getTier(score.nepoPercent);
      try {
        const res = await fetch("/api/send-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: tx.id,
            txRef: tx.ref,
            percent: score.nepoPercent,
            side: score.nepoPercent >= 50 ? "nepo" : "lapo",
            roastLine: stored.roastLine ?? tier.freeSummary,
            refCode: stored.refCode,
            breakdown: score.breakdown,
          }),
        });
        const data = await res.json();
        if (data.sent) {
          setMaskedEmail(data.to ?? null);
          setMail("sent");
        } else {
          setMail(data.reason === "email_not_configured" ? "not_configured" : "failed");
        }
      } catch {
        setMail("failed");
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = loadSession();
      const tx = resolveTransaction(stored);

      if (!tx) {
        if (!cancelled) setState("missing");
        return;
      }

      // Landing via redirect: persist so a refresh still works.
      if (stored && stored.charge?.id !== tx.id) {
        saveSessionCharge({ id: tx.id, reference: tx.ref });
      }

      try {
        const res = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId: tx.id, txRef: tx.ref }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (!data.verified) {
          setState("unpaid");
          return;
        }

        setMethod(data.method ?? null);
        setTxRef(tx.ref);

        if (!stored) {
          setState("paid_no_session");
          return;
        }

        setSession(stored);
        setState("ready");
        void emailReceipt(stored, tx);
      } catch {
        if (!cancelled) setState("unpaid");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [emailReceipt]);

  if (state === "loading") {
    return (
      <Centered>
        <BrandMark size={64} spinRing />
        <p className="mt-5 text-sm" style={{ color: "var(--on-dark-muted)" }}>
          Confirming your payment…
        </p>
      </Centered>
    );
  }

  if (state === "missing" || state === "unpaid" || state === "paid_no_session") {
    const paid = state === "paid_no_session";
    return (
      <Centered>
        <BrandMark size={64} />
        <h1
          className="mt-5 text-xl"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--butter)" }}
        >
          {paid
            ? "Payment confirmed"
            : state === "missing"
              ? "We lost the thread"
              : "That payment isn't confirmed"}
        </h1>
        <p className="mt-2 text-sm max-w-xs" style={{ color: "var(--on-dark-muted)" }}>
          {paid
            ? "Your payment went through, but this tab no longer has your answers, so we can't rebuild the breakdown here."
            : state === "missing"
              ? "We couldn't find a payment to confirm in this tab."
              : "If you've been debited it can take a moment to clear. Don't pay again — contact support with your reference."}
        </p>
        {txRef && (
          <p className="mt-3 text-[11px]" style={{ fontFamily: "var(--font-mono)", color: "var(--on-dark-muted)" }}>
            Ref {txRef}
          </p>
        )}
        <Link
          href="/"
          className="btn-primary mt-6 px-5 py-2.5 rounded-md text-sm font-medium no-underline"
        >
          Start again
        </Link>
      </Centered>
    );
  }

  const stored = session!;
  const score = scoreSession(stored.questions, stored.answers);
  const percent = score.nepoPercent ?? 50;
  const tier = getTier(percent);
  const side = percent >= 50 ? "nepo" : "lapo";

  return (
    <div className="px-6 py-10 max-w-md mx-auto w-full">
      <div className="flex flex-col items-center text-center mb-7">
        <BrandMark size={52} />
        <h1
          className="mt-3 text-xl"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--butter)" }}
        >
          Payment confirmed
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--on-dark-muted)" }}>
          {mail === "sending" && "Sending your receipt…"}
          {mail === "sent" && `Receipt and full analysis sent to ${maskedEmail ?? "your email"}.`}
          {mail === "failed" &&
            "We couldn't email your receipt just now — everything is below, and you can screenshot it."}
          {mail === "not_configured" &&
            "Email isn't switched on in this environment — your full analysis is below."}
        </p>
      </div>

      <ResultCard
        tier={tier}
        percent={percent}
        side={side}
        roastLine={stored.roastLine ?? tier.freeSummary}
        photo={stored.photo}
        refCode={stored.refCode}
      />

      <section className="panel rounded-md px-4 py-4 mt-5">
        <h2
          className="text-[11px] tracking-[0.14em] uppercase mb-3"
          style={{ fontFamily: "var(--font-mono)", color: "var(--on-dark-muted)" }}
        >
          Receipt
        </h2>
        <Row label="Amount" value={UNLOCK_PRICE_LABEL} />
        <Row label="Method" value={method ?? "Flutterwave"} />
        <Row label="Reference" value={txRef ?? "—"} />
        <Row label="Status" value="Paid" />
      </section>

      <section className="panel rounded-md px-4 py-4 mt-4">
        <h2
          className="text-[11px] tracking-[0.14em] uppercase mb-3"
          style={{ fontFamily: "var(--font-mono)", color: "var(--on-dark-muted)" }}
        >
          Your answers, line by line
        </h2>
        <ul className="space-y-3">
          {score.breakdown.map((row, i) => (
            <li
              key={i}
              className="pt-3"
              style={i > 0 ? { borderTop: "1px solid var(--border-dark)" } : undefined}
            >
              <p className="text-[11px] leading-snug" style={{ color: "var(--on-dark-muted)" }}>
                {row.questionText}
              </p>
              <p className="text-sm leading-snug mt-0.5" style={{ color: "var(--on-dark)" }}>
                {row.optionText}
              </p>
              <span
                className="inline-block mt-1.5 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{
                  background: row.lean === "lapo" ? "var(--orange)" : "var(--indigo-500)",
                  color: row.lean === "lapo" ? "var(--butter)" : "var(--on-dark)",
                }}
              >
                {LEAN_LABEL[row.lean] ?? row.lean}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/"
        className="btn-ghost block text-center mt-5 px-5 py-2.5 rounded-md text-sm no-underline"
      >
        Run it again
      </Link>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-8 text-center"
      style={{ minHeight: "100dvh" }}
    >
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between gap-3 py-1 text-xs"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <span style={{ color: "var(--on-dark-muted)" }}>{label}</span>
      <span className="text-right break-all" style={{ color: "var(--butter)" }}>
        {value}
      </span>
    </div>
  );
}
