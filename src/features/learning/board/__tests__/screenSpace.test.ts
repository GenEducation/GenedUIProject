import { describe, it, expect, afterEach } from "vitest";
import { layoutX, localPoint } from "../screenSpace";

const el = (rect: { left: number; top: number; right: number; bottom: number }) =>
  ({ getBoundingClientRect: () => ({ ...rect, width: rect.right - rect.left, height: rect.bottom - rect.top }) }) as unknown as Element;

afterEach(() => {
  delete document.documentElement.dataset.lessonRotated;
  delete document.documentElement.dataset.lessonScale;
});

describe("screen space", () => {
  it("turns a pointer into the lesson's own axes when the lesson is drawn turned", () => {
    document.documentElement.dataset.lessonRotated = "true";
    // A board 200 wide × 100 tall in layout, turned: on screen it's 100 wide × 200 tall.
    const board = el({ left: 50, top: 10, right: 150, bottom: 210 });
    // Its layout top-left corner sits at the screen's top-right of the box.
    expect(localPoint(board, 150, 10)).toEqual({ x: 0, y: 0 });
    // Moving down the screen moves right along the board; moving left on screen moves down the board.
    expect(localPoint(board, 150, 110)).toEqual({ x: 100, y: 0 });
    expect(localPoint(board, 100, 10)).toEqual({ x: 0, y: 50 });
    expect(layoutX(60, 70)).toBe(70);
  });
});
