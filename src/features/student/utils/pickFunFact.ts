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

/**
 * When the grade is unknown we exclude the 9-12 band rather than showing
 * everything: an abstract fact in front of a seven-year-old is a worse failure
 * than a simple fact in front of a teenager.
 */
const UNKNOWN_GRADE_MAX_MIN_GRADE = 8;

function fitsGrade(fact: FunFact, grade?: number | null): boolean {
  if (typeof grade !== "number" || !Number.isFinite(grade)) {
    return fact.minGrade <= UNKNOWN_GRADE_MAX_MIN_GRADE;
  }
  return grade >= fact.minGrade && grade <= fact.maxGrade;
}

export interface PickFunFactOptions {
  grade?: number | null;
  /** Raw taxonomy subject name, or a `FactSubject`. Both are accepted. */
  subject?: string | null;
  /** Ids to avoid, on top of the ones remembered in sessionStorage. */
  excludeIds?: readonly string[];
}

/**
 * Picks one age-appropriate fact, preferring the current subject.
 *
 * Returns `null` only if the dataset is empty — every caller must render
 * correctly without a fact.
 */
export function pickFunFact(options: PickFunFactOptions = {}): FunFact | null {
  const { grade, subject, excludeIds = [] } = options;

  const byGrade = FUN_FACTS.filter((fact) => fitsGrade(fact, grade));
  if (byGrade.length === 0) return null;

  const bucket = toFactSubject(subject);
  let pool = byGrade;

  if (bucket !== "general") {
    const onSubject = byGrade.filter((fact) => fact.subject === bucket);
    if (onSubject.length > 0) {
      pool =
        onSubject.length >= MIN_SUBJECT_POOL
          ? onSubject
          : [...onSubject, ...byGrade.filter((fact) => fact.subject === "general")];
    }
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
