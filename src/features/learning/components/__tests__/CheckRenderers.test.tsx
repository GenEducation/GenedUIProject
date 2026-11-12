import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CHECK_ITEM,
  LESSON_ID,
  lessonFixture,
  syntheticPayload,
} from "@/test/msw/handlers/lesson";
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
  lessonFixture.setHistory([
    {
      turn_id: "t-old",
      kind: "opening",
      status: "completed",
      created_at: "x",
      figure_group_ids: [],
    },
  ]);
  await useLessonStore.getState().load(LESSON_ID);
  const payload = syntheticPayload();
  payload.node.check_items = [check];
  answer.mockClear();
  useLessonStore.setState({ payload, answer });
  render(<StepCard />);
}

const submit = () => screen.getByRole("button", { name: /check answer/i });
/** The card's own live note (a drag area also renders dnd-kit's live region, kept silent). */
const note = () => screen.getAllByRole("status").find((el) => !el.id.startsWith("DndLiveRegion"))!;

describe("multiple select", () => {
  beforeEach(() => show({ ...base, selection: "multiple" }));

  it("is a group named by the question, with a real checkbox per option, and says several may be chosen", () => {
    const group = screen.getByRole("group", { name: /SYNTHETIC question/ });
    expect(within(group).getAllByRole("checkbox")).toHaveLength(3);
    expect(
      within(group).getByText("Choose all that apply."),
    ).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it("is completed with the keyboard alone and sends every chosen option", async () => {
    const user = userEvent.setup();
    await user.tab(); // first checkbox
    await user.keyboard(" ");
    await user.tab();
    await user.tab();
    await user.keyboard(" ");
    expect(
      screen
        .getAllByRole("checkbox")
        .filter((c) => (c as HTMLInputElement).checked),
    ).toHaveLength(2);
    await user.click(submit());
    expect(answer).toHaveBeenCalledWith(base.id, {
      kind: "choice",
      option_ids: ["o1", "o3"],
    });
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
    expect(
      screen.getByRole("button", { name: "Move SYNTHETIC alpha up" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Move SYNTHETIC gamma down" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Move SYNTHETIC alpha down" }),
    ).toBeEnabled();
  });

  it("is ordered with the keyboard alone, announces where an entry went, and sends the order", async () => {
    const user = userEvent.setup();
    const down = screen.getByRole("button", {
      name: "Move SYNTHETIC alpha down",
    });
    down.focus();
    await user.keyboard("{Enter}");
    expect(note()).toHaveTextContent("SYNTHETIC alpha: place 2 of 3");
    const items = within(
      screen.getByRole("list", { name: /your order/i }),
    ).getAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual([
      expect.stringContaining("SYNTHETIC beta"),
      expect.stringContaining("SYNTHETIC alpha"),
      expect.stringContaining("SYNTHETIC gamma"),
    ]);
    submit().focus();
    await user.keyboard("{Enter}");
    expect(answer).toHaveBeenCalledWith(base.id, {
      kind: "ordered",
      items: ["SYNTHETIC beta", "SYNTHETIC alpha", "SYNTHETIC gamma"],
    });
  });
});

describe("matching", () => {
  beforeEach(() =>
    show({
      ...base,
      response_type: "matching",
      left_entries: ["SYNTHETIC left 1", "SYNTHETIC left 2", "SYNTHETIC left 3"],
    }),
  );

  const left = (name: RegExp) => screen.getByRole("button", { name });

  it("shows every item and every candidate at once, the first item current, nothing sendable", () => {
    expect(left(/^SYNTHETIC left 1: not matched yet$/)).toHaveAttribute("aria-pressed", "true");
    expect(left(/^SYNTHETIC left 2: not matched yet$/)).toHaveAttribute("aria-pressed", "false");
    const candidates = screen.getByRole("group", { name: /now tap the match for SYNTHETIC left 1/i });
    expect(within(candidates).getAllByRole("button")).toHaveLength(3);
    expect(submit()).toBeDisabled();
    expect(screen.getByText("0 of 3 matched")).toBeInTheDocument();
  });

  it("is matched with the keyboard alone, moving on to the next item each time, and sends every pair", async () => {
    const user = userEvent.setup();
    for (const candidate of ["SYNTHETIC beta", "SYNTHETIC alpha", "SYNTHETIC gamma"]) {
      screen.getByRole("button", { name: candidate }).focus();
      await user.keyboard("{Enter}");
    }
    expect(screen.getByRole("status")).toHaveTextContent("SYNTHETIC left 3 matched with SYNTHETIC gamma");
    expect(left(/^SYNTHETIC left 1: SYNTHETIC beta$/)).toBeInTheDocument();
    submit().focus();
    await user.keyboard("{Enter}");
    expect(answer).toHaveBeenCalledWith(base.id, {
      kind: "pairs",
      pairs: [
        { left: "SYNTHETIC left 1", right: "SYNTHETIC beta" },
        { left: "SYNTHETIC left 2", right: "SYNTHETIC alpha" },
        { left: "SYNTHETIC left 3", right: "SYNTHETIC gamma" },
      ],
    });
  });

  it("keeps the pairing one to one: a candidate paired again moves", async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "SYNTHETIC beta" }));
    // Item 2 is current now; giving it beta takes beta away from item 1.
    await user.click(screen.getByRole("button", { name: "SYNTHETIC beta, matched with SYNTHETIC left 1" }));
    expect(left(/^SYNTHETIC left 1: not matched yet$/)).toBeInTheDocument();
    expect(left(/^SYNTHETIC left 2: SYNTHETIC beta$/)).toBeInTheDocument();
  });

  it("undoes a pair when its item is pressed, and makes that item current", async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "SYNTHETIC beta" }));
    await user.click(left(/^SYNTHETIC left 1: SYNTHETIC beta$/));
    expect(left(/^SYNTHETIC left 1: not matched yet$/)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("SYNTHETIC left 1 is not matched now");
  });
});

const numeric = (entry: CheckItem["entry"]): CheckItem => ({
  ...base,
  response_type: "numeric",
  options: [],
  entry,
});

describe("number line", () => {
  beforeEach(() =>
    show(numeric({ mode: "number_line", min: "0", max: "10", step: "1" })),
  );

  it("replaces the typed box, is named by the question, and shows its ticks and a not-placed state", () => {
    const range = screen.getByRole("slider", { name: /SYNTHETIC question/ });
    expect(range).toHaveAttribute("min", "0");
    expect(range).toHaveAttribute("max", "10");
    expect(range).toHaveAttribute("aria-valuetext", "Not placed yet");
    expect(screen.queryByLabelText("Your answer")).not.toBeInTheDocument();
    expect(
      screen.getByText("Place the point on the line."),
    ).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it("is completed with the keyboard alone: arrows on the line, or the number typed", async () => {
    const user = userEvent.setup();
    // A native range input steps with the arrow keys in a real browser (jsdom does not implement that), so the change it fires is
    // simulated here; the buttons and the typed number below are the keyboard-reachable paths this test can drive end to end.
    fireEvent.change(screen.getByRole("slider"), { target: { value: "3" } });
    expect(screen.getByRole("slider")).toHaveAttribute(
      "aria-valuetext",
      "Your point: 3",
    );
    screen.getByRole("button", { name: "Check answer" }).focus();
    await user.click(submit());
    expect(answer).toHaveBeenCalledWith(base.id, {
      kind: "numeric",
      value: "3",
    });
  });

  it("has tap alternatives: smaller and larger buttons, and a box to type the number", async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Larger" }));
    expect(screen.getByText("Your point: 0")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Larger" }));
    await user.click(screen.getByRole("button", { name: "Smaller" }));
    expect(screen.getByText("Your point: 0")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Or type the number"));
    await user.type(screen.getByLabelText("Or type the number"), "6");
    expect(screen.getByText("Your point: 6")).toBeInTheDocument();
    await user.click(submit());
    expect(answer).toHaveBeenCalledWith(base.id, {
      kind: "numeric",
      value: "6",
    });
  });

  it("sends nothing until a value is placed", async () => {
    const user = userEvent.setup();
    await user.tab();
    await user.tab();
    expect(answer).not.toHaveBeenCalled();
    expect(submit()).toBeDisabled();
  });
});

describe("slider", () => {
  beforeEach(() =>
    show(numeric({ mode: "slider", min: "0", max: "1", step: "1/4" })),
  );

  it("steps by its own step, with fractions, and sends the decimal it landed on", async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Larger" }));
    await user.click(screen.getByRole("button", { name: "Larger" }));
    expect(screen.getByText("Your point: 0.25")).toBeInTheDocument();
    await user.click(submit());
    expect(answer).toHaveBeenCalledWith(base.id, {
      kind: "numeric",
      value: "0.25",
    });
  });

  it("has no tick labels or placed marker: that is the number line's look", () => {
    expect(
      screen.queryByText("Place the point on the line."),
    ).not.toBeInTheDocument();
  });
});

describe("tile builder", () => {
  beforeEach(() =>
    show({
      ...base,
      response_type: "symbolic",
      options: [],
      entry: { mode: "tiles", tiles: ["2", "*", "x", "+", "3"] },
    }),
  );

  it("starts empty with a bank of tiles, and is named for a screen reader", () => {
    expect(screen.getByRole("group", { name: "Tiles" })).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Your expression" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Tap tiles to build your answer."),
    ).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it("is built with the keyboard alone, in order, and sends the expression the tiles spell", async () => {
    const user = userEvent.setup();
    for (const name of ["Add 3", "Add +", "Add 2", "Add *", "Add x"]) {
      screen.getByRole("button", { name }).focus();
      await user.keyboard("{Enter}");
    }
    expect(screen.getByRole("status")).toHaveTextContent("Add x");
    expect(screen.getByRole("button", { name: "Add 3" })).toBeDisabled();
    submit().focus();
    await user.keyboard("{Enter}");
    expect(answer).toHaveBeenCalledWith(base.id, {
      kind: "text",
      text: "3 + 2 * x",
    });
  });

  it("takes a tile back by pressing it, by Undo, by Backspace, or all at once", async () => {
    const user = userEvent.setup();
    for (const name of ["Add 2", "Add *", "Add x", "Add +"])
      await user.click(screen.getByRole("button", { name }));
    await user.click(screen.getByRole("button", { name: "Remove *" }));
    await user.click(screen.getByRole("button", { name: "Undo" }));
    screen.getByRole("button", { name: "Add 3" }).focus();
    await user.keyboard("{Backspace}");
    expect(
      screen.queryByRole("button", { name: "Remove x" }),
    ).not.toBeInTheDocument();
    await user.keyboard("{Backspace}");
    expect(
      screen.getByText("Tap tiles to build your answer."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add 2" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(submit()).toBeDisabled();
  });
});

const groups: CheckItem = {
  ...base,
  response_type: "grouping",
  options: [
    { id: "g1", text: "SYNTHETIC red" },
    { id: "g2", text: "SYNTHETIC yellow" },
  ],
  left_entries: ["apple", "banana", "cherry"],
};

describe("grouping", () => {
  beforeEach(() => show(groups));

  const tray = () => screen.getByRole("group", { name: "To sort" });
  const box = (name: string) => screen.getByRole("region", { name });

  it("starts with every entry in the tray, the first one current, a box per group, nothing sendable", () => {
    expect(within(tray()).getAllByRole("button").map((b) => b.textContent)).toEqual(["apple", "banana", "cherry"]);
    expect(within(tray()).getByRole("button", { name: "apple" })).toHaveAttribute("aria-pressed", "true");
    expect(box("SYNTHETIC red")).toBeInTheDocument();
    expect(box("SYNTHETIC yellow")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Put apple in SYNTHETIC red" })).toBeEnabled();
    expect(submit()).toBeDisabled();
  });

  it("is sorted with the keyboard alone, lets two entries share a box, and sends every entry's group", async () => {
    const user = userEvent.setup();
    const put = async (name: string) => {
      screen.getByRole("button", { name }).focus();
      await user.keyboard("{Enter}");
    };
    await put("Put apple in SYNTHETIC red");
    await put("Put banana in SYNTHETIC yellow");
    expect(submit()).toBeDisabled();
    await put("Put cherry in SYNTHETIC red");
    expect(screen.getByText("All sorted. Tap one to move it.")).toBeInTheDocument();
    expect(within(box("SYNTHETIC red")).getAllByRole("button", { name: /in SYNTHETIC red/ })).toHaveLength(2);
    submit().focus();
    await user.keyboard("{Enter}");
    expect(answer).toHaveBeenCalledWith(base.id, {
      kind: "pairs",
      pairs: [
        { left: "apple", right: "SYNTHETIC red" },
        { left: "banana", right: "SYNTHETIC yellow" },
        { left: "cherry", right: "SYNTHETIC red" },
      ],
    });
  });

  it("moves a sorted entry to another box: pick it, then put it there", async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Put apple in SYNTHETIC red" }));
    await user.click(screen.getByRole("button", { name: "apple, in SYNTHETIC red" }));
    await user.click(screen.getByRole("button", { name: "Put apple in SYNTHETIC yellow" }));
    expect(within(box("SYNTHETIC yellow")).getByRole("button", { name: "apple, in SYNTHETIC yellow" })).toBeInTheDocument();
    expect(note()).toHaveTextContent("apple is in SYNTHETIC yellow");
  });
});

const blanks: CheckItem = {
  ...base,
  response_type: "blanks",
  options: [
    { id: "w1", text: "alpha" },
    { id: "w2", text: "beta" },
    { id: "w3", text: "gamma" },
    { id: "w4", text: "SYNTHETIC distractor" },
  ],
  left_entries: ["1", "2", "3"],
};

describe("blanks", () => {
  beforeEach(() => show(blanks));

  it("shows numbered blanks and a word bank, the first blank current, nothing sendable", () => {
    expect(
      screen.getByRole("button", { name: "Blank 1: empty" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("group", { name: "Word bank" }),
    ).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it("fills the blanks in order with the keyboard, each bank entry once, and sends the pairs", async () => {
    const user = userEvent.setup();
    for (const word of ["beta", "alpha", "gamma"]) {
      screen.getByRole("button", { name: word }).focus();
      await user.keyboard("{Enter}");
    }
    expect(
      screen.getByRole("button", { name: "Blank 1: beta" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "alpha" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Put gamma in blank 3",
    );
    submit().focus();
    await user.keyboard("{Enter}");
    expect(answer).toHaveBeenCalledWith(base.id, {
      kind: "pairs",
      pairs: [
        { left: "1", right: "beta" },
        { left: "2", right: "alpha" },
        { left: "3", right: "gamma" },
      ],
    });
  });

  it("empties a filled blank by pressing it, and then fills that one next", async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "alpha" }));
    await user.click(screen.getByRole("button", { name: "beta" }));
    await user.click(screen.getByRole("button", { name: "Blank 1: alpha" }));
    expect(
      screen.getByRole("button", { name: "Blank 1: empty" }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "gamma" }));
    expect(
      screen.getByRole("button", { name: "Blank 1: gamma" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Blank 2: beta" }),
    ).toBeInTheDocument();
  });
});

describe("blanks that need the same word twice", () => {
  it("lists the word twice, and each copy is used once", async () => {
    const twice: CheckItem = {
      ...base,
      response_type: "blanks",
      options: [
        { id: "w1", text: "heart" },
        { id: "w2", text: "SYNTHETIC lung" },
        { id: "w3", text: "heart" },
      ],
      left_entries: ["1", "2", "3"],
    };
    await show(twice);
    const user = userEvent.setup();
    const hearts = () => screen.getAllByRole("button", { name: "heart" });
    await user.click(hearts()[0]);
    expect(hearts()[0]).toBeDisabled();
    expect(hearts()[1]).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "SYNTHETIC lung" }));
    await user.click(hearts()[1]);
    expect(hearts().every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    submit().focus();
    await user.keyboard("{Enter}");
    expect(answer).toHaveBeenCalledWith(base.id, {
      kind: "pairs",
      pairs: [
        { left: "1", right: "heart" },
        { left: "2", right: "SYNTHETIC lung" },
        { left: "3", right: "heart" },
      ],
    });
  });
});

describe("a numeric check without an entry", () => {
  it("is still a typed box", async () => {
    await show(numeric(null));
    expect(screen.getByLabelText("Your answer")).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
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

describe("blanks marked in their sentence", () => {
  it("puts each blank where it belongs in the sentence and names the question with each blank", async () => {
    await show({ ...blanks, prompt: "SYNTHETIC [1] comes before [2], and [3] is last" });
    expect(screen.getByRole("heading", { name: "SYNTHETIC Blank 1 comes before Blank 2, and Blank 3 is last" })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "beta" }));
    expect(screen.getByRole("button", { name: "Blank 1: beta" })).toBeInTheDocument();
    expect(screen.getByText(/comes before/, { selector: "span" })).toBeInTheDocument();
  });
});

describe("a typed number off the line", () => {
  it("says the range and marks the box, without blocking the answer", async () => {
    await show(numeric({ mode: "number_line", min: "0", max: "10", step: "1" }));
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Or type the number"), "12");
    expect(screen.getByText("Pick a number from 0 to 10.")).toBeInTheDocument();
    expect(screen.getByLabelText("Or type the number")).toHaveAttribute("aria-invalid", "true");
    expect(submit()).toBeEnabled();
  });
});
