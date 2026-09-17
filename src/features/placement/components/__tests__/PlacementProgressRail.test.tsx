import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlacementProgressRail } from "../PlacementProgressRail";
import type { PlacementBlockSummary } from "../../types/placement";

const BLOCKS: PlacementBlockSummary[] = [
  { block_index: 0, item_count: 5, start_index: 0, answered: 5, slots: [] },
  { block_index: 1, item_count: 5, start_index: 5, answered: 2, slots: [] },
  { block_index: 2, item_count: 3, start_index: 10, answered: 0, slots: [] },
];

describe("PlacementProgressRail", () => {
  it("renders one segment per batch", () => {
    const { container } = render(
      <PlacementProgressRail
        blocks={BLOCKS}
        activeBlockIndex={1}
        answeredInActiveBlock={2}
        currentIndex={7}
        totalItems={13}
      />,
    );
    expect(container.querySelectorAll('[role="progressbar"] > div')).toHaveLength(BLOCKS.length);
  });

  it("shows the batch number and overall count in the header", () => {
    render(
      <PlacementProgressRail
        blocks={BLOCKS}
        activeBlockIndex={1}
        answeredInActiveBlock={2}
        currentIndex={7}
        totalItems={13}
      />,
    );
    expect(screen.getByText("Batch 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("8 of 13")).toBeInTheDocument();
  });

  it("fills a past segment fully, the active segment proportionally, and leaves future segments empty", () => {
    const { container } = render(
      <PlacementProgressRail
        blocks={BLOCKS}
        activeBlockIndex={1}
        answeredInActiveBlock={2}
        currentIndex={7}
        totalItems={13}
      />,
    );
    const fills = Array.from(container.querySelectorAll('[role="progressbar"] > div > div')) as HTMLElement[];
    expect(fills[0].style.width).toBe("100%");
    expect(fills[1].style.width).toBe(`${(2 / 5) * 100}%`);
    expect(fills[2].style.width).toBe("0%");
  });

  it("renders nothing when there are no batches yet", () => {
    const { container } = render(
      <PlacementProgressRail blocks={[]} activeBlockIndex={0} answeredInActiveBlock={0} currentIndex={0} totalItems={0} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
