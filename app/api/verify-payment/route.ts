import { NextRequest, NextResponse } from "next/server";
import { FlutterwaveConfigError } from "@/lib/flutterwave";
import { paymentTypeLabel } from "@/lib/payment";
import { isPlausibleTransactionInput, verifyTransaction } from "@/lib/verifyTransaction";

/**
 * Server-side confirmation that a Flutterwave transaction really succeeded.
 *
 * Nothing the browser reports about a payment is trusted — anyone can POST
 * `{status: "successful"}` at this route, and the redirect back from checkout
 * carries a status in the query string that is equally forgeable. The client
 * hands us only the transaction id, which we re-read from Flutterwave with our
 * secret key. See lib/verifyTransaction.ts for the actual checks.
 *
 * NOTE: with no datastore in this build we can't record which references have
 * already been redeemed, so a previously-successful transaction id could be
 * replayed to unlock again. Persisting redeemed tx_refs is the fix once there's
 * a database — that's also where a webhook handler should write.
 */
export async function POST(req: NextRequest) {
  let body: { transactionId?: unknown; txRef?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ verified: false, reason: "bad_request" }, { status: 400 });
  }

  if (!isPlausibleTransactionInput(body.transactionId, body.txRef)) {
    return NextResponse.json({ verified: false, reason: "bad_request" }, { status: 400 });
  }

  try {
    const outcome = await verifyTransaction(
      body.transactionId as string | number,
      body.txRef as string,
    );

    if (!outcome.ok) {
      return NextResponse.json({ verified: false, reason: outcome.reason }, { status: 402 });
    }

    return NextResponse.json({
      verified: true,
      method: paymentTypeLabel(outcome.transaction.paymentType),
    });
  } catch (err) {
    if (err instanceof FlutterwaveConfigError) {
      return NextResponse.json({ verified: false, reason: "not_configured" }, { status: 503 });
    }
    return NextResponse.json({ verified: false, reason: "verify_failed" }, { status: 502 });
  }
}
