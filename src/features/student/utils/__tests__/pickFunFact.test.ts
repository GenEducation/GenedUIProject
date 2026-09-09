import { describe, it, expect, beforeEach } from "vitest";
import { pickFunFact, toFactSubject, rememberFactId } from "../pickFunFact";
import { FUN_FACTS } from "../../constants/funFacts";

describe("FUN_FACTS data integrity", () => {
  it("has unique ids", () => {
    const ids = FUN_FACTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps every fact short enough to read during a loader", () => {
    for (const fact of FUN_FACTS) {
      expect(fact.text.length, fact.id).toBeLessThanOrEqual(160);
      expect(fact.text.trim().length, fact.id).toBeGreaterThan(0);
    }
  });

  it("has a coherent grade band and an emoji on every fact", () => {
    for (const fact of FUN_FACTS) {
      expect(fact.minGrade, fact.id).toBeLessThanOrEqual(fact.maxGrade);
      expect(fact.minGrade, fact.id).toBeGreaterThanOrEqual(1);
      expect(fact.maxGrade, fact.id).toBeLessThanOrEqual(12);
      expect(fact.emoji, fact.id).toBeTruthy();
    }
  });

  it("covers every grade from 1 to 12", () => {
    for (let grade = 1; grade <= 12; grade++) {
      const available = FUN_FACTS.filter((f) => grade >= f.minGrade && grade <= f.maxGrade);
      expect(available.length, `grade ${grade}`).toBeGreaterThan(0);
    }
  });
});

describe("toFactSubject", () => {
  it("maps taxonomy names onto broad buckets, case-insensitively", () => {
    expect(toFactSubject("Mathematics")).toBe("Mathematics");
    expect(toFactSubject("maths")).toBe("Mathematics");
    expect(toFactSubject("Physics")).toBe("Science");
    expect(toFactSubject("History")).toBe("Social Science");
    expect(toFactSubject("Social & Political Science")).toBe("Social Science");
  });

  it("falls back to general for unknown or missing subjects", () => {
    expect(toFactSubject("Astrobiology")).toBe("general");
    expect(toFactSubject(null)).toBe("general");
    expect(toFactSubject(undefined)).toBe("general");
  });
});

describe("pickFunFact", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("never returns a fact outside the requested grade", () => {
    for (let grade = 1; grade <= 12; grade++) {
      for (let i = 0; i < 40; i++) {
        const fact = pickFunFact({ grade });
        expect(fact).not.toBeNull();
        expect(fact!.minGrade, `${fact!.id} for grade ${grade}`).toBeLessThanOrEqual(grade);
        expect(fact!.maxGrade, `${fact!.id} for grade ${grade}`).toBeGreaterThanOrEqual(grade);
      }
    }
  });

  it("excludes the abstract 9-12 band when the grade is unknown", () => {
    for (let i = 0; i < 60; i++) {
      const fact = pickFunFact({});
      expect(fact!.minGrade).toBeLessThanOrEqual(8);
    }
  });

  it("prefers the requested subject, topping up with general facts only", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const fact = pickFunFact({ grade: 6, subject: "Science" });
      seen.add(fact!.subject);
    }
    expect(seen.has("Mathematics")).toBe(false);
    expect(seen.has("English")).toBe(false);
    expect(seen.has("Science")).toBe(true);
  });

  it("honours excludeIds", () => {
    const all = FUN_FACTS.filter((f) => f.subject === "Science" && f.minGrade <= 6 && f.maxGrade >= 6);
    const excluded = all.slice(0, all.length - 1).map((f) => f.id);
    for (let i = 0; i < 20; i++) {
      const fact = pickFunFact({ grade: 6, subject: "Science", excludeIds: excluded });
      expect(excluded).not.toContain(fact!.id);
    }
  });

  it("avoids ids remembered in sessionStorage", () => {
    const target = FUN_FACTS.find((f) => f.minGrade <= 3 && f.maxGrade >= 3)!;
    rememberFactId(target.id);
    for (let i = 0; i < 40; i++) {
      expect(pickFunFact({ grade: 3 })!.id).not.toBe(target.id);
    }
  });

  it("starts the cycle over rather than returning null once everything is excluded", () => {
    const allIds = FUN_FACTS.map((f) => f.id);
    expect(pickFunFact({ grade: 3, excludeIds: allIds })).not.toBeNull();
  });
});
