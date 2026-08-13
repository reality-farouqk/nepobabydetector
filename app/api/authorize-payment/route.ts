import { NextRequest, NextResponse } from "next/server";
import { FlutterwaveConfigError, flwFetch } from "@/lib/flutterwave";
import { EncryptionConfigError, encryptField, newNonce } from "@/lib/flutterwaveEncryption";

interface AuthorizeRequestBody {
  chargeId: string;
  type: "otp" | "pin";
  value: string;
}

interface NextAction {
  type?: string;
  redirect_url?: { url?: string };
  payment_instruction?: { note?: string };
}

/**
 * Completes a charge that came back needing an OTP or card PIN — the common
 * path for Nigerian cards. Mirrors PUT /charges/{id} with an authorization
 * object; the PIN variant is encrypted the same way card fields are.
 */
export async function POST(req: NextRequest) {
  let body: AuthorizeRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { chargeId, type, value } = body;

  if (typeof chargeId !== "string" || !chargeId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (type === "otp" && !/^\d{4,8}$/.test(value ?? "")) {
    return NextResponse.json({ error: "invalid_otp" }, { status: 400 });
  }
  if (type === "pin" && !/^\d{4}$/.test(value ?? "")) {
    return NextResponse.json({ error: "invalid_pin" }, { status: 400 });
  }
  if (type !== "otp" && type !== "pin") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    let authorization: Record<string, unknown>;
    if (type === "otp") {
      authorization = { type: "otp", otp: { code: value } };
    } else {
      const nonce = newNonce();
      authorization = {
        type: "pin",
        pin: { nonce, encrypted_pin: await encryptField(value, nonce) },
      };
    }

    const res = await flwFetch(`/charges/${encodeURIComponent(chargeId)}`, {
      method: "PUT",
      idempotencyKey: `${chargeId}-${type}`,
      body: JSON.stringify({ authorization }),
    });

    const payload: {
      status?: string;
      message?: string;
      error?: { message?: string };
      data?: { status?: string; next_action?: NextAction };
    } = await res.json().catch(() => ({}));

    if (!res.ok || payload.status !== "success" || !payload.data) {
      const detail = payload.error?.message ?? payload.message ?? `HTTP ${res.status}`;
      return NextResponse.json({ error: "authorize_failed", detail }, { status: 502 });
    }

    return NextResponse.json({
      status: payload.data.status,
      nextAction: payload.data.next_action ?? null,
    });
  } catch (err) {
    if (err instanceof FlutterwaveConfigError || err instanceof EncryptionConfigError) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "authorize_failed" }, { status: 502 });
  }
}
