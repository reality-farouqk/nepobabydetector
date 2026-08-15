/**
 * Outbound email.
 *
 * SERVER ONLY — reads RESEND_API_KEY.
 *
 * Resend is used over plain fetch so we add no dependency, and the whole
 * provider surface is this one function. Swapping to Postmark/SendGrid/SES
 * means rewriting `sendEmail` and nothing else — callers only know about
 * `{to, subject, html, text}`.
 */

export class EmailConfigError extends Error {}

export interface OutboundEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Stops a retry or double-submit sending the same receipt twice. */
  idempotencyKey?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  idempotencyKey,
}: OutboundEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new EmailConfigError("RESEND_API_KEY / EMAIL_FROM are not set");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey.slice(0, 256) } : {}),
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
      ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
    }),
    cache: "no-store",
  });

  if (res.ok) return;

  const detail = await res.text().catch(() => "");

  /**
   * 409 means this idempotency key was already used — an email for this
   * transaction has already been accepted, which is exactly the outcome we
   * wanted. Treat it as success.
   *
   * Resend also 409s when the key is reused with a *different* body, which is
   * the normal case here: the roast is regenerated per call and comes back
   * different every time (temperature 0.9). Without this, the second sender —
   * usually the webhook arriving after the receipt page already sent — would
   * throw, return 500, and have Flutterwave retry three times over 90 minutes
   * to re-send an email the buyer already has.
   */
  if (res.status === 409) return;

  throw new Error(`Email send failed: ${res.status} ${detail.slice(0, 200)}`);
}
