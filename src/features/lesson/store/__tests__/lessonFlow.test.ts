import { describe, expect, it } from "vitest";
import { deriveStep, endsWithQuestion } from "../lessonFlow";
import type { ActiveNode, CheckItem, InstanceState, TeacherPayload } from "../../types/lesson";

const probe = (id: string): CheckItem => ({
  id,
  prompt: `Question ${id}`,
  response_type: "numeric",
  role: "formative_probe",
  options: [],
  figure_groups: [],
});

function state(node: Partial<ActiveNode>, checks: CheckItem[]): [InstanceState, TeacherPayload] {
  const activeNode: ActiveNode = {
    instance_node_id: "in-1",
    node_id: "n-1",
    title: "Equal shares",
    type: "teach",
    reason: "canonical",
    engagement_count: 0,
    engagement_required: 2,
    check_item_ids: checks.map((c) => c.id),
    answered_item_ids: [],
    round_id: null,
    round_ordinal: null,
    ...node,
  };
  const instance: InstanceState = {
    id: "i",
    chapter_id: "c",
    plan_version_id: "p",
    revision: 1,
    state: "active",
    nodes_done: 0,
    nodes_total: 3,
    next_action: activeNode.type === "teach" ? "learn" : "answer_checks",
    active_node: activeNode,
    blocked: null,
  };
  const payload: TeacherPayload = {
    node: {
      id: "n-1",
      title: "Equal shares",
      type: activeNode.type,
      teach_only: checks.length === 0,
      sections: [],
      figure_groups: [],
      reference_groups: [],
      tools: [],
      check_items: checks,
      bloom: "understand",
      est_minutes: 5,
    },
  };
  return [instance, payload];
}

describe("deriveStep: exactly one next action, from server state", () => {
  it("waits while the tutor is speaking, whatever else is pending", () => {
    const [i, p] = state({ engagement_count: 0 }, [probe("a")]);
    expect(deriveStep(i, p, true)).toEqual({ kind: "tutor_speaking" });
  });

  it("asks the learner to reply until engagement reaches what the node requires", () => {
    const [i, p] = state({ engagement_count: 1, engagement_required: 2 }, [probe("a")]);
    expect(deriveStep(i, p, false)).toMatchObject({ kind: "reply", repliesDone: 1, repliesNeeded: 2, canMoveOn: false });
  });

  it("then raises the first unanswered probe of a teach node, one at a time", () => {
    const [i, p] = state({ engagement_count: 2, answered_item_ids: ["a"] }, [probe("a"), probe("b")]);
    expect(deriveStep(i, p, false)).toMatchObject({ kind: "check", check: { id: "b" }, ordinal: 2, total: 2 });
  });

  it("offers the next part once a teach node's engagement and probes are both done (mark_done's preconditions)", () => {
    const [i, p] = state({ engagement_count: 2, answered_item_ids: ["a"] }, [probe("a")]);
    expect(deriveStep(i, p, false)).toEqual({ kind: "continue", isLastPart: false });
  });

  it("offers the next part on a teach-only node as soon as engagement is met", () => {
    const [i, p] = state({ engagement_count: 2 }, []);
    expect(deriveStep(i, p, false)).toEqual({ kind: "continue", isLastPart: false });
  });

  it("goes straight to the question on a practice node, with no engagement gate", () => {
    const [i, p] = state({ type: "practice", engagement_count: 0 }, [probe("a")]);
    expect(deriveStep(i, p, false)).toMatchObject({ kind: "check", check: { id: "a" } });
  });

  it("never offers 'next part' on a practice node: it closes itself when its round is scored", () => {
    const [i, p] = state({ type: "practice", answered_item_ids: ["a"] }, [probe("a")]);
    expect(deriveStep(i, p, false)).toEqual({ kind: "waiting" });
  });

  it("keeps answering the tutor as the main action while its last message is a question", () => {
    const [i, p] = state({ engagement_count: 2 }, []);
    const last = { status: "completed" as const, teacherText: "What do you get when you multiply 9 by 7?" };
    expect(deriveStep(i, p, false, last)).toMatchObject({ kind: "reply", canMoveOn: true });
  });

  it("offers the next part once the tutor's last message is not a question", () => {
    const [i, p] = state({ engagement_count: 2 }, []);
    const last = { status: "completed" as const, teacherText: "That is a perfect way to put it." };
    expect(deriveStep(i, p, false, last)).toEqual({ kind: "continue", isLastPart: false });
  });

  it("puts a failed reply first: retry, never 'next part' beside it", () => {
    const [i, p] = state({ engagement_count: 2 }, []);
    const last = { status: "failed" as const, retryable: true, teacherText: "" };
    expect(deriveStep(i, p, false, last)).toEqual({ kind: "retry" });
  });

  it("calls the last part's action 'finish', not 'next part'", () => {
    const [i, p] = state({ engagement_count: 2 }, []);
    expect(deriveStep({ ...i, nodes_done: 2, nodes_total: 3 }, p, false)).toEqual({ kind: "continue", isLastPart: true });
  });

  it("reads a question at the end of a message, including after a closing quote", () => {
    expect(endsWithQuestion("How many halves are there?")).toBe(true);
    expect(endsWithQuestion('Is it "one half?"')).toBe(true);
    expect(endsWithQuestion("Is it bigger? Each piece is smaller.")).toBe(false);
  });
});
