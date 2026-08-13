import questionsData from "@/data/questions.json";

export interface Option {
  key: "A" | "B" | "C" | "D";
  text: string;
  nepo: number;
  lapo: number;
}

export interface Question {
  id: number;
  text: string;
  options: Option[];
}

export const ALL_QUESTIONS = questionsData as Question[];

const SESSION_LENGTH = 10;
const MIN_SCORED_QUESTIONS = 3; // below this, result is "undefined" per spec

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Draws a random, non-repeating set of questions for a session. */
export function drawSessionQuestions(pool: Question[] = ALL_QUESTIONS): Question[] {
  return shuffle(pool).slice(0, SESSION_LENGTH);
}

export interface Answer {
  questionId: number;
  optionKey: "A" | "B" | "C" | "D";
}

/** How one answer leaned, for the line-by-line breakdown in the receipt email. */
export type Lean = "nepo" | "lapo" | "mixed" | "pass";

export interface BreakdownRow {
  questionText: string;
  optionText: string;
  nepo: number;
  lapo: number;
  lean: Lean;
}

export interface ScoreResult {
  nepoPoints: number;
  lapoPoints: number;
  scoredQuestionCount: number; // questions where the chosen option wasn't a 0/0 "D" pass
  nepoPercent: number | null; // null when undefined (not enough data)
  isUndefined: boolean;
  extremeAnswers: { questionText: string; optionText: string; side: "nepo" | "lapo" }[];
  /** Every answer in order, including passes — the full analysis we email out. */
  breakdown: BreakdownRow[];
}

function leanOf(nepo: number, lapo: number): Lean {
  if (nepo === 0 && lapo === 0) return "pass";
  if (nepo === lapo) return "mixed";
  return nepo > lapo ? "nepo" : "lapo";
}

/**
 * Scores a completed session. D/pass answers (0,0) don't count toward the
 * denominator, so a few passes don't distort the result. If fewer than
 * MIN_SCORED_QUESTIONS actually scored points, the result is "undefined"
 * rather than a misleading percentage.
 */
export function scoreSession(questions: Question[], answers: Answer[]): ScoreResult {
  let nepoPoints = 0;
  let lapoPoints = 0;
  let scoredQuestionCount = 0;
  const extremes: ScoreResult["extremeAnswers"] = [];
  const breakdown: BreakdownRow[] = [];

  for (const answer of answers) {
    const question = questions.find((q) => q.id === answer.questionId);
    if (!question) continue;
    const option = question.options.find((o) => o.key === answer.optionKey);
    if (!option) continue;

    breakdown.push({
      questionText: question.text,
      optionText: option.text,
      nepo: option.nepo,
      lapo: option.lapo,
      lean: leanOf(option.nepo, option.lapo),
    });

    if (option.nepo === 0 && option.lapo === 0) continue; // pass/D answer

    nepoPoints += option.nepo;
    lapoPoints += option.lapo;
    scoredQuestionCount += 1;

    if (option.nepo === 10) {
      extremes.push({ questionText: question.text, optionText: option.text, side: "nepo" });
    } else if (option.lapo === 10) {
      extremes.push({ questionText: question.text, optionText: option.text, side: "lapo" });
    }
  }

  const totalPoints = nepoPoints + lapoPoints;
  const isUndefined = scoredQuestionCount < MIN_SCORED_QUESTIONS || totalPoints === 0;
  const nepoPercent = isUndefined ? null : Math.round((nepoPoints / totalPoints) * 100);

  // Most extreme (10-point) answers first, capped at 3 for the AI roast prompt
  const extremeAnswers = extremes.slice(0, 3);

  return {
    nepoPoints,
    lapoPoints,
    scoredQuestionCount,
    nepoPercent,
    isUndefined,
    extremeAnswers,
    breakdown,
  };
}
