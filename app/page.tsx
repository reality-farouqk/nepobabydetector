"use client";

import { useState } from "react";
import Welcome from "@/components/Welcome";
import VibeCheck from "@/components/VibeCheck";
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
  const [loadingRoast, setLoadingRoast] = useState(false);
  // Generated once per session so the ref code stays stable across re-renders
  // (otherwise unlocking the breakdown would silently reissue it).
  const [refCode] = useState(
    () => `#NPD-${String(1000 + Math.floor(Math.random() * 8999))}`,
  );

  function handleQuizComplete(questions: Question[], answers: Answer[]) {
    setSessionQuestions(questions);
    setSessionAnswers(answers);
    setStage("photo");
  }

  async function handlePhotoDone(photoDataUrl: string | null) {
    setPhoto(photoDataUrl);
    setStage("result");
    setLoadingRoast(true);

    const score = scoreSession(sessionQuestions, sessionAnswers);
    let line: string | null = null;

    if (!score.isUndefined && score.nepoPercent !== null) {
      const tier = getTier(score.nepoPercent);

      try {
        const res = await fetch("/api/roast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tierKey: tier.key,
            tierTitle: tier.title,
            extremeAnswers: score.extremeAnswers,
            // photoDescription would come from a vision-model pre-pass on `photoDataUrl`
            // that extracts only flex-relevant cues (outfit, background) — not implemented
            // in this build; passing null keeps the roast answer-only for now.
            photoDescription: null,
          }),
        });
        const data = await res.json();
        line = data.line;
      } catch {
        line = tier.freeSummary;
      }
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

    setLoadingRoast(false);
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

  return (
    <div className="px-6 py-10">
      <ResultCard
        tier={tier}
        percent={score.nepoPercent}
        side={side}
        roastLine={loadingRoast ? "..." : roastLine ?? tier.freeSummary}
        photo={photo}
        refCode={refCode}
      />

      {/* The breakdown now lives on /receipt, which the paywall redirects to
          once payment clears — so it survives a refresh and a 3DS round trip. */}
      <Paywall />
    </div>
  );
}
