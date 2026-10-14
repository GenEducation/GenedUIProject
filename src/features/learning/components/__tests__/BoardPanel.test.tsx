import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import {
  CHECK_ITEM, FIGURE_GROUP, LESSON_ID, OPTION_A,
  answerRequests, forbiddenRequests, lessonFixture, makeLessonInstance, stepRequests, syntheticPayload, turnRequests,
} from "@/test/msw/handlers/lesson";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { useLessonStore } from "../../useLessonStore";
import type { CheckItem } from "../../types";

import { BoardPanel } from "../BoardPanel";
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:0/test-api";
const node = makeLessonInstance().active_node!;
const store = () => useLessonStore.getState();

async function open(instance = makeLessonInstance()) {
  lessonFixture.setInstance(instance);
  await store().load(LESSON_ID);
  return render(<BoardPanel />);
}

beforeEach(() => {
  lessonFixture.reset();
  store().reset();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", teacher_text: "SYNTHETIC look at this.", created_at: "x", figure_group_ids: [FIGURE_GROUP] }]);
});

describe("BoardPanel — figures", () => {
  it("shows the focused figure described by its learner caption, without repeating the chat", async () => {
    await open();
    const img = screen.getByRole("img", { name: "SYNTHETIC figure" });
    expect(img.getAttribute("src")).toMatch(/\/v1\/visual-images\/pic-1\?exp=1&sig=synthetic$/);
    // The visual carries its own drawn title; the learner caption is its description, not repeated beneath it.
    expect(document.querySelector("figcaption")).toBeNull();
    // The tutor's words live in the chat; the board doesn't repeat them.
    expect(screen.queryByText("SYNTHETIC look at this.")).toBeNull();
    expect(screen.getByText("Learn")).toBeInTheDocument();
  });

  it("an expired picture refreshes the manifest once, then says it couldn't load", async () => {
    await open();
    const reads = lessonFixture.manifestReads;
    fireEvent.error(screen.getByRole("img", { name: "SYNTHETIC figure" }));
    await waitFor(() => expect(lessonFixture.manifestReads).toBe(reads + 1));
    fireEvent.error(await screen.findByRole("img", { name: "SYNTHETIC figure" }));
    expect(await screen.findByText("This picture couldn't load.")).toBeInTheDocument();
  });
});

describe("BoardPanel — the step card", () => {
  it("answers a multiple-choice check, shows the result, and the tutor reacts", async () => {
    await open();
    const card = screen.getByRole("form", { name: "SYNTHETIC check?" });
    const submit = within(card).getByRole("button", { name: "Check answer" });
    expect(submit).toBeDisabled();
    fireEvent.click(within(card).getByRole("radio", { name: "SYNTHETIC A" }));
    fireEvent.click(submit);
    expect(await screen.findByText("That's right!")).toBeInTheDocument();
    expect(answerRequests[0]).toMatchObject({ item_id: CHECK_ITEM, channel: "choice", response: { kind: "choice", option_ids: [OPTION_A] } });
    await waitFor(() => expect(turnRequests.at(-1)?.kind).toBe("result_reaction"));
  });

  it("Hint is only a hint turn: the server records it, and /hints is never called", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Hint" }));
    await waitFor(() => expect(turnRequests.at(-1)).toMatchObject({ kind: "hint", item_id: CHECK_ITEM }));
    expect(forbiddenRequests).toEqual([]);
    expect(stepRequests).toEqual([]);
  });

  it("a teach step with every check answered and enough talk offers Next step", async () => {
    await open(makeLessonInstance({ active_node: { ...node, answered_item_ids: [CHECK_ITEM], engagement_count: 1 } }));
    fireEvent.click(screen.getByRole("button", { name: /Next step/ }));
    await waitFor(() => expect(stepRequests).toEqual([{ route: "done", body: expect.objectContaining({ expected_revision: 4 }) }]));
    await waitFor(() => expect(store().instance?.nodes_done).toBe(2));
  });

  it("after a failed round, offers the choice with the recommended one first", async () => {
    await open(makeLessonInstance({
      next_action: "choose",
      active_node: { ...node, type: "practice", choice: { options: ["try_now", "keep_going"], recommended: "keep_going" } },
    }));
    fireEvent.click(screen.getByRole("button", { name: "Try a new question" }));
    await waitFor(() => expect(stepRequests[0]).toMatchObject({ route: "choice", body: { choice: "try_now" } }));
  });

  it("confirms a reading: yes resubmits the suggestion as confirmed", async () => {
    await open(makeLessonInstance({
      next_action: "confirm_reading",
      active_node: { ...node, pending_reading: { item_id: CHECK_ITEM, original: "SYNTHETIC tpyo", suggestion: "SYNTHETIC typo" } },
    }));
    expect(screen.getByText(/You wrote “SYNTHETIC tpyo”/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes, SYNTHETIC typo" }));
    await waitFor(() => expect(answerRequests[0]).toMatchObject({ confirmed_reading: true, response: { kind: "text", text: "SYNTHETIC typo" } }));
  });
});

describe("the answer box's calculator", () => {
  const withCheck = (response_type: CheckItem["response_type"]) => {
    const base = syntheticPayload();
    server.use(
      http.get(`${BASE}/v1/instances/:instanceId/teacher-payload`, () =>
        HttpResponse.json({
          ...base,
          node: { ...base.node, check_items: [{ ...base.node.check_items[0], response_type, options: [] }] },
        }),
      ),
    );
  };
  const answerBox = () => screen.getByRole("textbox", { name: "Your answer" }) as HTMLInputElement;

  it("works out a root as they type, and sends the number for a number answer", async () => {
    withCheck("numeric");
    await open();
    fireEvent.change(answerBox(), { target: { value: "√144" } });
    expect(screen.getByText("= 12")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await waitFor(() => expect(answerRequests[0]).toMatchObject({ response: { kind: "numeric", value: "12" } }));
  });
});
