import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { FlutterwaveConfigError } from "@/lib/flutterwave";
import { sendReceiptFor } from "@/lib/sendReceipt";
import { verifyTransaction } from "@/lib/verifyTransaction";

/**
 * Flutterwave webhook — the safety net for a customer who pays and then closes
 * the tab before being redirected back.
 *
 * Without this, that person is charged and receives nothing: the browser is the
 * only thing that knows the quiz result, and it's gone. Their answers ride along
 * in the transaction `meta` set at checkout, so this route can rebuild the full
 * analysis and email it with no database involved.
 *
 * Flutterwave retries 3 times at 30-minute intervals on any non-200, so this
 * returns 200 for anything it has genuinely finished with — including events it
 * deliberately ignores. Only a real, retry-worthy failure returns 5xx.
 */

interface WebhookBody {
  event?: string;
  data?: {
    id?: number;
    tx_ref?: string;
    status?: string;
    meta?: Record<string, unknown> | null;
  };
}

/** Constant-time compare so the secret can't be recovered by timing the reply. */
function hashMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Pulls our answer payload out of whichever meta shape we get back. */
function readMeta(meta: Record<string, unknown> | null | undefined) {
  return {
    answers: typeof meta?.answers === "string" ? meta.answers : null,
    refCode: typeof meta?.ref_code === "string" ? meta.ref_code : "",
  };
}

export async function POST(req: NextRequest) {
  const secretHash = process.env.FLW_SECRET_HASH;

  // Refuse to run unauthenticated: without a configured hash we cannot tell a
  // real Flutterwave call from anyone who found the URL.
  if (!secretHash) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  if (!hashMatches(req.headers.get("verif-hash"), secretHash)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = await req.json();
  } catch {
    // Malformed and unfixable by retrying.
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const { event, data } = body;

  // Anything that isn't a completed charge is acknowledged and dropped.
  if (event !== "charge.completed" || data?.status !== "successful") {
    return NextResponse.json({ received: true, ignored: true }, { status: 200 });
  }

  if (!data.id || !data.tx_ref) {
    return NextResponse.json({ received: true, ignored: true }, { status: 200 });
  }

  try {
    // Re-verify rather than trust the body. A valid verif-hash proves the
    // sender, not that the amounts in this payload are real.
    const outcome = await verifyTransaction(data.id, data.tx_ref);
    if (!outcome.ok) {
      return NextResponse.json({ received: true, verified: false }, { status: 200 });
    }

    // Prefer the webhook's own meta; fall back to whatever the verify call
    // returned, since Flutterwave doesn't document which carries it.
    const fromBody = readMeta(data.meta);
    const fromVerify = readMeta(outcome.transaction.meta);
    const answers = fromBody.answers ?? fromVerify.answers;

    const result = await sendReceiptFor(outcome.transaction, answers);

    // A missing answer payload is a real gap worth seeing in logs, but retrying
    // won't conjure one up, so it still acknowledges.
    if (!result.sent) {
      console.warn(`[flutterwave-webhook] ${data.tx_ref}: no receipt (${result.reason})`);
    }

    return NextResponse.json({ received: true, emailed: result.sent }, { status: 200 });
  } catch (err) {
    if (err instanceof FlutterwaveConfigError) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    // Genuine transient failure — let Flutterwave retry.
    console.error(`[flutterwave-webhook] ${data.tx_ref}: ${String(err)}`);
    return NextResponse.json({ error: "retry" }, { status: 500 });
  }
}
