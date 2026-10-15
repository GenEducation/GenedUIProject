import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import {
  FIGURE_GROUP, FIGURE_GROUP_2, LESSON_ID, NODE_2,
  lessonFixture, makeLessonInstance, replyScript, turnRequests,
} from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";
import { fakeImages } from "../../__tests__/fakeImages";
import { ChatPanel } from "../ChatPanel";
import { WhiteboardCanvas } from "../WhiteboardCanvas";

/**
 * What the learner sees while the lesson moves to its next step, and while a figure the tutor presents is on its way.
 * Pictures load through `fakeImages`: jsdom paints nothing, so these show the order of things on screen (words held,
 * figure placed, ink-in class applied), not the real paint or the ink-in's timing, which need a real browser.
 */
const store = () => useLessonStore.getState();
const box = () => screen.getByRole("textbox", { name: "Message your tutor" });

// jsdom lays nothing out; give the board a size so the camera can frame.
const sizes = { clientWidth: 1000, clientHeight: 700 };
const original = Object.fromEntries(Object.keys(sizes).map((k) => [k, Object.getOwnPropertyDescriptor(HTMLElement.prototype, k)]));

const nextNode = () =>
  makeLessonInstance({
    revision: 4,
    active_node: { ...makeLessonInstance().active_node!, instance_node_id: NODE_2, title: "SYNTHETIC node 3" },
  });

const presenting = (group: string, text: string) => () => [
  { type: "figure_presented" as const, figure_group_id: group },
  { type: "text_delta" as const, text },
  { type: "turn_completed" as const, status: "completed" as const, finish_reason: "stop" as const },
];

async function open() {
  await store().load(LESSON_ID);
  render(<><WhiteboardCanvas /><ChatPanel onShowFigure={vi.fn()} /></>);
}

beforeEach(() => {
  for (const [k, v] of Object.entries(sizes)) Object.defineProperty(HTMLElement.prototype, k, { configurable: true, get: () => v });
  fakeImages.install();
  lessonFixture.reset();
  store().reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  lessonFixture.setHistory([{
    turn_id: "t-old", kind: "opening", status: "completed", teacher_text: "SYNTHETIC what do you notice?",
    created_at: "2026-10-15T10:00:00Z", figure_group_ids: [],
  }]);
});
afterEach(() => {
  fakeImages.uninstall();
  for (const [k, d] of Object.entries(original)) if (d) Object.defineProperty(HTMLElement.prototype, k, d);
});

describe("moving to the next step, on screen", () => {
  it("draws a boundary naming the new step, and the box waits while the step gets ready", async () => {
    await open();
    const release = lessonFixture.holdNodeReads();
    lessonFixture.setInstance(nextNode());
    lessonFixture.setScript(replyScript("SYNTHETIC opening of node 3."));
    await store().done();
    await waitFor(() => expect(box()).toBeDisabled());
    expect(box()).toHaveAttribute("placeholder", "The lesson is getting ready…");
    release();
    expect(await screen.findByText("SYNTHETIC opening of node 3.")).toBeInTheDocument();
    const boundary = screen.getByRole("separator", { name: "Next step: SYNTHETIC node 3" });
    // The boundary sits between the old question and the new opening.
    expect(screen.getByText("SYNTHETIC what do you notice?").compareDocumentPosition(boundary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(boundary.compareDocumentPosition(screen.getByText("SYNTHETIC opening of node 3.")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await waitFor(() => expect(box()).not.toBeDisabled());
  });

  it("an opening that fails says so, and Try again asks for it again", async () => {
    await open();
    lessonFixture.setInstance(nextNode());
    lessonFixture.failNextTurns(1);
    await store().done();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Your tutor couldn't start this step.");
    lessonFixture.setScript(replyScript("SYNTHETIC opening, second ask."));
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("SYNTHETIC opening, second ask.")).toBeInTheDocument();
    expect(turnRequests.map((r) => r.kind)).toEqual(["opening", "opening"]);
    expect(screen.queryByText("Your tutor couldn't start this step.")).not.toBeInTheDocument();
  });

  it("a step whose payload cannot be read is said, not skipped over; Try again reads it and opens the step", async () => {
    await open();
    lessonFixture.setInstance(nextNode());
    lessonFixture.failNextPayloads(1);
    await store().done();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("This step couldn't load.");
    expect(turnRequests).toEqual([]); // the step is not opened over a board that cannot show it
    await waitFor(() => expect(box()).not.toBeDisabled()); // the learner can still talk meanwhile
    lessonFixture.setScript(replyScript("SYNTHETIC opening of node 3."));
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("SYNTHETIC opening of node 3.")).toBeInTheDocument();
    expect(store().payload?.node.title).toBe("SYNTHETIC node 3");
    expect(screen.queryByText("This step couldn't load.")).not.toBeInTheDocument();
    expect(turnRequests.map((r) => [r.kind, r.instance_node_id])).toEqual([["opening", NODE_2]]);
  });
});

describe("a figure and the words about it, on screen", () => {
  it("holds the words while the picture downloads; both appear when it is decoded, and it inks in then", async () => {
    fakeImages.hold("pic-1");
    await open();
    lessonFixture.setScript(presenting(FIGURE_GROUP, "SYNTHETIC look at this picture."));
    fireEvent.change(box(), { target: { value: "SYNTHETIC show me" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    await waitFor(() => expect(store().turns.at(-1)?.status).toBe("completed"));
    expect(screen.queryByText("SYNTHETIC look at this picture.")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Your tutor is typing" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "SYNTHETIC figure" })).not.toBeInTheDocument(); // not placed undecoded
    fakeImages.release("pic-1");
    expect(await screen.findByText("SYNTHETIC look at this picture.")).toBeInTheDocument();
    const picture = screen.getByRole("img", { name: "SYNTHETIC figure" });
    expect(picture.closest("li")).toHaveClass("lesson-writing");
  });

  it("a picture that cannot load: the words show beside a plain 'couldn't load' with a retry", async () => {
    fakeImages.fail("pic-1");
    await open();
    lessonFixture.setScript(presenting(FIGURE_GROUP, "SYNTHETIC look at this picture."));
    fireEvent.change(box(), { target: { value: "SYNTHETIC show me" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(await screen.findByText("SYNTHETIC look at this picture.")).toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("The diagram couldn't load.");
    expect(screen.getByText("This picture couldn't load.")).toBeInTheDocument(); // the board says it too
    fakeImages.fail();
    fireEvent.click(within(alert).getByRole("button", { name: "Load it again" }));
    await waitFor(() => expect(screen.queryByText("The diagram couldn't load.")).not.toBeInTheDocument());
    expect(screen.getByRole("img", { name: "SYNTHETIC figure" })).toBeInTheDocument();
  });

  it("the next step's opening presents its figure: its words wait for that figure", async () => {
    fakeImages.hold("pic-2");
    await open();
    lessonFixture.setInstance(nextNode());
    lessonFixture.setScript(presenting(FIGURE_GROUP_2, "SYNTHETIC node 3's picture."));
    await store().done();
    await waitFor(() => expect(store().turns.at(-1)).toMatchObject({ kind: "opening", status: "completed" }));
    expect(screen.queryByText("SYNTHETIC node 3's picture.")).not.toBeInTheDocument();
    fakeImages.release("pic-2");
    expect(await screen.findByText("SYNTHETIC node 3's picture.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "SYNTHETIC figure two" })).toBeInTheDocument();
  });

  it("a board picture whose URL expires again later gets a fresh refresh for the new URL", async () => {
    lessonFixture.setHistory([{ turn_id: "t1", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [FIGURE_GROUP] }]);
    await open();
    const reads = lessonFixture.manifestReads;
    lessonFixture.resign("hour-2");
    fireEvent.error(screen.getByRole("img", { name: "SYNTHETIC figure" }));
    await waitFor(() => expect(screen.getByRole("img", { name: "SYNTHETIC figure" })).toHaveAttribute("src", expect.stringContaining("hour-2")));
    lessonFixture.resign("hour-3"); // the next hour's expiry
    fireEvent.error(screen.getByRole("img", { name: "SYNTHETIC figure" }));
    await waitFor(() => expect(screen.getByRole("img", { name: "SYNTHETIC figure" })).toHaveAttribute("src", expect.stringContaining("hour-3")));
    expect(lessonFixture.manifestReads).toBe(reads + 2);
    // The same URL failing again is real: said plainly.
    fireEvent.error(screen.getByRole("img", { name: "SYNTHETIC figure" }));
    await waitFor(() => expect(lessonFixture.manifestReads).toBe(reads + 3));
    fireEvent.error(screen.getByRole("img", { name: "SYNTHETIC figure" }));
    expect(await screen.findByText("This picture couldn't load.")).toBeInTheDocument();
  });
});
