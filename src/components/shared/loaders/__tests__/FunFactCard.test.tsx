import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FunFactCard } from "../FunFactCard";

describe("FunFactCard", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("shows nothing before the delay has elapsed", () => {
    render(<FunFactCard delayMs={5000} />);
    expect(screen.queryByText(/Did you know\?/i)).toBeNull();
  });

  it("shows a fact once the delay has elapsed", async () => {
    render(<FunFactCard delayMs={20} />);
    await waitFor(() => expect(screen.getByText(/Did you know\?/i)).toBeTruthy());
  });

  it("shows a fact immediately when the delay is zero", async () => {
    render(<FunFactCard delayMs={0} />);
    await waitFor(() => expect(screen.getByText(/Did you know\?/i)).toBeTruthy());
  });

  it("unmounting before the delay does not show or throw", async () => {
    const { unmount } = render(<FunFactCard delayMs={50} />);
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(screen.queryByText(/Did you know\?/i)).toBeNull();
  });

  it("remembers the shown fact so it is not repeated next time", async () => {
    render(<FunFactCard delayMs={0} />);
    await waitFor(() => expect(screen.getByText(/Did you know\?/i)).toBeTruthy());
    const stored = JSON.parse(sessionStorage.getItem("gened_recent_facts") ?? "[]");
    expect(stored.length).toBe(1);
  });

  it("renders a themed icon alongside the fact", async () => {
    const { container } = render(<FunFactCard delayMs={0} />);
    await waitFor(() => expect(screen.getByText(/Did you know/i)).toBeTruthy());
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders with no enclosing chrome on any element", async () => {
    // The fact must read as part of the screen, not as a card sitting on it.
    // This is the assertion that would have caught the original full/inline
    // inconsistency, so it guards the whole point of the component.
    const { container } = render(<FunFactCard delayMs={0} />);
    await waitFor(() => expect(screen.getByText(/Did you know/i)).toBeTruthy());

    for (const el of Array.from(container.querySelectorAll("*"))) {
      const { background, backgroundColor, border, borderRadius, boxShadow } = (
        el as HTMLElement
      ).style;
      expect(background, el.tagName).toBeFalsy();
      expect(backgroundColor, el.tagName).toBeFalsy();
      expect(border, el.tagName).toBeFalsy();
      expect(borderRadius, el.tagName).toBeFalsy();
      expect(boxShadow, el.tagName).toBeFalsy();
    }
  });
});
