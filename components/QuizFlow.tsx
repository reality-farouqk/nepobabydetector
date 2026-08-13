"use client";

import { useMemo, useState } from "react";
import { drawSessionQuestions, Answer, Question } from "@/lib/scoring";

export default function QuizFlow({
  onComplete,
}: {
  onComplete: (questions: Question[], answers: Answer[]) => void;
}) {
  const questions = useMemo(() => drawSessionQuestions(), []);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const current = questions[index];
  const progress = Math.round(((index + 1) / questions.length) * 100);

  function pick(optionKey: "A" | "B" | "C" | "D") {
    const next = [...answers, { questionId: current.id, optionKey }];
    setAnswers(next);
    if (index + 1 < questions.length) {
      setIndex(index + 1);
    } else {
      onComplete(questions, next);
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[11px] tracking-[0.1em] uppercase"
          style={{ fontFamily: "var(--font-mono)", color: "var(--on-dark-muted)" }}
        >
          Nepo Detector
        </span>
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
            className="option-btn text-left px-4 py-3 rounded-md"
          >
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
}
