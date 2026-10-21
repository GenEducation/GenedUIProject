import { describe, it, expect } from "vitest";
import { MIN_SIDE, boxBetween, moveBox, previewStyles, resizeBox, toThousandths } from "../cropGeometry";

describe("cropGeometry", () => {
  it("reads a pointer as thousandths of the page, kept on the page", () => {
    const rect = { left: 100, top: 50, width: 400, height: 600 } as DOMRect;
    expect(toThousandths(300, 350, rect)).toEqual({ x: 500, y: 500 });
    expect(toThousandths(0, 1000, rect)).toEqual({ x: 0, y: 1000 });
  });

  it("moves a box without changing its size, stopping at the page edge", () => {
    expect(moveBox([100, 100, 300, 400], 50, -20)).toEqual([80, 150, 280, 450]);
    expect(moveBox([100, 100, 300, 400], 900, -500)).toEqual([0, 700, 200, 1000]);
  });

  it("resizes only the dragged edges and never below the smallest side", () => {
    expect(resizeBox([100, 100, 300, 400], { bottom: true, right: true }, 50, 60)).toEqual([100, 100, 360, 450]);
    expect(resizeBox([100, 100, 300, 400], { top: true }, 0, 500)).toEqual([300 - MIN_SIDE, 100, 300, 400]);
    expect(resizeBox([100, 100, 300, 400], { left: true }, -500, 0)).toEqual([100, 0, 300, 400]);
  });

  it("draws a box between two points in any direction, once it is big enough", () => {
    expect(boxBetween({ x: 600, y: 500 }, { x: 200, y: 100 })).toEqual([100, 200, 500, 600]);
    expect(boxBetween({ x: 100, y: 100 }, { x: 105, y: 400 })).toBeNull();
  });

  it("previews exactly the box: the frame takes its pixel aspect, the image is scaled and shifted", () => {
    const { frame, image } = previewStyles([250, 500, 750, 1000], { width: 800, height: 1200 });
    expect(frame.aspectRatio).toBe(`${500 * 800} / ${500 * 1200}`);
    expect(image).toEqual({ width: "200%", height: "200%", left: "-100%", top: "-50%" });
  });
});
