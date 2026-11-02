import { describe, it, expect } from "vitest";
import type { ReleaseProposal } from "../../types/sources";
import { groupByKind, kindInfo, summarize } from "../releaseSummary";

const teachingOnly = {
  id: "p1",
  kind: "teaching_only",
  target_id: null,
  state: "pending",
  content: {
    value: {
      title: "Taught with open questions only",
      description: "No question in this chapter can be checked automatically.",
      open_questions: ["SYNTHETIC Describe your trip."],
    },
  },
} as unknown as ReleaseProposal;

describe("a teaching-only chapter in review (backend ADR 0041)", () => {
  it("names the unit and what accepting it means", () => {
    expect(kindInfo("teaching_only").label).toBe("Taught with open questions only");
    expect(kindInfo("teaching_only").hint).toMatch(/nothing in it measures mastery/);
    expect(summarize(teachingOnly).title).toBe("Taught with open questions only");
    expect(groupByKind([teachingOnly])[0].info.label).toBe("Taught with open questions only");
  });
});
