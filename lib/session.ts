import { Answer, Question } from "@/lib/scoring";

/**
 * Keeps a run of the quiz alive across navigations.
 *
 * Needed because the result now lives on its own page and because a card
 * payment can bounce the user off-site to their bank for 3DS. Both throw away
 * React state, and without this the user would come back from a successful
 * payment to an empty app having paid for nothing.
 *
 * sessionStorage rather than localStorage: a result belongs to the tab and the
 * sitting, and it should not still be there next week.
 */

const KEY = "nepo-detector-session";

export interface StoredSession {
  questions: Question[];
  answers: Answer[];
  roastLine: string | null;
  refCode: string;
  /** Data URL. Dropped first if we hit the storage quota. */
  photo: string | null;
  /** Flutterwave transaction id + our tx_ref. The method isn't stored — the
   *  verify response reports how they actually paid. */
  charge: { id: string; reference: string } | null;
}

function write(session: StoredSession): boolean {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

/**
 * Photos are data URLs and can run to several megabytes, which is enough to
 * blow the ~5MB sessionStorage quota on its own. If the write fails we retry
 * without it: losing the picture is a much smaller problem than losing the
 * whole paid-for result.
 */
export function saveSession(session: StoredSession): void {
  if (typeof window === "undefined") return;
  if (write(session)) return;
  write({ ...session, photo: null });
}

/**
 * Patches just the roast onto whatever is already stored.
 *
 * The AI line can land after the photo step and after checkout has recorded a
 * charge, so a whole-session overwrite here would silently discard the user's
 * picture — or worse, the tx_ref needed to verify their payment.
 */
export function saveSessionRoast(roastLine: string): void {
  const session = loadSession();
  if (!session) return;
  saveSession({ ...session, roastLine });
}

export function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!Array.isArray(parsed?.questions) || !Array.isArray(parsed?.answers)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Records the charge on the stored session once payment starts succeeding. */
export function saveSessionCharge(charge: StoredSession["charge"]): void {
  const session = loadSession();
  if (!session) return;
  saveSession({ ...session, charge });
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing useful to do */
  }
}
