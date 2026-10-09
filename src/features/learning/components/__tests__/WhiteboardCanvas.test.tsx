import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LESSON_ID, lessonFixture, FIGURE_GROUP } from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";
import { WhiteboardCanvas } from "../WhiteboardCanvas";

// jsdom lays nothing out; give the board a size so the camera can frame.
const sizes = { clientWidth: 1000, clientHeight: 700 };
const original = Object.fromEntries(
  Object.keys(sizes).map((k) => [k, Object.getOwnPropertyDescriptor(HTMLElement.prototype, k)]),
);

beforeEach(async () => {
  for (const [k, v] of Object.entries(sizes)) Object.defineProperty(HTMLElement.prototype, k, { configurable: true, get: () => v });
  lessonFixture.reset();
  useLessonStore.getState().reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  lessonFixture.setHistory([{ turn_id: "t1", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [FIGURE_GROUP] }]);
  await useLessonStore.getState().load(LESSON_ID);
});
afterEach(() => {
  for (const [k, d] of Object.entries(original)) if (d) Object.defineProperty(HTMLElement.prototype, k, d);
});

const zoom = () => Number(screen.getByRole("toolbar", { name: "Zoom" }).textContent?.match(/(\d+)%/)?.[1]);

describe("WhiteboardCanvas", () => {
  it("frames the figure whole on load, at a zoom that fits the board", () => {
    render(<WhiteboardCanvas />);
    expect(screen.getByRole("img", { name: "SYNTHETIC figure" })).toBeInTheDocument();
    // An 800x600 picture is drawn 760x570 on the board; 88% of a 1000x700 view fits it at ~108%.
    expect(zoom()).toBeGreaterThan(100);
    expect(zoom()).toBeLessThan(115);
  });

  it("zooms in and out with the buttons, gliding to the new zoom", async () => {
    render(<WhiteboardCanvas />);
    const start = zoom();
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    await waitFor(() => expect(zoom()).toBe(Math.round(start / 1.25)), { timeout: 3000 });
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    await waitFor(() => expect(zoom()).toBe(start), { timeout: 3000 });
  });
});
