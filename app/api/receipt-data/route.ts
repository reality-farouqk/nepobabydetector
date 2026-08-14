import { NextRequest, NextResponse } from "next/server";
import { getTier } from "@/data/tiers";
import { decodeAnswers, questionsForAnswers } from "@/lib/answersCodec";
import { FlutterwaveConfigError } from "@/lib/flutterwave";
import { paymentTypeLabel } from "@/lib/payment";
import { scoreSession } from "@/lib/scoring";
import { isPlausibleTransactionInput, verifyTransaction } from "@/lib/verifyTransaction";

/**
 * Rebuilds a paid result from the transaction alone.
 *
 * The browser normally still holds the answers in sessionStorage, but it often
 * doesn't: the tab was closed, the phone killed it during checkout, or the
 * receipt link was opened on a different device. Before this, all of those
 * landed on "your payment went through but we can't show you anything", which
 * is the worst page in the product — the one shown to someone who has just paid.
 *
 * No datastore needed: the answers were attached to the transaction's `meta` at
 * checkout precisely so they'd outlive the browser. This verifies the payment,
 * reads them back, and recomputes the score server-side.
 */
export async function POST(req: NextRequest) {
  let body: { transactionId?: unknown; txRef?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  if (!isPlausibleTransactionInput(body.transactionId, body.txRef)) {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  try {
    const outcome = await verifyTransaction(
      body.transactionId as string | number,
      body.txRef as string,
    );

    if (!outcome.ok) {
      return NextResponse.json({ ok: false, reason: outcome.reason }, { status: 402 });
    }

    const encoded = outcome.transaction.meta?.answers;
    const answers = decodeAnswers(encoded);

    if (!answers.length) {
      // Paid, but the answers didn't come back with the transaction. The caller
      // still gets a confirmed payment so it can say something true.
      return NextResponse.json({
        ok: true,
        paid: true,
        result: null,
        method: paymentTypeLabel(outcome.transaction.paymentType),
      });
    }

    const score = scoreSession(questionsForAnswers(answers), answers);
    if (score.isUndefined || score.nepoPercent === null) {
      return NextResponse.json({
        ok: true,
        paid: true,
        result: null,
        method: paymentTypeLabel(outcome.transaction.paymentType),
      });
    }

    const tier = getTier(score.nepoPercent);

    return NextResponse.json({
      ok: true,
      paid: true,
      method: paymentTypeLabel(outcome.transaction.paymentType),
      result: {
        percent: score.nepoPercent,
        side: score.nepoPercent >= 50 ? "nepo" : "lapo",
        tierKey: tier.key,
        breakdown: score.breakdown,
      },
    });
  } catch (err) {
    if (err instanceof FlutterwaveConfigError) {
      return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
    }
    return NextResponse.json({ ok: false, reason: "verify_failed" }, { status: 502 });
  }
}
