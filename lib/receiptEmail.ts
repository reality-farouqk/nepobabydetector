import { ENCOURAGEMENT, UNIVERSAL_CLOSE } from "@/data/encouragement";
import { Tier } from "@/data/tiers";
import { BreakdownRow } from "@/lib/scoring";
import { SITE_DOMAIN } from "@/lib/site";

/**
 * Builds the receipt + full-analysis email.
 *
 * Note the palette is hardcoded here rather than using the CSS custom
 * properties the app uses everywhere else: mail clients (Outlook especially)
 * don't support `var()`, so tokens would collapse to unstyled text. Layout is
 * table-based and every style is inline for the same reason.
 */

const INDIGO = "#23003F";
const INDIGO_DEEP = "#17002A";
const ORANGE = "#F94500";
const LILAC = "#BCACCE";
const BUTTER = "#FFFDB4";
const PAPER = "#FFFDF0";
const INK_SOFT = "#3A2350";

export interface ReceiptEmailInput {
  tier: Tier;
  percent: number;
  side: "nepo" | "lapo";
  roastLine: string;
  breakdown: BreakdownRow[];
  receipt: {
    reference: string;
    amountLabel: string;
    method: string;
    paidAt: Date;
  };
}

/** Escapes anything that reaches the template from outside our own copy. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const LEAN_LABEL: Record<BreakdownRow["lean"], string> = {
  nepo: "Nepo",
  lapo: "Lapo",
  mixed: "Both ways",
  pass: "Passed",
};

const LEAN_COLOR: Record<BreakdownRow["lean"], string> = {
  nepo: "#5B2E86",
  lapo: ORANGE,
  mixed: "#6E5C7D",
  pass: "#9A8FA6",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function buildReceiptEmail(input: ReceiptEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const { tier, percent, side, roastLine, breakdown, receipt } = input;
  const copy = ENCOURAGEMENT[tier.key as keyof typeof ENCOURAGEMENT];
  const sideLabel = side === "nepo" ? "Nepo" : "Lapo";
  const paidOn = formatDate(receipt.paidAt);

  const subject = `Your Nepo Detector result: ${tier.title} (${percent}% ${sideLabel.toLowerCase()})`;

  // No reference row. It means nothing to the reader, and the transaction ref
  // is already on the Flutterwave record if a payment ever needs tracing.
  const receiptRows: [string, string][] = [
    ["Amount", receipt.amountLabel],
    ["Method", receipt.method],
    ["Date", paidOn],
    ["Status", "Paid"],
  ];

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${INDIGO_DEEP};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  ${esc(tier.title)} — ${percent}% ${esc(sideLabel.toLowerCase())}. Your full breakdown, receipt and a note worth reading.
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${INDIGO_DEEP};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;font-family:Helvetica,Arial,sans-serif;">

  <tr><td style="background:${INDIGO};padding:28px 28px 24px;text-align:center;border-radius:10px 10px 0 0;">
    <div style="font-size:28px;font-weight:bold;letter-spacing:-0.5px;">
      <span style="color:${BUTTER};">NEPO</span><span style="color:${ORANGE};">DETECTOR</span>
    </div>
    <div style="color:${LILAC};font-size:11px;letter-spacing:3px;margin-top:6px;">CERTIFIED &middot; VERIFIED</div>
  </td></tr>

  <tr><td style="background:${PAPER};padding:28px;">

    <p style="margin:0 0 18px;color:${INK_SOFT};font-size:15px;line-height:1.6;">
      Payment received &mdash; thank you. Here is everything: your receipt, the full line-by-line
      breakdown of how you scored, and something at the end that is worth the read.
    </p>

    <!-- Result -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:${BUTTER};border-radius:10px;margin:0 0 22px;">
      <tr><td style="padding:22px;text-align:center;">
        <div style="color:${INK_SOFT};font-size:11px;letter-spacing:2px;text-transform:uppercase;">
          ${esc(sideLabel)} score
        </div>
        <div style="color:${INDIGO};font-size:44px;font-weight:bold;line-height:1.1;margin:4px 0;">
          ${percent}%
        </div>
        <div style="color:${INDIGO};font-size:20px;font-weight:bold;">${esc(tier.title)}</div>
        <div style="color:${INK_SOFT};font-size:14px;font-style:italic;line-height:1.6;margin-top:12px;">
          &ldquo;${esc(roastLine)}&rdquo;
        </div>
      </td></tr>
    </table>

    <!-- Receipt -->
    <div style="color:${INDIGO};font-size:13px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 10px;">
      Receipt
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border:1px solid #E6DFC9;border-radius:8px;margin:0 0 26px;">
      ${receiptRows
        .map(
          ([label, value], i) => `
      <tr>
        <td style="padding:10px 14px;color:#6E5C7D;font-size:13px;${
          i > 0 ? "border-top:1px solid #EFEADA;" : ""
        }">${esc(label)}</td>
        <td align="right" style="padding:10px 14px;color:${INDIGO};font-size:13px;font-weight:bold;${
          i > 0 ? "border-top:1px solid #EFEADA;" : ""
        }">${esc(value)}</td>
      </tr>`,
        )
        .join("")}
    </table>

    <!-- What it means -->
    <div style="color:${INDIGO};font-size:13px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 10px;">
      What your score actually means
    </div>
    <p style="margin:0 0 26px;color:${INK_SOFT};font-size:15px;line-height:1.7;">
      ${esc(copy.reading)}
    </p>

    <!-- Breakdown -->
    <div style="color:${INDIGO};font-size:13px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 10px;">
      Your answers, line by line
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px;">
      ${breakdown
        .map(
          (row, i) => `
      <tr><td style="padding:12px 0;${i > 0 ? "border-top:1px solid #EFEADA;" : ""}">
        <div style="color:#6E5C7D;font-size:12px;line-height:1.5;">${esc(row.questionText)}</div>
        <div style="color:${INDIGO};font-size:14px;line-height:1.5;margin:4px 0 6px;">
          ${esc(row.optionText)}
        </div>
        <span style="display:inline-block;background:${LEAN_COLOR[row.lean]};color:#FFFFFF;
          font-size:10px;letter-spacing:1px;text-transform:uppercase;padding:3px 8px;border-radius:20px;">
          ${esc(LEAN_LABEL[row.lean])}
        </span>
      </td></tr>`,
        )
        .join("")}
    </table>

    <!-- Encouragement -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:${INDIGO};border-radius:10px;">
      <tr><td style="padding:24px;">
        <div style="color:${BUTTER};font-size:13px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 14px;">
          Now the part that isn't a joke
        </div>
        ${copy.paragraphs
          .map(
            (p) =>
              `<p style="margin:0 0 14px;color:#EFE9F5;font-size:15px;line-height:1.75;">${esc(p)}</p>`,
          )
          .join("")}
        <div style="height:1px;background:#563A73;margin:20px 0;"></div>
        ${UNIVERSAL_CLOSE.map(
          (p) =>
            `<p style="margin:0 0 14px;color:${LILAC};font-size:15px;line-height:1.75;">${esc(p)}</p>`,
        ).join("")}
      </td></tr>
    </table>

  </td></tr>

  <tr><td style="background:${INDIGO};padding:20px 28px;text-align:center;border-radius:0 0 10px 10px;">
    <div style="color:${LILAC};font-size:12px;line-height:1.6;">
      ${esc(SITE_DOMAIN)} &middot; a bit of fun, not financial advice
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

  const text = [
    `NEPO DETECTOR — CERTIFIED · VERIFIED`,
    ``,
    `Payment received. Here is your receipt and full breakdown.`,
    ``,
    `RESULT`,
    `${percent}% ${sideLabel.toLowerCase()} score — ${tier.title}`,
    `"${roastLine}"`,
    ``,
    `RECEIPT`,
    ...receiptRows.map(([label, value]) => `${label}: ${value}`),
    ``,
    `WHAT YOUR SCORE ACTUALLY MEANS`,
    copy.reading,
    ``,
    `YOUR ANSWERS, LINE BY LINE`,
    ...breakdown.map(
      (row) => `- ${row.questionText}\n  You: ${row.optionText}\n  Leaned: ${LEAN_LABEL[row.lean]}`,
    ),
    ``,
    `NOW THE PART THAT ISN'T A JOKE`,
    ...copy.paragraphs,
    ``,
    ...UNIVERSAL_CLOSE,
    ``,
    `${SITE_DOMAIN} — a bit of fun, not financial advice`,
  ].join("\n");

  return { subject, html, text };
}
