import { flwFetch } from "@/lib/flutterwave";
import { REFERENCE_PREFIX, UNLOCK_CURRENCY, UNLOCK_PRICE } from "@/lib/payment";

/**
 * The single place a payment is judged genuine.
 *
 * Shared by /api/verify-payment (unlock the breakdown) and /api/send-receipt
 * (email it) so the two can never drift apart — a weaker check on either route
 * would be a way around the paywall.
 */

export type VerifyOutcome =
  | { ok: true; charge: VerifiedCharge }
  | { ok: false; reason: string };

export interface VerifiedCharge {
  id: string;
  amount: number;
  currency: string;
  reference: string;
  customerId?: string;
}

interface ChargeEnvelope {
  status?: string;
  data?: {
    id?: string;
    amount?: number;
    currency?: string;
    reference?: string;
    customer_id?: string;
    status?: "succeeded" | "pending" | "failed" | "voided";
  };
}

/** Cheap shape check before we spend a network call on it. */
export function isPlausibleChargeInput(chargeId: unknown, reference: unknown): boolean {
  return (
    typeof chargeId === "string" &&
    chargeId.length > 0 &&
    chargeId.length <= 64 &&
    typeof reference === "string" &&
    reference.startsWith(REFERENCE_PREFIX) &&
    reference.length <= 64
  );
}

/**
 * Re-reads the charge from Flutterwave and confirms it actually succeeded, is
 * ours, and is for the right money. Amount and currency are compared against
 * our own constants — never against anything the caller supplied.
 */
export async function verifyCharge(chargeId: string, reference: string): Promise<VerifyOutcome> {
  const res = await flwFetch(`/charges/${encodeURIComponent(chargeId)}`);

  if (!res.ok) throw new Error(`Flutterwave charge lookup failed: ${res.status}`);

  const payload: ChargeEnvelope = await res.json();
  const charge = payload?.data;

  const genuine =
    payload?.status === "success" &&
    charge?.status === "succeeded" &&
    charge?.reference === reference &&
    charge?.currency === UNLOCK_CURRENCY &&
    Number(charge?.amount) >= UNLOCK_PRICE;

  if (!genuine) {
    return { ok: false, reason: charge?.status ?? "not_successful" };
  }

  return {
    ok: true,
    charge: {
      id: charge!.id ?? chargeId,
      amount: Number(charge!.amount),
      currency: charge!.currency!,
      reference: charge!.reference!,
      customerId: charge!.customer_id,
    },
  };
}

/**
 * The email address attached to the paying customer.
 *
 * Deliberately read from Flutterwave rather than taken from the request body:
 * if the caller could name the recipient, a single valid charge id would become
 * a way to send mail to anybody.
 */
export async function fetchCustomerEmail(customerId: string): Promise<string | null> {
  const res = await flwFetch(`/customers/${encodeURIComponent(customerId)}`);
  if (!res.ok) return null;

  const payload: { status?: string; data?: { email?: string } } = await res
    .json()
    .catch(() => ({}));

  if (payload.status !== "success") return null;
  return payload.data?.email ?? null;
}
