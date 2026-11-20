import { describe, it, expect } from "vitest";
import { readable, stepInfo } from "../stepInfo";
import { ALREADY_COVERED_NOTE } from "../reading/book";
import type { TeacherPayload } from "../types";

const chunk = (id: string, text: string, element_type = "paragraph") => ({ id, element_type, text, page: 4 });

function payload(node: Partial<TeacherPayload["node"]> = {}): TeacherPayload {
  return {
    schema_version: "teacher_node_v13",
    node: {
      id: "n1", title: "SYNTHETIC step", type: "teach", teach_only: false, figure_groups: [], check_items: [], est_minutes: 5,
      sections: [],
      ...node,
    },
    student_context: { next_nodes: [] },
  };
}

describe("stepInfo", () => {
  it("reads concepts, outcomes and printed questions from the payload", () => {
    const info = stepInfo(payload({
      components: [{ id: "c1", title: "SYNTHETIC poles", definition: "SYNTHETIC a magnet has two poles." }],
      parent_los: [{ id: "lo1", code: "LO1", title: "SYNTHETIC explains magnets" }],
      discussion_prompts: [{ id: "d1", prompt: "2. True or false?\n(i) A magnet can be\nbroken.\n[  ]" }],
    }));
    expect(info.concepts.map((c) => c.title)).toEqual(["SYNTHETIC poles"]);
    expect(info.outcomes.map((o) => o.title)).toEqual(["SYNTHETIC explains magnets"]);
    // The answer box is dropped, wrapped lines joined, and each part keeps its own line.
    expect(info.practice[0].prompt).toBe("2. True or false?\n(i) A magnet can be broken.");
  });

  it("takes worked examples, summary points, key words and side notes from the step's sections", () => {
    const info = stepInfo(payload({
      sections: [{
        id: "s1", title: "SYNTHETIC 4.5", path: [], chunks: [
          chunk("p", "SYNTHETIC plain text."),
          chunk("w", "SYNTHETIC 3 m = 300 cm.", "worked_example"),
          chunk("h", "Summary Key Points", "summary"),
          chunk("s", "SYNTHETIC like poles repel.", "summary"),
          chunk("g", "munching: chewing\nwagged: moved from\nside to side", "note"),
          chunk("n", "SYNTHETIC In some magnets, the North pole is marked: with a white dot.", "note"),
        ],
      }],
    }));
    expect(info.examples).toEqual([{ id: "w", section: "SYNTHETIC 4.5", text: "SYNTHETIC 3 m = 300 cm.", page: 4 }]);
    expect(info.notes.summary.map((s) => s.text)).toEqual(["SYNTHETIC like poles repel."]);
    expect(info.notes.keyWords.map((k) => [k.term, k.meaning])).toEqual([["munching", "chewing"], ["wagged", "moved from side to side"]]);
    expect(info.notes.notes.map((n) => n.text)).toEqual(["SYNTHETIC In some magnets, the North pole is marked: with a white dot."]);
  });

  it("never shows a teacher's note or the backend's 'already read' marker, and lists a passage gloss once", () => {
    const info = stepInfo(payload({
      sections: [{ id: "s1", title: "S", path: [], chunks: [
        chunk("t", "Note for Teachers: SYNTHETIC discuss with students.", "note"),
        chunk("tn", "SYNTHETIC tutor only", "teacher_note"),
        chunk("a", ALREADY_COVERED_NOTE, "note"),
        chunk("g", "crumbs: small pieces of food", "note"),
      ] }],
      passages: [{ id: "p", title: "SYNTHETIC story", segments: [{ segment: 1, chunks: [chunk("g2", "crumbs: small pieces of food", "note")] }] }],
    }));
    expect(info.notes.keyWords.map((k) => k.term)).toEqual(["crumbs"]);
    expect(info.notes.notes).toEqual([]);
  });

  it("is empty for a missing payload, or an older one that never had these fields", () => {
    for (const info of [stepInfo(null), stepInfo(payload())]) {
      expect(info.concepts).toEqual([]);
      expect(info.outcomes).toEqual([]);
      expect(info.examples).toEqual([]);
      expect(info.practice).toEqual([]);
      expect(info.notes).toEqual({ summary: [], keyWords: [], notes: [] });
    }
  });
});

describe("readable", () => {
  it("keeps a sentence whole when its wrap starts with a small word", () => {
    expect(readable("A magnet\nis strong.")).toBe("A magnet is strong.");
  });
});
