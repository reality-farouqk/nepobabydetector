import { NextRequest, NextResponse } from "next/server";
import { FlutterwaveConfigError } from "@/lib/flutterwave";
import { isPlausibleChargeInput, verifyCharge } from "@/lib/verifyCharge";

/**
 * Server-side confirmation that a Flutterwave v4 charge really succeeded.
 *
 * Nothing the browser reports about a payment is trusted — anyone can POST
 * `{status: "succeeded"}` at this route. The client hands us only the charge
 * id, which we re-read from Flutterwave with our own credentials. See
 * lib/verifyCharge.ts for the actual checks.
 *
 * NOTE: with no datastore in this build we can't record which references have
 * already been redeemed, so a previously-succeeded charge id could be replayed
 * to unlock again. Persisting redeemed references is the fix once there's a
 * database — that's also where a webhook handler should write.
 */
export async function POST(req: NextRequest) {
  let body: { chargeId?: unknown; reference?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ verified: false, reason: "bad_request" }, { status: 400 });
  }

  if (!isPlausibleChargeInput(body.chargeId, body.reference)) {
    return NextResponse.json({ verified: false, reason: "bad_request" }, { status: 400 });
  }

  try {
    const outcome = await verifyCharge(body.chargeId as string, body.reference as string);

    if (!outcome.ok) {
      return NextResponse.json({ verified: false, reason: outcome.reason }, { status: 402 });
    }

    return NextResponse.json({ verified: true });
  } catch (err) {
    if (err instanceof FlutterwaveConfigError) {
      return NextResponse.json({ verified: false, reason: "not_configured" }, { status: 503 });
    }
    return NextResponse.json({ verified: false, reason: "verify_failed" }, { status: 502 });
  }
}
