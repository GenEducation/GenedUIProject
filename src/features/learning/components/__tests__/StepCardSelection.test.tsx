import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CHECK_ITEM, makeLessonInstance, syntheticPayload } from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";
import { StepCard } from "../StepCard";

/** A compliant (rule R) lesson lists every check of the step in the instance but its payload carries only the one the application selected next; that one must be drawn. */
const OTHER = "55555555-0000-4000-8000-0000000000ff";

describe("the check on the board", () => {
  beforeEach(() => localStorage.clear());

  it("is the check the payload carries, even when it is not the first unanswered check of the step", () => {
    const instance = makeLessonInstance({ next_action: "answer_checks" });
    instance.active_node = { ...instance.active_node!, type: "practice", check_item_ids: [OTHER, CHECK_ITEM], answered_item_ids: [] };
    const payload = syntheticPayload();
    payload.node.check_items = [{ id: CHECK_ITEM, role: "checkpoint", figure_groups: [], prompt: "SYNTHETIC the selected check", response_type: "numeric", options: [] }];
    useLessonStore.setState({ instance, payload });
    render(<StepCard subject="Mathematics" />);
    expect(screen.getByText("SYNTHETIC the selected check")).toBeInTheDocument();
  });
});
