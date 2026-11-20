import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { PictureQuestion } from "@/features/partner/types/sources";
import { PictureQuestionsPanel } from "../PictureQuestionsPanel";

vi.mock("../../services/visualsService", () => ({
  visualsService: {
    listCandidates: vi.fn().mockResolvedValue([]),
    imageSrc: () => null,
  },
}));

/** SYNTHETIC picture questions: two the run couldn't place, one shown with its picture. */
const PICTURES: PictureQuestion[] = [
  {
    item_key: "1.1:a",
    section_key: "1.1",
    prompt: "SYNTHETIC: explain it with a picture.",
    page: 3,
    status: "held",
    reason: "not_identified",
    figures: [],
    chosen: null,
    suggestions: [
      { key: "1.1:1", page: 3, role: "teaching" },
      { key: "1.1:2", page: 4, role: "decorative" },
    ],
  },
  {
    item_key: "1.1:b",
    section_key: "1.1",
    prompt: "SYNTHETIC: show it with a picture.",
    page: 3,
    status: "held",
    reason: "not_identified",
    figures: [],
    chosen: null,
    suggestions: [],
  },
  {
    item_key: "1.1:c",
    section_key: "1.1",
    prompt: "SYNTHETIC: look at the diagram.",
    page: 4,
    status: "shown",
    reason: null,
    figures: ["1.1:2"],
    chosen: null,
    suggestions: [],
  },
];

function panel(
  overrides: Partial<Parameters<typeof PictureQuestionsPanel>[0]> = {},
) {
  const props = {
    sourceId: "synthetic-source",
    pictures: PICTURES,
    removed: new Set<string>(),
    chosen: {},
    onRemove: vi.fn(),
    onChoose: vi.fn(),
    ...overrides,
  };
  render(<PictureQuestionsPanel {...props} />);
  return props;
}

describe("PictureQuestionsPanel", () => {
  it("removes every question without a picture in one go", () => {
    const props = panel();
    fireEvent.click(
      screen.getByRole("button", {
        name: /select all without a picture \(2\)/i,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /remove selected \(2\)/i }),
    );
    expect(props.onRemove).toHaveBeenCalledWith(["1.1:a", "1.1:b"], true);
  });

  it("offers the section's pictures and records the one chosen", () => {
    const props = panel();
    const card = screen.getByRole("article", {
      name: /explain it with a picture/i,
    });
    expect(within(card).getByText(/couldn’t tell which one/i)).toBeTruthy();
    fireEvent.click(
      within(card).getAllByRole("button", { name: /use this picture/i })[0],
    );
    expect(props.onChoose).toHaveBeenCalledWith("1.1:a", "1.1:1");
  });

  it("shows the picture attached to a question that is shown with one", () => {
    panel();
    const card = screen.getByRole("article", { name: /look at the diagram/i });
    expect(within(card).getByText(/attached picture/i)).toBeTruthy();
    expect(within(card).getByText(/shown with its picture/i)).toBeTruthy();
  });

  it("lets a removal be undone", () => {
    const props = panel({ removed: new Set(["1.1:b"]) });
    const card = screen.getByRole("article", {
      name: /show it with a picture/i,
    });
    fireEvent.click(within(card).getByRole("button", { name: /keep/i }));
    expect(props.onRemove).toHaveBeenCalledWith(["1.1:b"], false);
  });
});
