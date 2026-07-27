import { useEffect } from "react";
import { create } from "zustand";

import { authFetch } from "@/utils/authFetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
const EXACT_SUBJECT = Symbol("ExactSubject");

export type ExactSubject = string & { readonly [EXACT_SUBJECT]: true };

export interface TaxonomySubject {
  name: ExactSubject;
  grades: number[];
}

interface RawTaxonomySubject {
  name?: unknown;
  grades?: unknown;
}

interface SubjectCatalogState {
  subjects: TaxonomySubject[];
  isLoaded: boolean;
  error: string | null;
  setLoaded: (subjects: TaxonomySubject[]) => void;
  setError: (message: string) => void;
}

export class SubjectValidationError extends Error {
  readonly code = "SUBJECT_NOT_IN_TAXONOMY";
  readonly subject: unknown;
  readonly grade: unknown;
  readonly allowedSubjects: string[];

  constructor(subject: unknown, grade: unknown, allowedSubjects: string[]) {
    const reason = Number.isInteger(grade)
      ? `"${String(subject)}" is not available for Grade ${String(grade)}.`
      : "A valid student grade is required before selecting a subject.";
    super(reason);
    this.name = "SubjectValidationError";
    this.subject = subject;
    this.grade = grade;
    this.allowedSubjects = allowedSubjects;
  }
}

export const useSubjectCatalog = create<SubjectCatalogState>((set) => ({
  subjects: [],
  isLoaded: false,
  error: null,
  setLoaded: (subjects) => set({ subjects, isLoaded: true, error: null }),
  setError: (message) => set({ subjects: [], isLoaded: false, error: message }),
}));

let catalogRequest: Promise<TaxonomySubject[]> | null = null;

function parseCatalog(payload: unknown): TaxonomySubject[] {
  const rows =
    payload && typeof payload === "object" && Array.isArray((payload as { subjects?: unknown }).subjects)
      ? ((payload as { subjects: RawTaxonomySubject[] }).subjects)
      : null;
  if (!rows) throw new Error("The taxonomy subject catalogue response is invalid.");

  const names = new Set<string>();
  return rows.map((row) => {
    if (
      typeof row.name !== "string" ||
      row.name.length === 0 ||
      !Array.isArray(row.grades) ||
      row.grades.length === 0 ||
      !row.grades.every(Number.isInteger) ||
      names.has(row.name)
    ) {
      throw new Error("The taxonomy subject catalogue response is invalid.");
    }
    names.add(row.name);
    return {
      // The brand is earned here: this value came from the taxonomy endpoint.
      name: row.name as ExactSubject,
      grades: [...row.grades],
    };
  });
}

/**
 * Fetch the complete taxonomy manifest once per browser runtime. All callers
 * share the same promise and derive grade-specific views in memory.
 */
export function loadSubjectCatalog(): Promise<TaxonomySubject[]> {
  if (!catalogRequest) {
    catalogRequest = authFetch(`${API_BASE_URL}/rag/taxonomy/subjects`)
      .then(async (response) => parseCatalog(await response.json()))
      .then((subjects) => {
        useSubjectCatalog.getState().setLoaded(subjects);
        return subjects;
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Unable to load the subject catalogue.";
        useSubjectCatalog.getState().setError(message);
        throw error;
      });
  }
  return catalogRequest;
}

export function subjectsForGrade(
  grade: unknown,
  catalog: TaxonomySubject[] = useSubjectCatalog.getState().subjects,
): ExactSubject[] {
  if (!Number.isInteger(grade)) return [];
  return catalog.filter((item) => item.grades.includes(grade as number)).map((item) => item.name);
}

/**
 * Strict validation boundary for API, storage, and UI values. It deliberately
 * performs no trimming, case folding, aliasing, or punctuation conversion.
 */
export function requireExactSubject(
  subject: unknown,
  grade: unknown,
  catalog: TaxonomySubject[] = useSubjectCatalog.getState().subjects,
): ExactSubject {
  const allowed = subjectsForGrade(grade, catalog);
  if (typeof subject === "string") {
    const match = allowed.find((candidate) => candidate === subject);
    if (match) return match;
  }
  throw new SubjectValidationError(subject, grade, allowed);
}

export async function requireLoadedExactSubject(
  subject: unknown,
  grade: unknown,
): Promise<ExactSubject> {
  const catalog = await loadSubjectCatalog();
  return requireExactSubject(subject, grade, catalog);
}

export function isSubjectValidationError(error: unknown): error is SubjectValidationError {
  return error instanceof SubjectValidationError;
}

export function useTaxonomySubjects(): TaxonomySubject[] {
  const subjects = useSubjectCatalog((state) => state.subjects);
  useEffect(() => {
    void loadSubjectCatalog().catch(() => {
      // The catalogue store exposes the failure. Subject actions remain closed.
    });
  }, []);
  return subjects;
}

/** Test-only reset for deterministic request de-duplication tests. */
export function resetSubjectCatalogForTests(): void {
  catalogRequest = null;
  useSubjectCatalog.setState({ subjects: [], isLoaded: false, error: null });
}
