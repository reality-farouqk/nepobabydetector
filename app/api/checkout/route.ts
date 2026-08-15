import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { decodeAnswers, encodeAnswers } from "@/lib/answersCodec";
import { FlutterwaveConfigError, flwFetch } from "@/lib/flutterwave";
import {
  PAYMENT_OPTIONS,
  UNLOCK_CURRENCY,
  UNLOCK_PRICE,
  newTxRef,
} from "@/lib/payment";

/**
 * Creates a Flutterwave Standard hosted payment link and hands it back for the
 * browser to redirect to.
 *
 * Standard rather than the Inline modal: the payment page is Flutterwave's own,
 * on Flutterwave's domain, so card details never enter this app's DOM at all —
 * not even inside an iframe we host. It also needs no public key, only the
 * server-side secret, so there is nothing payment-related in the browser bundle.
 *
 * Amount and currency come from our constants, never from the request, so a
 * tampered client can't create a ₦1 link and unlock with it.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const limited = await rateLimited(req, { name: "checkout", limit: 5, windowSec: 60 });
  if (limited) return limited;

  let body: { email?: unknown; answers?: unknown; refCode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  // Re-encoded from the decoded form so nothing arbitrary is forwarded to
  // Flutterwave: anything that isn't a question we ask is dropped here.
  const answers = encodeAnswers(decodeAnswers(body.answers));
  const refCode = typeof body.refCode === "string" ? body.refCode.slice(0, 32) : "";

  const txRef = newTxRef();

  try {
    const res = await flwFetch("/payments", {
      method: "POST",
      body: JSON.stringify({
        tx_ref: txRef,
        amount: String(UNLOCK_PRICE),
        currency: UNLOCK_CURRENCY,
        payment_options: PAYMENT_OPTIONS,
        redirect_url: new URL("/receipt", req.nextUrl.origin).toString(),
        customer: { email },
        customizations: {
          title: "Nepo Detector",
          description: "Unlock your full breakdown",
        },
        // Rides along with the transaction so the webhook can rebuild the full
        // analysis for someone who pays and never comes back to the tab.
        meta: { answers, ref_code: refCode },
      }),
    });

    const payload: { status?: string; message?: string; data?: { link?: string } } = await res
      .json()
      .catch(() => ({}));

    if (!res.ok || payload.status !== "success" || !payload.data?.link) {
      return NextResponse.json(
        { error: "checkout_failed", detail: payload.message },
        { status: 502 },
      );
    }

    return NextResponse.json({ link: payload.data.link, txRef });
  } catch (err) {
    if (err instanceof FlutterwaveConfigError) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
}
