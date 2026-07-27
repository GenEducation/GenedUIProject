import { beforeEach, describe, expect, it, vi } from "vitest";

import { authFetch } from "@/utils/authFetch";
import {
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
      "http://localhost:0/test-api/rag/taxonomy/subjects",
    );
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it("derives grade support locally and preserves the exact taxonomy string", async () => {
    const catalog = await loadSubjectCatalog();

    expect(subjectsForGrade(5, catalog)).toEqual(["English", "Mathematics"]);
    expect(requireExactSubject("Social Science", 6, catalog)).toBe("Social Science");
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

  it("fails closed on a malformed catalogue", async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ subjects: [{ name: "English", grades: [] }] })),
    );

    await expect(loadSubjectCatalog()).rejects.toThrow(
      "taxonomy subject catalogue response is invalid",
    );
  });
});
