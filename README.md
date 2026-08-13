This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Checkout (Flutterwave v4)

The ₦200 breakdown unlock runs on the [v4 "Next Gen" API](https://developer.flutterwave.com/docs/authentication).
Copy `.env.example` to `.env.local` and fill in the client id, client secret and
encryption key from the dashboard (Settings → API Keys). `FLW_BASE_URL` points
at the sandbox by default.

What's built:

- `lib/flutterwave.ts` — OAuth 2.0 client-credentials auth. Exchanges the client
  id/secret for a bearer token, caches it in memory, and retires it 60s before
  its 10-minute expiry. `flwFetch()` attaches the token plus `X-Trace-Id`.
- `lib/payment.ts` — price and currency, in one place.
- `app/api/verify-payment/route.ts` — re-reads a charge with `GET /charges/{id}`
  and checks status, reference, currency and amount against our own constants.
  **The breakdown only unlocks on the server's say-so**; nothing the browser
  claims about a payment is trusted.

### The flow

v4 has **no hosted checkout or payment link** yet — there's no equivalent of
v3's drop-in `FlutterwaveCheckout()` modal — so the payment method is collected
by us and charged over the API:

`POST /customers/search` (or create) → `POST /payment-methods` → `POST /charges`
→ handle `next_action` → `GET /charges/{id}`

`next_action` is the branch point: `redirect_url` sends the user off-site (3DS),
`requires_otp` / `requires_pin` collect a code and `PUT /charges/{id}`,
`payment_instruction` / `requires_bank_transfer` show instructions and we poll
until the charge flips to `succeeded`.

Three methods are wired up:

| Method | Notes |
| --- | --- |
| Card | Fields are AES-256-GCM encrypted with `FLW_ENCRYPTION_KEY` (12-char nonce doubling as IV, base64 out) before leaving our server. |
| Bank transfer | Returns an account to pay into; we poll for confirmation. |
| USSD | Returns a code to dial (e.g. `*1414#`); we poll for confirmation. |

### Sandbox quirks worth knowing

- **USSD only works for bank code `044`** (Access Bank) in the sandbox; every
  other code returns "Invalid bank code". The picker is driven by the live
  `/banks` list, so this should widen in production.
- **`redirect_url` rejects `http://` and localhost.** It's omitted entirely on a
  local dev origin, which means 3DS cards can't complete locally. Set
  `FLW_REDIRECT_URL` to a public https tunnel to exercise that path.
- **`reference` must be 6–42 alphanumeric** — no hyphens or underscores.

> ### Before going live
>
> 1. **PCI-DSS.** The card path means raw card numbers reach our server. That is
>    fine against sandbox test cards, but taking real cards this way puts the
>    deployment in PCI scope. Move to a hosted/redirect method first — most
>    likely v3's modal, or v4 Checkout once it ships.
> 2. **Replay.** There's no datastore, so redeemed references aren't recorded and
>    a succeeded charge id could be replayed to unlock again. Persist them.
> 3. **Webhooks.** Polling is a stand-in. Async methods should be confirmed by a
>    webhook so a user who closes the tab still gets what they paid for.

## Receipt, redirect and email

Paying redirects to `/receipt` rather than revealing the breakdown in place.
That page is also the `redirect_url` handed to Flutterwave, so a card that
detours through the bank's 3DS screen comes back to it.

Because both trips destroy React state, a run of the quiz is persisted to
`sessionStorage` (`lib/session.ts`). The charge is recorded the moment it is
created — not on success — since a 3DS payment leaves the site before any
success handler runs. Photos are dropped first if the write hits the storage
quota; losing the picture beats losing the paid-for result.

On arrival `/receipt` re-verifies the charge server-side (landing on the URL
proves nothing), renders the full line-by-line analysis, and calls
`/api/send-receipt`.

### What the email contains

Receipt (amount, method, reference, date), the result, every answer with which
way it leaned, an honest reading of what the score actually measured, and a
closing section of encouragement written per tier in `data/encouragement.ts`.
The tone deliberately shifts there — the app is a joke, that part isn't.

Set `RESEND_API_KEY` and `EMAIL_FROM` to switch sending on. Without them the
receipt page still shows everything and just says email is off. The provider
lives entirely in `lib/email.ts`; swapping to Postmark/SES means rewriting that
one function.

> **Two things are deliberately not taken from the request body:** whether the
> payment succeeded (re-read from Flutterwave) and who to email (read off the
> paying customer record). Without the second, one valid charge id would turn
> the endpoint into an open mail relay. Both checks live in `lib/verifyCharge.ts`
> so the unlock and the email can never drift apart.

## Brand palette

Four colours, defined once in `app/globals.css`:

| Name         | Hex       | Used for                                        |
| ------------ | --------- | ----------------------------------------------- |
| Dark Indigo  | `#23003F` | Page background, card header strip, ink on paper |
| Red          | `#F94500` | Primary CTAs, progress fill, the Lapo accent     |
| Light Purple | `#BCACCE` | Secondary text on dark, the Nepo accent          |
| Light Yellow | `#FFFDB4` | The certificate card, headings on dark           |

Everything else in the file is a tint or shade derived from those four — don't
introduce new base hues. Prefer the semantic tokens (`--ink`, `--paper`,
`--on-dark`, `--surface-raised`, …) over raw palette vars in components, and use
the `.btn-primary` / `.btn-ghost` / `.option-btn` / `.panel` classes so hover and
focus states stay consistent (inline styles can't express those).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# nepobabydetector
