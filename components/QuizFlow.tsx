"use client";

import { useMemo, useState } from "react";
import { track } from "@vercel/analytics";
import { drawSessionQuestions, Answer, Question } from "@/lib/scoring";

export default function QuizFlow({
  onComplete,
}: {
  onComplete: (questions: Question[], answers: Answer[]) => void;
}) {
  const questions = useMemo(() => drawSessionQuestions(), []);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  // Re-keying the question block on this restarts its entrance animation, so
  // each question slides in rather than snapping.
  const [enterKey, setEnterKey] = useState(0);

  const current = questions[index];
  const progress = Math.round(((index + 1) / questions.length) * 100);
  const chosen = answers[index]?.optionKey;

  function goTo(nextIndex: number, nextAnswers: Answer[]) {
    setAnswers(nextAnswers);
    setIndex(nextIndex);
    setEnterKey((k) => k + 1);
  }

  function pick(optionKey: "A" | "B" | "C" | "D") {
    // Light tap feedback — on mobile this is what makes the quiz feel physical.
    navigator.vibrate?.(8);

    // Overwrite rather than append, so changing an earlier answer replaces it
    // instead of adding a second one for the same question.
    const next = [...answers];
    next[index] = { questionId: current.id, optionKey };

    if (index + 1 < questions.length) {
      goTo(index + 1, next);
    } else {
      setAnswers(next);
      track("quiz_complete", { questions: questions.length });
      onComplete(questions, next);
    }
  }

  function back() {
    if (index === 0) return;
    navigator.vibrate?.(6);
    track("quiz_back", { from: index + 1 });
    goTo(index - 1, answers);
  }

  return (
    <div className="max-w-md mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={back}
          disabled={index === 0}
          aria-label="Previous question"
          className="text-[11px] tracking-[0.1em] uppercase disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ fontFamily: "var(--font-mono)", color: "var(--on-dark-muted)" }}
        >
          &larr; Back
        </button>
        <span
          className="text-[11px]"
          style={{ fontFamily: "var(--font-mono)", color: "var(--on-dark-muted)" }}
        >
          {index + 1} / {questions.length}
        </span>
      </div>
      <div className="w-full h-1 rounded-full mb-8" style={{ background: "var(--border-dark)" }}>
        <div
          className="h-1 rounded-full transition-all"
          style={{ width: `${progress}%`, background: "var(--orange)" }}
        />
      </div>

      <div key={enterKey} className="question-enter">
        <h2
          className="text-xl mb-6"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--butter)" }}
        >
          {current.text}
        </h2>

        <div className="flex flex-col gap-3">
          {current.options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => pick(opt.key)}
              aria-pressed={chosen === opt.key}
              className="option-btn text-left px-4 py-3 rounded-md"
              // On a revisited question, show what was picked last time.
              style={
                chosen === opt.key
                  ? { borderColor: "var(--orange)", background: "var(--indigo-600)" }
                  : undefined
              }
            >
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
