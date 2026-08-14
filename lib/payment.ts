/**
 * Single source of truth for what the unlock costs.
 *
 * The server re-reads these constants when verifying a transaction rather than
 * trusting the amount the browser reports, so a tampered client can't unlock
 * the breakdown by claiming it paid ₦1.
 */
export const UNLOCK_PRICE = 499; // Flutterwave NGN amounts are in naira, not kobo
export const UNLOCK_CURRENCY = "NGN";
export const UNLOCK_PRICE_LABEL = "₦499";

/** Prefix on every reference we generate, so we can reject refs that aren't ours. */
export const TX_REF_PREFIX = "npd-";

/** A unique reference for one checkout attempt (v3 calls this `tx_ref`). */
export function newTxRef(): string {
  return `${TX_REF_PREFIX}${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * What the hosted modal is allowed to offer. Every one of these is handled
 * inside Flutterwave's iframe — we never see a card number, a PIN or an OTP.
 */
export const PAYMENT_OPTIONS = "card,banktransfer,ussd,account";

/** Maps Flutterwave's `payment_type` onto something worth showing a human. */
export function paymentTypeLabel(paymentType: string | null): string {
  switch (paymentType) {
    case "card":
      return "Card";
    case "banktransfer":
    case "bank_transfer":
      return "Bank transfer";
    case "ussd":
      return "USSD";
    case "account":
    case "debitng":
      return "Bank account";
    default:
      return "Flutterwave";
  }
}
