"use client";

import { useEffect, useRef, useState } from "react";
import Welcome from "@/components/Welcome";
import Analysing from "@/components/Analysing";
import ShareCard from "@/components/ShareCard";
import VibeCheck from "@/components/VibeCheck";
import { ENCOURAGEMENT } from "@/data/encouragement";
import { UNLOCK_PRICE_LABEL } from "@/lib/payment";
import QuizFlow from "@/components/QuizFlow";
import PhotoUpload from "@/components/PhotoUpload";
import ResultCard from "@/components/ResultCard";
import Paywall from "@/components/Paywall";
import { Answer, Question, scoreSession } from "@/lib/scoring";
import { saveSession } from "@/lib/session";
import { getTier } from "@/data/tiers";

type Stage = "welcome" | "vibe" | "quiz" | "photo" | "result";

export default function Home() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [sessionAnswers, setSessionAnswers] = useState<Answer[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [roastLine, setRoastLine] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  // Restore alongside the /api/roast call below when the AI roast comes back.
  // const [loadingRoast, setLoadingRoast] = useState(false);
  // Generated once per session so the ref code stays stable across re-renders
  // (otherwise unlocking the breakdown would silently reissue it).
  const [refCode] = useState(
    () => `#NPD-${String(1000 + Math.floor(Math.random() * 8999))}`,
  );

  // Shown once, a beat after the verdict lands — long enough to read your score
  // first, soon enough that it can't be scrolled past. Dismissible, and the
  // button above reopens it.
  const offeredRef = useRef(false);
  useEffect(() => {
    if (stage !== "result" || revealing || offeredRef.current) return;
    offeredRef.current = true;
    const t = setTimeout(() => setPaywallOpen(true), 2600);
    return () => clearTimeout(t);
  }, [stage, revealing]);

  function handleQuizComplete(questions: Question[], answers: Answer[]) {
    setSessionQuestions(questions);
    setSessionAnswers(answers);
    setStage("photo");
  }

  async function handlePhotoDone(photoDataUrl: string | null) {
    setPhoto(photoDataUrl);
    setRevealing(true);
    setStage("result");

    const score = scoreSession(sessionQuestions, sessionAnswers);
    let line: string | null = null;

    if (!score.isUndefined && score.nepoPercent !== null) {
      const tier = getTier(score.nepoPercent);

      // The AI roast line is parked for now — every result uses its tier's
      // written summary instead. `app/api/roast/route.ts` and
      // `lib/roastFallback.ts` are left intact so this is a one-block revert.
      //
      // setLoadingRoast(true);
      // try {
      //   const res = await fetch("/api/roast", {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({
      //       tierKey: tier.key,
      //       tierTitle: tier.title,
      //       extremeAnswers: score.extremeAnswers,
      //       // photoDescription would come from a vision-model pre-pass on
      //       // `photoDataUrl` extracting only flex-relevant cues (outfit,
      //       // background) — never the raw image.
      //       photoDescription: null,
      //     }),
      //   });
      //   const data = await res.json();
      //   line = data.line;
      // } catch {
      //   line = tier.freeSummary;
      // }
      // setLoadingRoast(false);

      line = tier.freeSummary;
      setRoastLine(line);
    }

    // Persisted so the result survives the trip to /receipt — and the trip to
    // the user's bank and back, if they pay by card.
    saveSession({
      questions: sessionQuestions,
      answers: sessionAnswers,
      roastLine: line,
      refCode,
      photo: photoDataUrl,
      charge: null,
    });
  }

  if (stage === "welcome") {
    return <Welcome onDone={() => setStage("vibe")} />;
  }

  if (stage === "vibe") {
    return <VibeCheck onContinue={() => setStage("quiz")} />;
  }

  if (stage === "quiz") {
    return <QuizFlow onComplete={handleQuizComplete} />;
  }

  if (stage === "photo") {
    return <PhotoUpload onDone={handlePhotoDone} />;
  }

  // stage === "result"
  const score = scoreSession(sessionQuestions, sessionAnswers);

  if (score.isUndefined || score.nepoPercent === null) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <h1
          className="text-2xl mb-3"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--butter)" }}
        >
          Too undefined to judge
        </h1>
        <p style={{ color: "var(--on-dark-muted)" }}>
          You passed on too many questions for us to read your vibe. Try again with a few real
          answers this time.
        </p>
        <button
          onClick={() => {
            setStage("vibe");
            setRoastLine(null);
          }}
          className="btn-primary mt-6 px-5 py-2.5 rounded-md text-sm font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  const side = score.nepoPercent >= 50 ? "nepo" : "lapo";
  const tier = getTier(score.nepoPercent);

  // The analysing beat: tension, then release. Skipped entirely for anyone who
  // prefers reduced motion, and for the replay path where it'd just be a delay.
  if (revealing) {
    return (
      <Analysing
        percent={score.nepoPercent}
        onDone={() => setRevealing(false)}
      />
    );
  }

  return (
    <div className="px-6 py-10">
      <ResultCard
        tier={tier}
        percent={score.nepoPercent}
        side={side}
        roastLine={roastLine ?? tier.freeSummary}
        photo={photo}
      />

      {/*
        One line of warmth before the paywall. The people most likely to be
        stung by this result — no safety net, real struggle — are the least
        able to pay ₦499 to be told something kind, so the kind thing can't sit
        entirely behind the paywall.
      */}
      <p
        className="max-w-[300px] mx-auto mt-4 text-[13px] leading-relaxed text-center"
        style={{ color: "var(--on-dark-muted)" }}
      >
        {ENCOURAGEMENT[tier.key as keyof typeof ENCOURAGEMENT].reading}
      </p>

      {/* Always visible, above the share row: this is the thing being sold, so
          it shouldn't sit below content people scroll past. */}
      <button
        onClick={() => setPaywallOpen(true)}
        className="btn-primary max-w-[300px] w-full mx-auto mt-4 py-3 rounded-md text-sm font-medium block"
      >
        Unlock my full breakdown &mdash; {UNLOCK_PRICE_LABEL}
      </button>

      <ShareCard percent={score.nepoPercent} tierTitle={tier.title} side={side} />

      {/* The breakdown lives on /receipt, which the paywall redirects to once
          payment clears — so it survives a refresh and a 3DS round trip. */}
      <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}
