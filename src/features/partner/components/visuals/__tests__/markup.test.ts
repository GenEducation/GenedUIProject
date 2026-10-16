import { describe, it, expect } from "vitest";
import { boxFrom, composeNote, cropWords, marksText, overLimit, pinBox, specParts, whereOnPicture, type Mark } from "../markup";
import { contentRect } from "../MarkupLayer";
import { NOTE_MAX } from "../../../types/visuals";

const mark = (over: Partial<Mark>): Mark => ({ id: "m", kind: "change", box: { x: 0, y: 0, w: 0.2, h: 0.2 }, part: "", instruction: "", ...over });

describe("marking up a visual", () => {
  it("says where a box is the way a person would", () => {
    expect(whereOnPicture({ x: 0, y: 0, w: 0.2, h: 0.2 })).toBe("top left");
    expect(whereOnPicture({ x: 0.4, y: 0.4, w: 0.2, h: 0.2 })).toBe("centre");
    expect(whereOnPicture({ x: 0.8, y: 0.4, w: 0.2, h: 0.2 })).toBe("right side");
    expect(whereOnPicture({ x: 0.4, y: 0.8, w: 0.2, h: 0.2 })).toBe("bottom");
    expect(whereOnPicture({ x: 0, y: 0, w: 0.9, h: 0.9 })).toBe("most of the picture");
  });

  it("keeps boxes and pins inside the picture", () => {
    const b = boxFrom({ x: 0.9, y: 0.9 }, { x: 1.4, y: -0.2 });
    expect([b.x, b.y, b.w, b.h].map((v) => Number(v.toFixed(6)))).toEqual([0.9, 0, 0.1, 0.9]);
    const pin = pinBox({ x: 1, y: 0 });
    expect(pin.x + pin.w).toBeLessThanOrEqual(1);
    expect(pin.y).toBe(0);
  });

  it("writes the marks as numbered instructions, the crop first, then the partner's note", () => {
    const marks = [
      mark({ id: "a", instruction: "remove it", part: 'the "Rama" label' }),
      mark({ id: "b", kind: "crop", box: { x: 0.5, y: 0.5, w: 0.5, h: 0.5 } }),
    ];
    expect(marksText(marks)).toBe(
      'Changes marked on the picture:\n1. Crop: keep only the bottom right area and drop the rest.\n2. Top left (the "Rama" label): remove it.',
    );
    expect(composeNote(marks, "  Keep the colours.  ")).toMatch(/remove it\.\nKeep the colours\.$/);
    expect(composeNote([], "  ")).toBeNull();
    expect(composeNote([mark({})], "")).toContain("1. Top left: change this.");
  });

  it("words a big crop by the edges it trims, and a small one by the area it keeps", () => {
    expect(cropWords({ x: 0.1, y: 0.15, w: 0.9, h: 0.85 })).toBe("trim the top and left edges");
    expect(cropWords({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })).toBe("trim the top, right, bottom and left edges");
    expect(cropWords({ x: 0, y: 0, w: 1, h: 0.9 })).toBe("trim the bottom edge");
    expect(cropWords({ x: 0.6, y: 0.6, w: 0.3, h: 0.3 })).toBe("keep only the bottom right area");
    expect(marksText([mark({ kind: "crop", box: { x: 0.1, y: 0.15, w: 0.9, h: 0.85 }, instruction: "remove the orange tree" })])).toBe(
      "Changes marked on the picture:\n1. Crop: trim the top and left edges. Remove the orange tree.",
    );
  });

  it("counts marks and note against the one note limit", () => {
    expect(overLimit([mark({})], "")).toBe(0);
    expect(overLimit([mark({})], "x".repeat(NOTE_MAX))).toBeGreaterThan(0);
  });

  it("offers the spec's labels and objects as parts", () => {
    const parts = specParts({
      title: null, purpose: "p", layout: "l", caption: null, source_refs: ["r"], checklist: ["c"],
      texts: [{ text: "Rama", role: "label", where: "top" }],
      objects: [{ id: "o", what: "speech bubble", colour: "white", position: "top", notes: "" }],
    });
    expect(parts).toEqual(['the "Rama" label', "the speech bubble"]);
    expect(specParts(null)).toEqual([]);
  });

  it("lines marks up with the picture inside its 4:3 frame", () => {
    expect(contentRect(800, 600)).toEqual({ left: 0, top: 0, width: 100, height: 100 });
    expect(contentRect(1600, 600).top).toBeGreaterThan(0); // wide: bands above and below
    expect(contentRect(600, 800).left).toBeGreaterThan(0); // tall: bands at the sides
  });
});
