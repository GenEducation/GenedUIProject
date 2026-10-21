import { describe, it, expect, beforeEach } from "vitest";
import { pickFunFact, toFactSubject, rememberFactId } from "../pickFunFact";
import { FUN_FACTS } from "../../constants/funFacts";
import { FACT_THEME_ICONS } from "../../constants/factThemes";

describe("FUN_FACTS data integrity", () => {
  it("has unique ids, short readable text, well formed questions and registered theme icons", () => {
    const ids = FUN_FACTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const fact of FUN_FACTS) {
      expect(fact.text.length, fact.id).toBeLessThanOrEqual(160);
      expect(fact.text.trim().length, fact.id).toBeGreaterThan(0);
      if (fact.question) {
        expect(fact.question.length, fact.id).toBeLessThanOrEqual(160);
        expect(fact.question.endsWith("?"), fact.id).toBe(true);
      }
      // Catches a mistyped theme here rather than rendering undefined as a
      // React component at runtime. Lucide icons are forwardRef objects, not
      // plain functions, so this checks presence rather than typeof.
      expect(FACT_THEME_ICONS[fact.theme], fact.id).toBeTruthy();
    }
  });

  it("keeps every subject pool big enough, with questions, to avoid obvious repeats", () => {
    // RECENT_LIMIT is 15, so a pool at or under that cycles fully within one
    // sitting and the student starts seeing the same facts again.
    for (const subject of ["Mathematics", "Science", "English", "Social Science"] as const) {
      const pool = FUN_FACTS.filter((f) => f.subject === subject);
      expect(pool.length, subject).toBeGreaterThan(15);
      expect(pool.filter((f) => f.question).length, subject).toBeGreaterThanOrEqual(5);
    }
  });
});

describe("toFactSubject", () => {
  it("maps taxonomy names onto broad buckets, falling back to general", () => {
    expect(toFactSubject("Mathematics")).toBe("Mathematics");
    expect(toFactSubject("maths")).toBe("Mathematics");
    expect(toFactSubject("Physics")).toBe("Science");
    expect(toFactSubject("History")).toBe("Social Science");
    expect(toFactSubject("Social & Political Science")).toBe("Social Science");
    expect(toFactSubject("Astrobiology")).toBe("general");
    expect(toFactSubject(null)).toBe("general");
  });
});

describe("pickFunFact", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("never returns null: any subject, no questions available, or everything excluded", () => {
    for (let i = 0; i < 40; i++) {
      expect(pickFunFact({})).not.toBeNull();
      expect(pickFunFact({ subject: "Astrobiology" })).not.toBeNull();
    }
    // Excluding every question-bearing id simulates a subject with no questions.
    const questionIds = FUN_FACTS.filter((f) => f.question).map((f) => f.id);
    expect(pickFunFact({ requireQuestion: true, excludeIds: questionIds })).not.toBeNull();
    // Starts the cycle over once everything is excluded.
    expect(pickFunFact({ excludeIds: FUN_FACTS.map((f) => f.id) })).not.toBeNull();
  });

  it("prefers the requested subject, topping up with general facts only", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      seen.add(pickFunFact({ subject: "Science" })!.subject);
    }
    expect(seen.has("Mathematics")).toBe(false);
    expect(seen.has("English")).toBe(false);
    expect(seen.has("Science")).toBe(true);
  });

  it("returns only question-bearing facts when requireQuestion is set", () => {
    for (const subject of ["Mathematics", "Science", "English", "Social Science"]) {
      for (let i = 0; i < 30; i++) {
        const fact = pickFunFact({ subject, requireQuestion: true });
        expect(fact!.question, `${subject} -> ${fact!.id}`).toBeTruthy();
      }
    }
  });

  it("honours excludeIds and ids remembered in sessionStorage", () => {
    const all = FUN_FACTS.filter((f) => f.subject === "Science");
    const excluded = all.slice(0, all.length - 1).map((f) => f.id);
    for (let i = 0; i < 20; i++) {
      const fact = pickFunFact({ subject: "Science", excludeIds: excluded });
      expect(excluded).not.toContain(fact!.id);
    }
    const target = FUN_FACTS[0];
    rememberFactId(target.id);
    for (let i = 0; i < 40; i++) {
      expect(pickFunFact({})!.id).not.toBe(target.id);
    }
  });
});
