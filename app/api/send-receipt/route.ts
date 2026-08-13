import { NextRequest, NextResponse } from "next/server";
import { getTier } from "@/data/tiers";
import { EmailConfigError, sendEmail } from "@/lib/email";
import { FlutterwaveConfigError } from "@/lib/flutterwave";
import { UNLOCK_PRICE_LABEL } from "@/lib/payment";
import { buildReceiptEmail } from "@/lib/receiptEmail";
import { BreakdownRow, Lean } from "@/lib/scoring";
import { fetchCustomerEmail, isPlausibleChargeInput, verifyCharge } from "@/lib/verifyCharge";

/**
 * Emails the receipt and the full score analysis.
 *
 * Two things are deliberately NOT taken from the request:
 *   - whether the payment succeeded (re-read from Flutterwave), and
 *   - who to send to (read off the paying customer record).
 * Without the second, a single valid charge id would turn this into an open
 * mail relay pointed at any address an attacker likes.
 *
 * The score payload IS client-supplied. That's acceptable — it is the sender's
 * own quiz result and there's nothing to gain by forging it — but it's still
 * size-capped and shape-checked before it reaches the template.
 */

const MAX_BREAKDOWN_ROWS = 20;
const MAX_TEXT = 400;
const LEANS: Lean[] = ["nepo", "lapo", "mixed", "pass"];
const METHOD_LABELS: Record<string, string> = {
  card: "Card",
  ussd: "USSD",
  bank_transfer: "Bank transfer",
};

interface SendReceiptBody {
  chargeId?: unknown;
  reference?: unknown;
  tierKey?: unknown;
  percent?: unknown;
  side?: unknown;
  roastLine?: unknown;
  refCode?: unknown;
  method?: unknown;
  breakdown?: unknown;
}

function str(value: unknown, max = MAX_TEXT): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

/** Keeps only rows that look like ours, capped so a huge body can't be posted. */
function sanitizeBreakdown(value: unknown): BreakdownRow[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_BREAKDOWN_ROWS).flatMap((row): BreakdownRow[] => {
    if (!row || typeof row !== "object") return [];
    const r = row as Record<string, unknown>;
    const lean = LEANS.includes(r.lean as Lean) ? (r.lean as Lean) : "mixed";
    const questionText = str(r.questionText);
    const optionText = str(r.optionText);
    if (!questionText || !optionText) return [];
    return [
      {
        questionText,
        optionText,
        lean,
        nepo: Number(r.nepo) || 0,
        lapo: Number(r.lapo) || 0,
      },
    ];
  });
}

export async function POST(req: NextRequest) {
  let body: SendReceiptBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ sent: false, reason: "bad_request" }, { status: 400 });
  }

  if (!isPlausibleChargeInput(body.chargeId, body.reference)) {
    return NextResponse.json({ sent: false, reason: "bad_request" }, { status: 400 });
  }

  const percent = Number(body.percent);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    return NextResponse.json({ sent: false, reason: "bad_request" }, { status: 400 });
  }

  try {
    // 1. The payment must be real before we send anything.
    const outcome = await verifyCharge(body.chargeId as string, body.reference as string);
    if (!outcome.ok) {
      return NextResponse.json({ sent: false, reason: outcome.reason }, { status: 402 });
    }

    // 2. The recipient comes from the payment, not from the caller.
    const to = outcome.charge.customerId
      ? await fetchCustomerEmail(outcome.charge.customerId)
      : null;

    if (!to) {
      return NextResponse.json({ sent: false, reason: "no_customer_email" }, { status: 422 });
    }

    const tier = getTier(percent);
    const { subject, html, text } = buildReceiptEmail({
      tier,
      percent: Math.round(percent),
      side: body.side === "lapo" ? "lapo" : "nepo",
      roastLine: str(body.roastLine) || tier.freeSummary,
      breakdown: sanitizeBreakdown(body.breakdown),
      refCode: str(body.refCode, 32) || "—",
      receipt: {
        reference: outcome.charge.reference,
        amountLabel: UNLOCK_PRICE_LABEL,
        method: METHOD_LABELS[str(body.method, 20)] ?? "Card",
        paidAt: new Date(),
      },
    });

    await sendEmail({
      to,
      subject,
      html,
      text,
      // One receipt per charge, however many times this route is called.
      idempotencyKey: `receipt-${outcome.charge.reference}`,
    });

    return NextResponse.json({ sent: true, to: maskEmail(to) });
  } catch (err) {
    if (err instanceof EmailConfigError) {
      return NextResponse.json({ sent: false, reason: "email_not_configured" }, { status: 503 });
    }
    if (err instanceof FlutterwaveConfigError) {
      return NextResponse.json({ sent: false, reason: "not_configured" }, { status: 503 });
    }
    return NextResponse.json({ sent: false, reason: "send_failed" }, { status: 502 });
  }
}

/** So the UI can say "sent to j••••@gmail.com" without echoing the address back. */
function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "your email";
  const head = user.slice(0, 1);
  return `${head}${"•".repeat(Math.max(user.length - 1, 1))}@${domain}`;
}
