import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ConnectionQualityBanner } from "../ConnectionQualityBanner";

const rotating = (message: string) => ({ message, kind: "rotating" as const });
const ended = (message: string) => ({ message, kind: "ended" as const });

function bgOf(container: HTMLElement): string | undefined {
  return container.querySelector<HTMLElement>("[style*='background']")?.style.background;
}

describe("ConnectionQualityBanner", () => {
  it("stays hidden when the connection is fine and there is no notice", () => {
    const { container } = render(<ConnectionQualityBanner quality="good" />);
    expect(container.textContent).toBe("");
  });

  it("still reports a genuinely poor connection", () => {
    render(<ConnectionQualityBanner quality="poor" />);
    expect(screen.getByText("Poor internet connection")).toBeInTheDocument();
  });

  it("does not dress a planned rotation as a connection failure", () => {
    // The whole point of the notice path: a GoAway rotation is routine, so it must not
    // borrow the red "your connection is dying" treatment. If these ever collapse to
    // one style, a child gets alarmed every few minutes for nothing.
    const { container: rotatingUi } = render(
      <ConnectionQualityBanner quality={null} notice={rotating("Back in a second!")} />,
    );
    const { container: failingUi } = render(
      <ConnectionQualityBanner quality="reconnecting" />,
    );

    expect(bgOf(rotatingUi)).toBeTruthy();
    expect(bgOf(rotatingUi)).not.toBe(bgOf(failingUi));
  });

  it("prefers the notice over a stale quality value", () => {
    // Both can be set at once: the socket rotates while quality still reads
    // "reconnecting" from the drop. The child should see the explanation, not the alarm.
    render(
      <ConnectionQualityBanner quality="reconnecting" notice={rotating("Back in a second!")} />,
    );
    expect(screen.getByText("Back in a second!")).toBeInTheDocument();
    expect(screen.queryByText("Reconnecting…")).not.toBeInTheDocument();
  });

  it("shows a deliberate ending in its own style, with no spinner", () => {
    // "Ended" must not look like "hold on": the lesson is over and nothing is pending.
    const { container: endedUi } = render(
      <ConnectionQualityBanner quality={null} notice={ended("That is a LOT of learning for one day — well done!")} />,
    );
    const { container: rotatingUi } = render(
      <ConnectionQualityBanner quality={null} notice={rotating("Back in a second!")} />,
    );

    expect(screen.getByText(/LOT of learning/i)).toBeInTheDocument();
    expect(bgOf(endedUi)).toBeTruthy();
    expect(bgOf(endedUi)).not.toBe(bgOf(rotatingUi));
    // A spinner tells the child to wait. After a cap there is nothing to wait for.
    expect(endedUi.querySelector(".animate-spin")).toBeNull();
  });
});
