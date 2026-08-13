import { NextResponse } from "next/server";
import { FlutterwaveConfigError, flwFetch } from "@/lib/flutterwave";

interface Bank {
  id?: string;
  code?: string;
  name?: string;
}

/**
 * Nigerian bank list for the USSD picker. Proxied through our server because
 * the v4 API needs an OAuth token we can't expose to the browser.
 */
export async function GET() {
  try {
    const res = await flwFetch("/banks?country=NG");
    if (!res.ok) throw new Error(`Bank lookup failed: ${res.status}`);

    const payload: { status?: string; data?: Bank[] } = await res.json();
    if (payload.status !== "success" || !Array.isArray(payload.data)) {
      throw new Error("Unexpected bank list response");
    }

    // The upstream list repeats some banks under the same code, so dedupe.
    const byCode = new Map<string, { code: string; name: string }>();
    for (const b of payload.data) {
      if (!b.code || !b.name) continue;
      if (!byCode.has(b.code)) byCode.set(b.code, { code: b.code, name: b.name.trim() });
    }

    const banks = [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(
      { banks },
      // The list is stable; let it cache for an hour.
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch (err) {
    if (err instanceof FlutterwaveConfigError) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "bank_lookup_failed" }, { status: 502 });
  }
}
