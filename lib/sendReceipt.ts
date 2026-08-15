import { getTier } from "@/data/tiers";
import { decodeAnswers, questionsForAnswers } from "@/lib/answersCodec";
import { sendEmail } from "@/lib/email";
import { UNLOCK_PRICE_LABEL, paymentTypeLabel } from "@/lib/payment";
import { buildReceiptEmail } from "@/lib/receiptEmail";
import { generateRoast } from "@/lib/roast";
import { scoreSession } from "@/lib/scoring";
import { VerifiedTransaction } from "@/lib/verifyTransaction";

/**
 * Builds and sends the receipt + full analysis for a payment we have already
 * verified.
 *
 * Shared by the two things that can complete a purchase: the browser landing on
 * /receipt, and the Flutterwave webhook firing for someone who paid and closed
 * the tab. Both end up here so the email is identical either way, and the
 * idempotency key means whichever arrives first wins and the other is a no-op.
 *
 * The score is recomputed here from the encoded answers rather than accepted
 * from the caller — the client never gets to declare its own result.
 */

export type ReceiptOutcome =
  | { sent: true; to: string; roastLine: string }
  | { sent: false; reason: "no_customer_email" | "no_answers" | "undefined_score" };

export async function sendReceiptFor(
  transaction: VerifiedTransaction,
  encodedAnswers: unknown,
): Promise<ReceiptOutcome> {
  if (!transaction.customerEmail) {
    return { sent: false, reason: "no_customer_email" };
  }

  const answers = decodeAnswers(encodedAnswers);
  if (!answers.length) {
    return { sent: false, reason: "no_answers" };
  }

  const score = scoreSession(questionsForAnswers(answers), answers);
  if (score.isUndefined || score.nepoPercent === null) {
    return { sent: false, reason: "undefined_score" };
  }

  const tier = getTier(score.nepoPercent);

  // Generated here, after the payment is confirmed — this is the paid feature.
  // Returned to the caller too, so the receipt page can show the same line the
  // email quotes rather than generating a second, different one.
  const roastLine = await generateRoast(tier, score.breakdown);

  const { subject, html, text } = buildReceiptEmail({
    tier,
    percent: score.nepoPercent,
    side: score.nepoPercent >= 50 ? "nepo" : "lapo",
    roastLine,
    breakdown: score.breakdown,
    receipt: {
      reference: transaction.txRef,
      amountLabel: UNLOCK_PRICE_LABEL,
      method: paymentTypeLabel(transaction.paymentType),
      paidAt: new Date(),
    },
  });

  await sendEmail({
    to: transaction.customerEmail,
    subject,
    html,
    text,
    // One receipt per transaction, whichever path gets here first.
    idempotencyKey: `receipt-${transaction.txRef}`,
  });

  return { sent: true, to: transaction.customerEmail, roastLine };
}

/** So the UI can say "sent to j••••@gmail.com" without echoing the address. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "your email";
  return `${user.slice(0, 1)}${"•".repeat(Math.max(user.length - 1, 1))}@${domain}`;
}
