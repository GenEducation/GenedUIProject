import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { FunFactCard } from "../FunFactCard";

describe("FunFactCard", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("remembers the shown fact so it is not repeated next time", async () => {
    render(<FunFactCard delayMs={0} />);
    await waitFor(() => expect(screen.getByText(/Did you know/i)).toBeTruthy());
    const stored = JSON.parse(sessionStorage.getItem("gened_recent_facts") ?? "[]");
    expect(stored.length).toBe(1);
  });

  it("renders with no enclosing chrome on any element", async () => {
    // The fact must read as part of the screen, not as a card sitting on it.
    // This is the assertion that would have caught the original full/inline
    // inconsistency, so it guards the whole point of the component.
    const { container } = render(<FunFactCard delayMs={0} />);
    await waitFor(() => expect(screen.getByText(/Did you know/i)).toBeTruthy());
    expectNoChrome(container);
  });

  describe("interactive reveal", () => {
    it("reveals the fact when tapped", async () => {
      render(<FunFactCard delayMs={0} interactive />);
      await waitFor(() => expect(screen.getByText(/Take a guess/i)).toBeTruthy());
      fireEvent.click(screen.getByRole("button", { name: /tap to reveal/i }));
      expect(screen.getByText(/Did you know/i)).toBeTruthy();
      expect(screen.queryByRole("button", { name: /tap to reveal/i })).toBeNull();
    });

    it("auto-reveals after 5s so an untouched question never strands the reader", async () => {
      vi.useFakeTimers();
      try {
        render(<FunFactCard delayMs={0} interactive />);
        expect(screen.getByText(/Take a guess/i)).toBeTruthy();
        await act(async () => {
          vi.advanceTimersByTime(5000);
        });
        expect(screen.getByText(/Did you know/i)).toBeTruthy();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});

function expectNoChrome(container: HTMLElement) {
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
}
