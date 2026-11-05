import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CHECK_ITEM, LESSON_ID, lessonFixture, syntheticPayload } from "@/test/msw/handlers/lesson";
import { useLessonStore } from "../../useLessonStore";
import { StepCard } from "../StepCard";
import type { CheckItem } from "../../types";

/** The multiple-select, matching and sequencing renderers (W2 P1), through the card that hosts them. SYNTHETIC test data. */
const base: CheckItem = {
  id: CHECK_ITEM,
  prompt: "SYNTHETIC question",
  response_type: "mcq",
  role: "checkpoint",
  options: [
    { id: "o1", text: "SYNTHETIC alpha" },
    { id: "o2", text: "SYNTHETIC beta" },
    { id: "o3", text: "SYNTHETIC gamma" },
  ],
  figure_groups: [],
};

const answer = vi.fn(async () => null);

async function show(check: CheckItem) {
  lessonFixture.reset();
  useLessonStore.getState().reset();
  localStorage.clear();
  localStorage.setItem("gened_auth_token", "token-synthetic");
  lessonFixture.setHistory([{ turn_id: "t-old", kind: "opening", status: "completed", created_at: "x", figure_group_ids: [] }]);
  await useLessonStore.getState().load(LESSON_ID);
  const payload = syntheticPayload();
  payload.node.check_items = [check];
  answer.mockClear();
  useLessonStore.setState({ payload, answer });
  render(<StepCard />);
}

const submit = () => screen.getByRole("button", { name: /check answer/i });

describe("multiple select", () => {
  beforeEach(() => show({ ...base, selection: "multiple" }));

  it("is a group named by the question, with a real checkbox per option, and says several may be chosen", () => {
    const group = screen.getByRole("group", { name: /SYNTHETIC question/ });
    expect(within(group).getAllByRole("checkbox")).toHaveLength(3);
    expect(within(group).getByText("Choose all that apply.")).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it("is completed with the keyboard alone and sends every chosen option", async () => {
    const user = userEvent.setup();
    await user.tab(); // first checkbox
    await user.keyboard(" ");
    await user.tab();
    await user.tab();
    await user.keyboard(" ");
    expect(screen.getAllByRole("checkbox").filter((c) => (c as HTMLInputElement).checked)).toHaveLength(2);
    await user.click(submit());
    expect(answer).toHaveBeenCalledWith(base.id, { kind: "choice", option_ids: ["o1", "o3"] });
  });

  it("lets a choice be taken back", async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: /alpha/ }));
    await user.click(screen.getByRole("checkbox", { name: /alpha/ }));
    expect(submit()).toBeDisabled();
  });
});

describe("sequencing", () => {
  beforeEach(() => show({ ...base, response_type: "sequence" }));

  it("lists the entries in the order served, each with labelled move controls, the ends disabled", () => {
    const list = screen.getByRole("list", { name: /your order/i });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Move SYNTHETIC alpha up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move SYNTHETIC gamma down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move SYNTHETIC alpha down" })).toBeEnabled();
  });

  it("is ordered with the keyboard alone, announces where an entry went, and sends the order", async () => {
    const user = userEvent.setup();
    const down = screen.getByRole("button", { name: "Move SYNTHETIC alpha down" });
    down.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("SYNTHETIC alpha: place 2 of 3");
    const items = within(screen.getByRole("list", { name: /your order/i })).getAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual([
      expect.stringContaining("SYNTHETIC beta"),
      expect.stringContaining("SYNTHETIC alpha"),
      expect.stringContaining("SYNTHETIC gamma"),
    ]);
    submit().focus();
    await user.keyboard("{Enter}");
    expect(answer).toHaveBeenCalledWith(base.id, { kind: "ordered", items: ["SYNTHETIC beta", "SYNTHETIC alpha", "SYNTHETIC gamma"] });
  });
});

describe("matching", () => {
  beforeEach(() => show({ ...base, response_type: "matching", left_entries: ["SYNTHETIC left 1", "SYNTHETIC left 2", "SYNTHETIC left 3"] }));

  it("gives every left entry a labelled list and stays disabled until all are matched", async () => {
    const user = userEvent.setup();
    expect(screen.getAllByRole("combobox")).toHaveLength(3);
    await user.selectOptions(screen.getByRole("combobox", { name: "Match SYNTHETIC left 1" }), "SYNTHETIC beta");
    expect(submit()).toBeDisabled();
  });

  it("keeps the pairing one to one and sends every pair", async () => {
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole("combobox", { name: "Match SYNTHETIC left 1" }), "SYNTHETIC beta");
    const second = screen.getByRole("combobox", { name: "Match SYNTHETIC left 2" });
    expect(within(second).getByRole("option", { name: "SYNTHETIC beta" })).toBeDisabled();
    await user.selectOptions(second, "SYNTHETIC alpha");
    await user.selectOptions(screen.getByRole("combobox", { name: "Match SYNTHETIC left 3" }), "SYNTHETIC gamma");
    await user.click(submit());
    expect(answer).toHaveBeenCalledWith(base.id, {
      kind: "pairs",
      pairs: [
        { left: "SYNTHETIC left 1", right: "SYNTHETIC beta" },
        { left: "SYNTHETIC left 2", right: "SYNTHETIC alpha" },
        { left: "SYNTHETIC left 3", right: "SYNTHETIC gamma" },
      ],
    });
  });
});

describe("the existing formats are unchanged", () => {
  it("a single-choice check is still a radio group", async () => {
    await show(base);
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("a numeric check is still a typed box", async () => {
    await show({ ...base, response_type: "numeric", options: [] });
    expect(screen.getByLabelText("Your answer")).toBeInTheDocument();
  });
});
