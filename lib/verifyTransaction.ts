import { flwFetch } from "@/lib/flutterwave";
import { TX_REF_PREFIX, UNLOCK_CURRENCY, UNLOCK_PRICE } from "@/lib/payment";

/**
 * The single place a payment is judged genuine.
 *
 * Shared by /api/verify-payment (unlock the breakdown) and /api/send-receipt
 * (email it) so the two can never drift apart — a weaker check on either route
 * would be a way around the paywall.
 */

export type VerifyOutcome =
  | { ok: true; transaction: VerifiedTransaction }
  | { ok: false; reason: string };

export interface VerifiedTransaction {
  id: number | string;
  amount: number;
  currency: string;
  txRef: string;
  /** v3 returns the payer inline, so no second lookup is needed for the email. */
  customerEmail: string | null;
  paymentType: string | null;
  /** Whatever we attached at checkout — carries the encoded quiz answers. */
  meta: Record<string, unknown> | null;
}

interface VerifyEnvelope {
  status?: string;
  message?: string;
  data?: {
    id?: number;
    tx_ref?: string;
    amount?: number;
    currency?: string;
    status?: string;
    payment_type?: string;
    customer?: { email?: string };
    meta?: Record<string, unknown> | null;
  };
}

/** Cheap shape check before we spend a network call on it. */
export function isPlausibleTransactionInput(transactionId: unknown, txRef: unknown): boolean {
  return (
    (typeof transactionId === "string" || typeof transactionId === "number") &&
    String(transactionId).length > 0 &&
    String(transactionId).length <= 64 &&
    typeof txRef === "string" &&
    txRef.startsWith(TX_REF_PREFIX) &&
    txRef.length <= 64
  );
}

/**
 * Re-reads the transaction from Flutterwave and confirms it actually succeeded,
 * is ours, and is for the right money. Amount and currency are compared against
 * our own constants — never against anything the caller supplied.
 */
export async function verifyTransaction(
  transactionId: string | number,
  txRef: string,
): Promise<VerifyOutcome> {
  const res = await flwFetch(
    `/transactions/${encodeURIComponent(String(transactionId))}/verify`,
  );

  if (!res.ok) {
    // Any 4xx is Flutterwave answering definitively: no such transaction, or
    // one we're not allowed to see. That's a normal "not paid" outcome, not an
    // outage — an unknown id comes back 400, not 404. Only 5xx/network is a
    // genuine failure worth surfacing as one.
    if (res.status < 500) return { ok: false, reason: "not_found" };
    throw new Error(`Flutterwave verify failed: ${res.status}`);
  }

  const payload: VerifyEnvelope = await res.json();
  const tx = payload?.data;

  const genuine =
    payload?.status === "success" &&
    tx?.status === "successful" &&
    tx?.tx_ref === txRef &&
    tx?.currency === UNLOCK_CURRENCY &&
    Number(tx?.amount) >= UNLOCK_PRICE;

  if (!genuine) {
    return { ok: false, reason: tx?.status ?? "not_successful" };
  }

  return {
    ok: true,
    transaction: {
      id: tx!.id ?? transactionId,
      amount: Number(tx!.amount),
      currency: tx!.currency!,
      txRef: tx!.tx_ref!,
      customerEmail: tx!.customer?.email ?? null,
      paymentType: tx!.payment_type ?? null,
      meta: tx!.meta ?? null,
    },
  };
}
