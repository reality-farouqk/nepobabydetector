import { NextRequest, NextResponse } from "next/server";
import { FlutterwaveConfigError, flwFetch } from "@/lib/flutterwave";
import { EncryptionConfigError, encryptCard } from "@/lib/flutterwaveEncryption";
import {
  PAYMENT_METHODS,
  PaymentMethod,
  UNLOCK_CURRENCY,
  UNLOCK_PRICE,
  newReference,
} from "@/lib/payment";

/**
 * Starts a Flutterwave v4 charge for the breakdown unlock.
 *
 * v4 has no hosted checkout, so this walks the three-step collection flow
 * server-side: POST /customers → POST /payment-methods → POST /charges. The
 * amount and currency come from our own constants, never from the request, so
 * a tampered client can't charge itself ₦1 and unlock.
 *
 * PCI NOTE: for the card method the raw PAN reaches this route before being
 * encrypted for Flutterwave, which puts the deployment in PCI-DSS scope. That
 * is acceptable for sandbox testing with test cards; before taking real cards,
 * move to a hosted/redirect method so card data never touches our servers.
 */

interface CheckoutRequestBody {
  email: string;
  method: PaymentMethod;
  card?: { number: string; expiryMonth: string; expiryYear: string; cvv: string };
  ussd?: { bankCode: string };
}

interface FlwEnvelope<T> {
  status?: string;
  message?: string;
  data?: T;
  error?: { type?: string; message?: string };
}

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Where Flutterwave sends the user back after an off-site step (3DS).
 *
 * Flutterwave rejects http:// and localhost URLs, so on a local dev box we omit
 * it entirely rather than send something that fails validation — 3DS cards
 * simply can't complete locally. Set FLW_REDIRECT_URL to a public https URL
 * (e.g. a tunnel) to exercise that path.
 */
function resolveRedirectUrl(origin: string): string | undefined {
  const configured = process.env.FLW_REDIRECT_URL;
  if (configured) return configured;
  return origin.startsWith("https://") ? new URL("/receipt", origin).toString() : undefined;
}

/** Reads a v4 envelope, throwing with Flutterwave's own error text on failure. */
async function readEnvelope<T>(res: Response, step: string): Promise<T> {
  const body: FlwEnvelope<T> = await res.json().catch(() => ({}));

  if (!res.ok || body.status !== "success" || !body.data) {
    const detail = body.error?.message ?? body.message ?? `HTTP ${res.status}`;
    throw new Error(`${step} failed: ${detail}`);
  }

  return body.data;
}

/**
 * Gets the customer record for an email, creating it only if it's new.
 *
 * v4 rejects a second POST /customers for an email that already exists, and
 * repeat buyers are the normal case, so a create-only flow breaks for everyone
 * on their second purchase. Search first, create on miss.
 */
async function findOrCreateCustomer(email: string, reference: string): Promise<{ id: string }> {
  const searchRes = await flwFetch("/customers/search", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  if (searchRes.ok) {
    const found: FlwEnvelope<{ id?: string }[]> = await searchRes.json().catch(() => ({}));
    const existing = Array.isArray(found.data)
      ? found.data.find((c) => typeof c?.id === "string")
      : undefined;
    if (existing?.id) return { id: existing.id };
  }

  return readEnvelope<{ id: string }>(
    await flwFetch("/customers", {
      method: "POST",
      idempotencyKey: `${reference}-cus`,
      body: JSON.stringify({ email }),
    }),
    "create customer",
  );
}

export async function POST(req: NextRequest) {
  let body: CheckoutRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { email, method, card, ussd } = body;

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!PAYMENT_METHODS.includes(method)) {
    return NextResponse.json({ error: "invalid_method" }, { status: 400 });
  }
  if (method === "card" && (!card?.number || !card.expiryMonth || !card.expiryYear || !card.cvv)) {
    return NextResponse.json({ error: "invalid_card" }, { status: 400 });
  }
  if (method === "ussd" && !/^\d{3,}$/.test(ussd?.bankCode ?? "")) {
    return NextResponse.json({ error: "invalid_bank" }, { status: 400 });
  }

  const reference = newReference();

  try {
    // 1. Customer — v4 hangs charges off a customer record.
    const customer = await findOrCreateCustomer(email, reference);

    // 2. Payment method. Bank transfer has no /payment-methods type of its own —
    //    it's requested as a bank_account method and answered by the charge's
    //    next_action with the account to pay into.
    let methodPayload: Record<string, unknown>;
    if (method === "card") {
      methodPayload = {
        type: "card",
        card: await encryptCard({
          number: card!.number.replace(/\s/g, ""),
          expiryMonth: card!.expiryMonth,
          expiryYear: card!.expiryYear,
          cvv: card!.cvv,
        }),
      };
    } else if (method === "ussd") {
      methodPayload = { type: "ussd", ussd: { account_bank: ussd!.bankCode } };
    } else {
      methodPayload = { type: "bank_account" };
    }

    const paymentMethod = await readEnvelope<{ id: string }>(
      await flwFetch("/payment-methods", {
        method: "POST",
        idempotencyKey: `${reference}-pmd`,
        body: JSON.stringify(methodPayload),
      }),
      "create payment method",
    );

    // 3. Charge. Amount and currency come from our constants only.
    const redirectUrl = resolveRedirectUrl(req.nextUrl.origin);
    const charge = await readEnvelope<{
      id: string;
      status: string;
      next_action?: NextAction;
    }>(
      await flwFetch("/charges", {
        method: "POST",
        idempotencyKey: reference,
        body: JSON.stringify({
          reference,
          amount: UNLOCK_PRICE,
          currency: UNLOCK_CURRENCY,
          customer_id: customer.id,
          payment_method_id: paymentMethod.id,
          ...(redirectUrl ? { redirect_url: redirectUrl } : {}),
        }),
      }),
      "create charge",
    );

    return NextResponse.json({
      chargeId: charge.id,
      reference,
      status: charge.status,
      nextAction: charge.next_action ?? null,
    });
  } catch (err) {
    if (err instanceof FlutterwaveConfigError || err instanceof EncryptionConfigError) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    // Surface Flutterwave's own message — these are user-actionable things like
    // "card declined" or "invalid bank code", not internal detail.
    return NextResponse.json(
      { error: "checkout_failed", detail: err instanceof Error ? err.message : undefined },
      { status: 502 },
    );
  }
}
