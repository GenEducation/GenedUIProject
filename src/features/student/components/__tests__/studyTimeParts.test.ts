import { describe, expect, it } from "vitest";
import { studyTimeParts } from "../StreakStats";

describe("studyTimeParts", () => {
  it("shows minutes under an hour", () => {
    expect(studyTimeParts(0)).toEqual([{ n: 0, u: "min" }]);
    expect(studyTimeParts(45)).toEqual([{ n: 45, u: "min" }]);
  });

  it("shows hours and minutes from an hour up", () => {
    expect(studyTimeParts(135)).toEqual([{ n: 2, u: "h" }, { n: 15, u: "m" }]);
  });

  it("drops the minutes on a whole hour", () => {
    expect(studyTimeParts(180)).toEqual([{ n: 3, u: "h" }]);
  });

  it("rounds fractional minutes and clamps negatives", () => {
    expect(studyTimeParts(59.6)).toEqual([{ n: 1, u: "h" }]);
    expect(studyTimeParts(-5)).toEqual([{ n: 0, u: "min" }]);
  });
});
