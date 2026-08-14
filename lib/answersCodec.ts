import { ALL_QUESTIONS, Answer, Question } from "@/lib/scoring";

/**
 * Compact encoding of a completed quiz, small enough to ride along in
 * Flutterwave's transaction `meta`.
 *
 * This is what lets the webhook rebuild the full analysis for someone who paid
 * and then closed the tab: their answers travel with the payment, so the server
 * can reconstruct the result without a database.
 *
 * Only question ids and option letters are stored — the wording is looked up
 * from our own questions.json — so the payload stays tiny and carries nothing
 * personal.
 *
 * Format: "3A.7C.12B" — one entry per answer, id then option letter.
 */

const ENTRY = /^(\d{1,4})([ABCD])$/;
const MAX_ANSWERS = 20;

export function encodeAnswers(answers: Answer[]): string {
  return answers
    .slice(0, MAX_ANSWERS)
    .map((a) => `${a.questionId}${a.optionKey}`)
    .join(".");
}

export function decodeAnswers(encoded: unknown): Answer[] {
  if (typeof encoded !== "string" || !encoded) return [];

  return encoded
    .split(".")
    .slice(0, MAX_ANSWERS)
    .flatMap((chunk): Answer[] => {
      const match = ENTRY.exec(chunk.trim());
      if (!match) return [];
      const questionId = Number(match[1]);
      // Drop anything that isn't a question we actually ask.
      if (!ALL_QUESTIONS.some((q) => q.id === questionId)) return [];
      return [{ questionId, optionKey: match[2] as Answer["optionKey"] }];
    });
}

/**
 * The question objects matching a decoded answer set, in answer order, so
 * `scoreSession` can be run server-side from the encoded form alone.
 */
export function questionsForAnswers(answers: Answer[]): Question[] {
  return answers.flatMap((a) => {
    const question = ALL_QUESTIONS.find((q) => q.id === a.questionId);
    return question ? [question] : [];
  });
}
