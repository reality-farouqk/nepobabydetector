/**
 * Single source of truth for what the unlock costs.
 *
 * The server re-reads these constants when verifying a transaction rather than
 * trusting the amount the browser reports, so a tampered client can't unlock
 * the breakdown by claiming it paid ₦1.
 */
export const UNLOCK_PRICE = 200; // Flutterwave NGN amounts are in naira, not kobo
export const UNLOCK_CURRENCY = "NGN";
export const UNLOCK_PRICE_LABEL = "₦200";

/** Prefix on every reference we generate, so we can reject refs that aren't ours. */
export const REFERENCE_PREFIX = "npd";

/**
 * A unique reference for one checkout attempt (v4 calls this `reference`).
 *
 * v4 requires 6-42 **alphanumeric** characters — hyphens and underscores are
 * rejected — so this is base36 timestamp + random, with no separators.
 */
export function newReference(): string {
  const stamp = Date.now().toString(36);
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `${REFERENCE_PREFIX}${stamp}${rand}`;
}

/** The payment methods this build offers. */
export const PAYMENT_METHODS = ["card", "ussd", "bank_transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
