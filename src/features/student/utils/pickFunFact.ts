import { FUN_FACTS, type FunFact, type FactSubject } from "../constants/funFacts";

/** How many recently-shown fact ids we remember, per tab. */
const RECENT_LIMIT = 15;
const RECENT_STORAGE_KEY = "gened_recent_facts";

/**
 * Below this many subject-specific candidates we top the pool up with `general`
 * facts, so a thin subject never means the same two facts over and over.
 */
const MIN_SUBJECT_POOL = 3;

/**
 * Taxonomy subject names are free-form (see `ExactSubject`), so map the ones we
 * expect onto the broad buckets facts are tagged with. Anything unrecognised
 * falls back to `general`, which is always safe.
 */
const SUBJECT_BUCKETS: Readonly<Record<string, FactSubject>> = {
  english: "English",
  mathematics: "Mathematics",
  maths: "Mathematics",
  math: "Mathematics",
  science: "Science",
  physics: "Science",
  chemistry: "Science",
  biology: "Science",
  "social science": "Social Science",
  "social studies": "Social Science",
  "social & political science": "Social Science",
  history: "Social Science",
  geography: "Social Science",
  civics: "Social Science",
  economics: "Social Science",
};

export function toFactSubject(subject?: string | null): FactSubject {
  if (!subject) return "general";
  return SUBJECT_BUCKETS[subject.trim().toLowerCase()] ?? "general";
}

export interface PickFunFactOptions {
  /** Raw taxonomy subject name, or a `FactSubject`. Both are accepted. */
  subject?: string | null;
  /** Ids to avoid, on top of the ones remembered in sessionStorage. */
  excludeIds?: readonly string[];
  /**
   * Prefer facts that carry a `question`, for surfaces that pose the fact as a
   * teaser first. Falls back to the unfiltered pool rather than returning null,
   * so a subject with no question-bearing facts still shows something.
   */
  requireQuestion?: boolean;
}

/**
 * Picks one fact, preferring the current subject.
 *
 * Facts are deliberately not filtered by age: every fact in the dataset is
 * written to be readable by the youngest student, so the only axis that
 * narrows the pool is subject. See the authoring rules in `funFacts.ts`.
 *
 * Returns `null` only if the dataset is empty — every caller must render
 * correctly without a fact.
 */
export function pickFunFact(options: PickFunFactOptions = {}): FunFact | null {
  const { subject, excludeIds = [], requireQuestion = false } = options;

  if (FUN_FACTS.length === 0) return null;

  const bucket = toFactSubject(subject);
  let pool: readonly FunFact[] = FUN_FACTS;

  if (bucket !== "general") {
    const onSubject = FUN_FACTS.filter((fact) => fact.subject === bucket);
    if (onSubject.length > 0) {
      pool =
        onSubject.length >= MIN_SUBJECT_POOL
          ? onSubject
          : [...onSubject, ...FUN_FACTS.filter((fact) => fact.subject === "general")];
    }
  }

  // Narrow to question-bearing facts, but never to nothing — a thin subject
  // should degrade to a plain fact, not to an empty loader.
  if (requireQuestion) {
    const withQuestion = pool.filter((fact) => fact.question);
    if (withQuestion.length > 0) pool = withQuestion;
  }

  const avoid = new Set([...excludeIds, ...readRecentFactIds()]);
  const fresh = pool.filter((fact) => !avoid.has(fact.id));
  // Everything in the pool has been seen recently — start the cycle over
  // rather than showing nothing.
  const candidates = fresh.length > 0 ? fresh : pool;

  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Session-scoped, per-tab memory of what has already been shown. Deliberately
 * not in Zustand: this is a convenience, not app state, and it must never be
 * able to break a loading screen — hence the try/catch on every access.
 */
export function readRecentFactIds(): string[] {
  try {
    const raw = sessionStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function rememberFactId(id: string): void {
  try {
    const next = [id, ...readRecentFactIds().filter((existing) => existing !== id)].slice(
      0,
      RECENT_LIMIT,
    );
    sessionStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing or storage disabled — repeats are an acceptable cost.
  }
}
