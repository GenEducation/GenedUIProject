import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import {
  FRESH_LESSON_ID, LESSON_ID, lessonFixture, makeLessonInstance, makeSection, reviewRequests,
} from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";
import { useLessonLaunch } from "@/features/student/learner/useLessonLaunch";
import { RevisitPrompt } from "../RevisitPrompt";
import { LessonSummary } from "../LessonSummary";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace }), usePathname: () => "/student/lesson/x" }));

const store = () => useLessonStore.getState();

const WEAK_AND_PASSED = [
  makeSection(1),
  makeSection(2, { status: "below_pass_mark", scored: 5, correct: 2, score: 0.4 }),
  makeSection(3),
  makeSection(4, { status: "not_attempted", scored: 0, correct: 0, score: null }),
];

beforeEach(() => {
  lessonFixture.reset();
  store().reset();
  replace.mockReset();
  useLessonLaunch.setState({ revisitOfferFor: null });
  localStorage.setItem("gened_auth_token", "token-synthetic");
  lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
});

/** The student opens the chapter from the home page or a chapter list: a visit, which may offer the choice once. */
async function comeBack(sections = WEAK_AND_PASSED, instance = makeLessonInstance(), visit = true) {
  lessonFixture.setInstance(instance);
  lessonFixture.setRevisitOptions({ sections });
  if (visit) useLessonLaunch.getState().offerRevisit(LESSON_ID);
  await store().load(LESSON_ID);
}

describe("RevisitPrompt — coming back to a chapter in progress", () => {
  it("offers the weak sections with their scores, and nothing else until asked", async () => {
    await comeBack();
    render(<RevisitPrompt />);
    const list = await screen.findByRole("list", { name: "Sections to revisit" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((r) => r.textContent)).toEqual([
      "Step 2 · SYNTHETIC section 240%",
      "Step 4 · SYNTHETIC section 4Not tried yet",
    ]);
    expect(screen.queryByRole("list", { name: "Other sections" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Pick another section/ }));
    const others = screen.getByRole("list", { name: "Other sections" });
    expect(within(others).getAllByRole("listitem").map((r) => r.textContent)).toEqual([
      "Step 1 · SYNTHETIC section 1100%",
      "Step 3 · SYNTHETIC section 3100%",
    ]);
  });

  it("replays the ticked sections in one request and does not offer again while they run", async () => {
    await comeBack();
    render(<RevisitPrompt />);
    const revisit = await screen.findByRole("button", { name: /Revisit selected/ });
    expect(revisit).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /SYNTHETIC section 4/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /SYNTHETIC section 2/ }));
    fireEvent.click(screen.getByRole("button", { name: "Revisit selected (2)" }));
    await waitFor(() => expect(store().instance?.active_node?.reason).toBe("revisit_review"));
    expect(reviewRequests).toHaveLength(1);
    expect(reviewRequests[0].section_ids).toEqual([WEAK_AND_PASSED[3].instance_node_id, WEAK_AND_PASSED[1].instance_node_id]);
    expect(reviewRequests[0].expected_revision).toBe(makeLessonInstance().revision);
    await waitFor(() => expect(store().revisitOptions?.review_in_progress).toBe(true));
    expect(store().revisitPromptOpen).toBe(false);
  });

  it("carrying on closes it, and says where the learner carries on from", async () => {
    await comeBack();
    render(<RevisitPrompt />);
    const carryOn = await screen.findByRole("button", { name: /Continue from step 5/ });
    fireEvent.click(carryOn);
    expect(store().revisitPromptOpen).toBe(false);
    expect(reviewRequests).toEqual([]);
  });

  it("stays open on Escape and on a click outside it: only Continue closes it", async () => {
    await comeBack();
    render(<RevisitPrompt />);
    const dialog = await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(dialog.parentElement!.previousElementSibling!);
    expect(store().revisitPromptOpen).toBe(true);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("starting over asks first, then opens the new session", async () => {
    await comeBack();
    render(<RevisitPrompt />);
    fireEvent.click(await screen.findByRole("button", { name: "Start from the beginning" }));
    expect(reviewRequests).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Yes, start over" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith(`/student/lesson/${FRESH_LESSON_ID}`));
    expect(reviewRequests[0].start_over).toBe(true);
  });

  it("is not offered when nothing is weak, or while a review is under way", async () => {
    await comeBack([makeSection(1), makeSection(2)]);
    await waitFor(() => expect(store().revisitOptions).not.toBeNull());
    expect(store().revisitPromptOpen).toBe(false);

    store().reset();
    await comeBack([makeSection(1, { status: "below_pass_mark", score: 0.2, in_review: true })]);
    await waitFor(() => expect(store().revisitOptions).not.toBeNull());
    expect(store().revisitPromptOpen).toBe(false);
  });
});

describe("RevisitPrompt — what a passed section says", () => {
  const skill = (title: string, level: "got_it" | "getting_there" | "strong") => ({ component_id: title, title, level, p_known: 0.8 });

  it("says the learner's mastery of its skills when the backend sends it, and the score or Done when it does not", async () => {
    await comeBack([
      makeSection(1, { type: "teach", scored: 0, correct: 0, score: null, mastery: { level: "got_it", skills: [skill("Place value", "got_it")] } }),
      makeSection(2, { status: "below_pass_mark", correct: 1, score: 0.2, mastery: { level: "getting_there", skills: [skill("Place value", "getting_there")] } }),
      makeSection(3, { mastery: { level: "getting_there", skills: [skill("Digit sums", "getting_there"), skill("Place value", "strong")] } }),
      makeSection(4, { type: "teach", scored: 0, correct: 0, score: null, mastery: { level: "not_started", skills: [] } }),
      makeSection(5, { correct: 4, scored: 5, score: 0.8, mastery: null }),
    ]);
    render(<RevisitPrompt />);
    // A weak section keeps its score: it is why the section is offered.
    const weak = await screen.findByRole("list", { name: "Sections to revisit" });
    expect(within(weak).getByRole("listitem").textContent).toBe("Step 2 · SYNTHETIC section 220%");
    fireEvent.click(screen.getByRole("button", { name: /Pick another section/ }));
    const others = screen.getByRole("list", { name: "Other sections" });
    expect(within(others).getAllByRole("listitem").map((r) => r.textContent)).toEqual([
      "Step 1 · SYNTHETIC section 1Got it",
      "Step 3 · SYNTHETIC section 3Getting there",
      "Step 4 · SYNTHETIC section 4Done",
      "Step 5 · SYNTHETIC section 580%",
    ]);
    expect(within(others).getByText("Getting there").closest("[title]")?.getAttribute("title")).toBe(
      "Digit sums: Getting there\nPlace value: Strong\n2 of 2 right on the first try",
    );
  });
});

describe("RevisitPrompt — only on a visit", () => {
  it("is not offered when the lesson loads without the chapter being opened (a reload, a remount)", async () => {
    await comeBack(WEAK_AND_PASSED, makeLessonInstance(), false);
    await waitFor(() => expect(store().revisitOptions).not.toBeNull());
    expect(store().revisitPromptOpen).toBe(false);
  });

  it("is offered once per visit: loading the lesson again does not bring it back", async () => {
    await comeBack();
    await waitFor(() => expect(store().revisitPromptOpen).toBe(true));
    store().closeRevisitPrompt();
    await store().load(LESSON_ID);
    await waitFor(() => expect(store().revisitOptions).not.toBeNull());
    expect(store().revisitPromptOpen).toBe(false);
  });
});

describe("RevisitPrompt — after a review", () => {
  it("comes back when the chosen sections are done and others are still weak", async () => {
    const reviewing = makeLessonInstance({
      active_node: { ...makeLessonInstance().active_node!, instance_node_id: "99999999-0000-4000-8000-000000000001", reason: "revisit_review" },
    });
    await comeBack([makeSection(1, { status: "below_pass_mark", score: 0.2, in_review: true }), makeSection(2, { status: "below_pass_mark", score: 0.5 })], reviewing);
    await waitFor(() => expect(store().revisitOptions).not.toBeNull());
    expect(store().revisitPromptOpen).toBe(false);

    // The review is done (section 1 passed this time); the lesson is back on its own next step.
    lessonFixture.setRevisitOptions({ sections: [makeSection(1), makeSection(2, { status: "below_pass_mark", score: 0.5 })] });
    const back = makeLessonInstance({ revision: 9 });
    lessonFixture.setScript(() => [
      { type: "state_changed", instance: back },
      { type: "turn_completed", status: "completed", finish_reason: "stop" },
    ]);
    await store().send("SYNTHETIC answer");
    await waitFor(() => expect(store().revisitPromptOpen).toBe(true));
    expect(store().revisitOptions?.weak.map((s) => s.step)).toEqual([2]);
  });
});

describe("LessonSummary — a finished chapter is not a dead end", () => {
  it("shows the weak sections to go over again, and the way out", async () => {
    await comeBack(WEAK_AND_PASSED, makeLessonInstance({ state: "completed", next_action: "completed", active_node: null }));
    render(<LessonSummary />);
    await screen.findByRole("list", { name: "Sections to revisit" });
    expect(store().revisitPromptOpen).toBe(false);
    expect(screen.getByRole("link", { name: "Back to chapters" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue from step/ })).toBeNull();
  });
});
