import { beforeEach, describe, expect, it, vi } from "vitest";

import { authFetch } from "@/utils/authFetch";
import {
  allTaxonomyGrades,
  loadSubjectCatalog,
  requireExactSubject,
  resetSubjectCatalogForTests,
  SubjectValidationError,
  subjectsForGrade,
} from "../subjectCatalog";

vi.mock("@/utils/authFetch", () => ({
  authFetch: vi.fn(),
}));

const manifest = {
  subjects: [
    { name: "English", grades: [3, 4, 5, 6, 7, 8] },
    { name: "Mathematics", grades: [3, 4, 5, 6, 7, 8] },
    { name: "Science", grades: [6, 7, 8] },
    { name: "Social Science", grades: [6, 7, 8] },
  ],
};

describe("taxonomy subject catalogue", () => {
  beforeEach(() => {
    localStorage.clear();
    resetSubjectCatalogForTests();
    vi.mocked(authFetch).mockReset();
    vi.mocked(authFetch).mockResolvedValue(
      new Response(JSON.stringify(manifest), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("shares one complete-manifest request across concurrent consumers", async () => {
    const [first, second, third] = await Promise.all([
      loadSubjectCatalog(),
      loadSubjectCatalog(),
      loadSubjectCatalog(),
    ]);

    expect(authFetch).toHaveBeenCalledTimes(1);
    expect(authFetch).toHaveBeenCalledWith(
      "http://localhost:0/test-api/rag/taxonomy/subjects?board=CBSE",
    );
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it("derives grade support locally and preserves the exact taxonomy string", async () => {
    const catalog = await loadSubjectCatalog();

    expect(subjectsForGrade(5, catalog)).toEqual(["English", "Mathematics"]);
    expect(requireExactSubject("Social Science", 6, catalog)).toBe("Social Science");
  });

  it("uses the backend-derived ICSE board from the saved profile", async () => {
    localStorage.setItem("gened_user_profile", JSON.stringify({ school_board: "ICSE" }));

    await loadSubjectCatalog();

    expect(authFetch).toHaveBeenCalledWith(
      "http://localhost:0/test-api/rag/taxonomy/subjects?board=ICSE",
    );
  });

  it.each([
    ["math", 4],
    ["Math", 4],
    ["maths", 4],
    ["mathematics", 4],
    [" Mathematics", 4],
    ["Science", 5],
    ["General", 6],
    ["English", undefined],
  ])("rejects non-exact or unsupported subject %p at grade %p", async (subject, grade) => {
    const catalog = await loadSubjectCatalog();

    expect(() => requireExactSubject(subject, grade, catalog)).toThrow(
      SubjectValidationError,
    );
  });

  it("accepts a newly deployed taxonomy name without a frontend subject mapping", async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          subjects: [
            ...manifest.subjects,
            { name: "Environmental Studies", grades: [4] },
          ],
        }),
      ),
    );

    const catalog = await loadSubjectCatalog();
    expect(requireExactSubject("Environmental Studies", 4, catalog)).toBe(
      "Environmental Studies",
    );
  });

  it("unions grades across subjects without duplicates and in order", async () => {
    // Science and Social Science both serve 6-8, English and Mathematics 3-8.
    const catalog = await loadSubjectCatalog();
    expect(allTaxonomyGrades(catalog)).toEqual([3, 4, 5, 6, 7, 8]);
  });

  it("offers a grade the moment any single subject serves it", async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ subjects: [{ name: "Environmental Studies", grades: [9] }] }),
      ),
    );

    // A grade picker built from a literal array would silently omit 9 here.
    expect(allTaxonomyGrades(await loadSubjectCatalog())).toEqual([9]);
  });

  it("offers no grades before the catalogue loads, rather than guessing", async () => {
    expect(allTaxonomyGrades([])).toEqual([]);
  });

  it("fails closed on a malformed catalogue", async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ subjects: [{ name: "English", grades: [] }] })),
    );

    await expect(loadSubjectCatalog()).rejects.toThrow(
      "taxonomy subject catalogue response is invalid",
    );
  });
});
