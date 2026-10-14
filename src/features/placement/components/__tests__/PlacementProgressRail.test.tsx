import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlacementProgressRail } from "../PlacementProgressRail";

describe("PlacementProgressRail", () => {
  it("never shows more than totalItems even if currentIndex overruns it", () => {
    render(<PlacementProgressRail currentIndex={25} totalItems={20} />);
    expect(screen.getByText("20 of 20")).toBeInTheDocument();
  });

  it("renders nothing when there are no items yet", () => {
    const { container } = render(<PlacementProgressRail currentIndex={0} totalItems={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});
