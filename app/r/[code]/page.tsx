import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTier } from "@/data/tiers";
import { parseShareCode, shareImagePath } from "@/lib/share";

/**
 * The page a shared certificate links to.
 *
 * Everything comes out of the URL, so this is fully static per code — no
 * database, no expiry. Its real job is the unfurl: WhatsApp, Facebook and X
 * read the metadata below and show the sharer's actual certificate, which is
 * what makes a share worth clicking.
 */

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const parsed = parseShareCode(code);
  if (!parsed) return { title: "Nepo Detector" };

  const tier = getTier(parsed.percent);
  const side = parsed.percent >= 50 ? "nepo" : "lapo";
  const title = `${tier.title} — ${parsed.percent}% ${side}`;
  const description = `${tier.freeSummary} Run the Nepo Detector on yourself.`;
  const image = shareImagePath(parsed.percent);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1080, height: 1080, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function SharedResult({ params }: Props) {
  const { code } = await params;
  const parsed = parseShareCode(code);
  if (!parsed) notFound();

  const tier = getTier(parsed.percent);
  const side = parsed.percent >= 50 ? "Nepo" : "Lapo";

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
      <p
        className="text-[11px] tracking-[0.14em] uppercase mb-4"
        style={{ fontFamily: "var(--font-mono)", color: "var(--on-dark-muted)" }}
      >
        Somebody ran the detector
      </p>

      {/* Plain <img>: this is a pre-rendered PNG at a fixed size, so the
          optimiser has nothing to add. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={shareImagePath(parsed.percent)}
        alt={`${tier.title} — ${parsed.percent}% ${side.toLowerCase()}`}
        width={1080}
        height={1080}
        className="w-full max-w-[340px] rounded-xl"
        style={{ boxShadow: "0 10px 30px rgba(23, 0, 42, 0.55)" }}
      />

      <h1
        className="mt-7 text-2xl"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--butter)" }}
      >
        {tier.title}
      </h1>
      <p className="mt-2 text-sm max-w-[20rem]" style={{ color: "var(--on-dark-muted)" }}>
        {tier.freeSummary}
      </p>

      <Link
        href="/"
        className="btn-primary mt-8 px-6 py-3 rounded-md text-sm font-medium no-underline"
      >
        Run it on yourself &rarr;
      </Link>
      <p className="mt-3 text-[11px]" style={{ color: "var(--on-dark-muted)" }}>
        Ten questions. No lying allowed.
      </p>
    </div>
  );
}
