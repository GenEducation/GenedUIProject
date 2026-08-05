import { useEffect } from "react";
import { create } from "zustand";

import { authFetch } from "@/utils/authFetch";
import { isEducationBoard, type EducationBoard } from "@/types/education";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
const EXACT_SUBJECT = Symbol("ExactSubject");
const DEFAULT_TAXONOMY_BOARD: EducationBoard = "CBSE";

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

const catalogRequests = new Map<EducationBoard, Promise<TaxonomySubject[]>>();

function profileBoard(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const rawProfile = localStorage.getItem("gened_user_profile");
    if (!rawProfile) return undefined;
    const profile: unknown = JSON.parse(rawProfile);
    if (!profile || typeof profile !== "object") return undefined;
    const stored = profile as { school_board?: unknown; board?: unknown };
    if (typeof stored.school_board === "string") return stored.school_board;
    return typeof stored.board === "string" ? stored.board : undefined;
  } catch {
    return undefined;
  }
}

export function resolveTaxonomyBoard(board?: string): EducationBoard {
  const candidate = board ?? profileBoard() ?? DEFAULT_TAXONOMY_BOARD;
  if (isEducationBoard(candidate)) return candidate;
  throw new Error("The profile contains an unsupported school board.");
}

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
 * Fetch the complete taxonomy manifest once per board per browser runtime.
 * The board comes from the backend-derived profile when a caller does not
 * explicitly provide one; CBSE is only the pre-profile/default-partner path.
 */
export function loadSubjectCatalog(board?: string): Promise<TaxonomySubject[]> {
  const resolvedBoard = resolveTaxonomyBoard(board);
  let catalogRequest = catalogRequests.get(resolvedBoard);
  if (!catalogRequest) {
    catalogRequest = authFetch(
      `${API_BASE_URL}/rag/taxonomy/subjects?board=${encodeURIComponent(resolvedBoard)}`,
    )
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
    catalogRequests.set(resolvedBoard, catalogRequest);
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
 * Every grade the taxonomy serves, ascending, across all subjects. Grade
 * pickers derive their options from this so a taxonomy change reaches the UI
 * without a matching edit to a literal array, and so a grade can never be
 * offered that carries no subjects.
 */
export function allTaxonomyGrades(
  catalog: TaxonomySubject[] = useSubjectCatalog.getState().subjects,
): number[] {
  const grades = new Set<number>();
  for (const item of catalog) {
    for (const grade of item.grades) grades.add(grade);
  }
  return [...grades].sort((a, b) => a - b);
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
  board?: string,
): Promise<ExactSubject> {
  const catalog = await loadSubjectCatalog(board);
  return requireExactSubject(subject, grade, catalog);
}

export function isSubjectValidationError(error: unknown): error is SubjectValidationError {
  return error instanceof SubjectValidationError;
}

export function useTaxonomySubjects(board?: string): TaxonomySubject[] {
  const subjects = useSubjectCatalog((state) => state.subjects);
  useEffect(() => {
    void loadSubjectCatalog(board).catch(() => {
      // The catalogue store exposes the failure. Subject actions remain closed.
    });
  }, [board]);
  return subjects;
}

/** Test-only reset for deterministic request de-duplication tests. */
export function resetSubjectCatalogForTests(): void {
  catalogRequests.clear();
  useSubjectCatalog.setState({ subjects: [], isLoaded: false, error: null });
}

/**
 * Fetches all grades across all boards. Used by unauthenticated flows (e.g. signup).
 */
export async function fetchAllTaxonomyGrades(): Promise<number[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/rag/taxonomy/subjects`);
    if (!response.ok) return [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const data = await response.json();
    const catalog = data.subjects.map((row: any) => ({
      name: row.name as ExactSubject,
      grades: [...row.grades]
    }));
    return allTaxonomyGrades(catalog);
  } catch {
    return [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // Fallback
  }
}
