import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import { LESSON_ID, NODE_2, lessonFixture, makeLessonInstance } from "@/test/msw/handlers/lesson";
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

  it("a step finished on this screen keeps its title", async () => {
    await store().load(LESSON_ID);
    render(<LessonProgressRail />);
    lessonFixture.setScript(() => [
      { type: "state_changed", instance: makeLessonInstance({ nodes_done: 2, revision: 5, active_node: { ...makeLessonInstance().active_node!, instance_node_id: NODE_2, title: "SYNTHETIC node 3" } }) },
      { type: "turn_completed", status: "completed", finish_reason: "stop" },
    ]);
    await store().send("SYNTHETIC done talking");
    expect(store().completedSteps).toEqual([{ instanceNodeId: makeLessonInstance().active_node!.instance_node_id, title: "SYNTHETIC node 2" }]);
    await waitFor(() => expect(steps().slice(0, 3)).toEqual(["1 step done (done)", "SYNTHETIC node 2 (done)", "SYNTHETIC node 3Learn (current)"]));
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

  it("finishing during the lesson reads the report", async () => {
    await store().load(LESSON_ID);
    lessonFixture.setScript(() => [
      { type: "state_changed", instance: makeLessonInstance({ state: "completed", next_action: "completed", nodes_done: 5, active_node: null }) },
      { type: "turn_completed", status: "completed", finish_reason: "stop" },
    ]);
    await store().send("SYNTHETIC last answer");
    await waitFor(() => expect(store().report?.nodes_done).toBe(5));
  });
});
