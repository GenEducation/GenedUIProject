import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { LESSON_ID, lessonFixture, makeLessonInstance } from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";

import { LessonProgressRail } from "../LessonProgressRail";
import { BoardPanel } from "../BoardPanel";

const store = () => useLessonStore.getState();
const steps = () => within(screen.getByRole("list", { name: "Lesson steps" })).getAllByRole("listitem").map((li) => li.textContent);

beforeEach(() => {
  lessonFixture.reset();
  store().reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
});

describe("LessonProgressRail", () => {
  it("shows earlier steps as a count, the current step, what's next, and the rest as a count", async () => {
    await store().load(LESSON_ID); // 1 of 5 done; next_nodes has one step
    render(<LessonProgressRail />);
    expect(steps()).toEqual([
      "1 step done (done)",
      "SYNTHETIC node 2Learn (current)",
      "SYNTHETIC node 3",
      "2 more steps",
    ]);
    expect(screen.getByText("SYNTHETIC node 2").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("progressbar", { name: "Steps completed" })).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByText("20%")).toBeInTheDocument();
  });
});

describe("a finished lesson", () => {
  it("opens on the report: steps, answers, and a way back", async () => {
    lessonFixture.setInstance(makeLessonInstance({ state: "completed", next_action: "completed", nodes_done: 5, active_node: null }));
    await store().load(LESSON_ID);
    expect(store().status).toBe("ready");
    render(<><LessonProgressRail /><BoardPanel /></>);
    expect(screen.getByRole("heading", { name: "You did it!" })).toBeInTheDocument();
    expect(screen.getByText("5/5")).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to chapters" })).toHaveAttribute("href", "/student");
    expect(screen.getByText("Lesson complete")).toBeInTheDocument();
    expect(screen.getByText("All steps done")).toBeInTheDocument();
  });
});

describe("revisiting skills after every planned step is done", () => {
  it("keeps the backend's 17 of 17 and 100%, and says revisit work is under way (rail, chapter card, header)", async () => {
    const { LessonHeader } = await import("../LessonHeader");
    const { LessonRail } = await import("../LessonRail");
    lessonFixture.setInstance(makeLessonInstance({
      state: "active",
      nodes_done: 17,
      nodes_total: 17,
      active_node: { ...makeLessonInstance().active_node!, reason: "revisit_remedial", title: "SYNTHETIC revisit" },
    }));
    await store().load(LESSON_ID);
    render(<><LessonRail /><LessonHeader subject={null} chapterTitle="SYNTHETIC chapter" exitHref="/student" /></>);
    // The counts are the canonical ones, unchanged.
    expect(screen.getByText("17 of 17 steps done")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Steps completed" })).toHaveAttribute("aria-valuenow", "17");
    expect(screen.getByText("17/17")).toBeInTheDocument();
    // Rail line, chapter card caption and header chip label.
    expect(screen.getAllByText("Revisiting skills")).toHaveLength(3);
    expect(screen.queryByText("Steps done")).not.toBeInTheDocument();
  });

  it("an ordinary step says nothing about revisiting", async () => {
    await store().load(LESSON_ID);
    render(<LessonProgressRail />);
    expect(screen.queryByText("Revisiting skills")).not.toBeInTheDocument();
  });
});
