import { describe, it, expect, beforeEach } from "vitest";
import { pickFunFact, toFactSubject, rememberFactId } from "../pickFunFact";
import { FUN_FACTS } from "../../constants/funFacts";
import { FACT_THEME_ICONS } from "../../constants/factThemes";

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

  it("tags every fact with a theme that has a registered icon", () => {
    for (const fact of FUN_FACTS) {
      // Catches a mistyped theme here rather than rendering undefined as a
      // React component at runtime. Lucide icons are forwardRef objects, not
      // plain functions, so this checks presence rather than typeof.
      expect(FACT_THEME_ICONS[fact.theme], fact.id).toBeTruthy();
    }
  });

  it("uses every theme in the registry at least once", () => {
    const used = new Set(FUN_FACTS.map((f) => f.theme));
    for (const theme of Object.keys(FACT_THEME_ICONS)) {
      expect(used.has(theme as keyof typeof FACT_THEME_ICONS), theme).toBe(true);
    }
  });

  it("keeps every subject pool big enough to avoid obvious repeats", () => {
    // RECENT_LIMIT is 15, so a pool at or under that cycles fully within one
    // sitting and the student starts seeing the same facts again.
    for (const subject of ["Mathematics", "Science", "English", "Social Science"] as const) {
      const pool = FUN_FACTS.filter((f) => f.subject === subject);
      expect(pool.length, subject).toBeGreaterThan(15);
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

  it("always returns a fact, with or without a subject", () => {
    for (let i = 0; i < 40; i++) {
      expect(pickFunFact({})).not.toBeNull();
      expect(pickFunFact({ subject: "Science" })).not.toBeNull();
      expect(pickFunFact({ subject: "Astrobiology" })).not.toBeNull();
    }
  });

  it("draws from the whole dataset when no subject is given", () => {
    // Grades are deliberately not a filter, so nothing is held back here.
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      sessionStorage.clear();
      seen.add(pickFunFact({})!.subject);
    }
    expect(seen).toEqual(new Set(["general", "Mathematics", "Science", "English", "Social Science"]));
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

  it("honours excludeIds", () => {
    const all = FUN_FACTS.filter((f) => f.subject === "Science");
    const excluded = all.slice(0, all.length - 1).map((f) => f.id);
    for (let i = 0; i < 20; i++) {
      const fact = pickFunFact({ subject: "Science", excludeIds: excluded });
      expect(excluded).not.toContain(fact!.id);
    }
  });

  it("avoids ids remembered in sessionStorage", () => {
    const target = FUN_FACTS[0];
    rememberFactId(target.id);
    for (let i = 0; i < 40; i++) {
      expect(pickFunFact({})!.id).not.toBe(target.id);
    }
  });

  it("starts the cycle over rather than returning null once everything is excluded", () => {
    const allIds = FUN_FACTS.map((f) => f.id);
    expect(pickFunFact({ excludeIds: allIds })).not.toBeNull();
  });
});
