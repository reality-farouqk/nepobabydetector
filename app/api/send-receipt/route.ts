import { NextRequest, NextResponse } from "next/server";
import { EmailConfigError } from "@/lib/email";
import { FlutterwaveConfigError } from "@/lib/flutterwave";
import { maskEmail, sendReceiptFor } from "@/lib/sendReceipt";
import { isPlausibleTransactionInput, verifyTransaction } from "@/lib/verifyTransaction";

/**
 * Emails the receipt and full analysis for someone who stayed on the page.
 * The webhook covers everyone else; both share lib/sendReceipt.ts, and the
 * idempotency key means only one email goes out whichever fires first.
 *
 * Nothing about the payment is taken on trust:
 *   - whether it succeeded is re-read from Flutterwave, and
 *   - who to email is read off the verified transaction, not the request body.
 * Without the second, one valid transaction id would turn this into an open
 * mail relay pointed at any address an attacker likes.
 *
 * The score is recomputed server-side from the encoded answers, so the client
 * can't declare its own result either.
 */
export async function POST(req: NextRequest) {
  let body: { transactionId?: unknown; txRef?: unknown; answers?: unknown; refCode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ sent: false, reason: "bad_request" }, { status: 400 });
  }

  if (!isPlausibleTransactionInput(body.transactionId, body.txRef)) {
    return NextResponse.json({ sent: false, reason: "bad_request" }, { status: 400 });
  }

  try {
    const outcome = await verifyTransaction(
      body.transactionId as string | number,
      body.txRef as string,
    );
    if (!outcome.ok) {
      return NextResponse.json({ sent: false, reason: outcome.reason }, { status: 402 });
    }

    // Prefer what the browser still has; fall back to the copy stored with the
    // transaction at checkout.
    const metaAnswers =
      typeof outcome.transaction.meta?.answers === "string"
        ? outcome.transaction.meta.answers
        : null;
    const result = await sendReceiptFor(outcome.transaction, body.answers ?? metaAnswers);

    if (!result.sent) {
      return NextResponse.json({ sent: false, reason: result.reason }, { status: 422 });
    }

    return NextResponse.json({ sent: true, to: maskEmail(result.to) });
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
