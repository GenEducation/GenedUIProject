import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FunFactCard } from "../FunFactCard";

describe("FunFactCard", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("shows nothing before the delay has elapsed", () => {
    render(<FunFactCard grade={5} delayMs={5000} />);
    expect(screen.queryByText(/Did you know\?/i)).toBeNull();
  });

  it("shows a fact once the delay has elapsed", async () => {
    render(<FunFactCard grade={5} delayMs={20} />);
    await waitFor(() => expect(screen.getByText(/Did you know\?/i)).toBeTruthy());
  });

  it("shows a fact immediately when the delay is zero", async () => {
    render(<FunFactCard grade={5} delayMs={0} />);
    await waitFor(() => expect(screen.getByText(/Did you know\?/i)).toBeTruthy());
  });

  it("unmounting before the delay does not show or throw", async () => {
    const { unmount } = render(<FunFactCard grade={5} delayMs={50} />);
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(screen.queryByText(/Did you know\?/i)).toBeNull();
  });

  it("remembers the shown fact so it is not repeated next time", async () => {
    render(<FunFactCard grade={5} delayMs={0} />);
    await waitFor(() => expect(screen.getByText(/Did you know\?/i)).toBeTruthy());
    const stored = JSON.parse(sessionStorage.getItem("gened_recent_facts") ?? "[]");
    expect(stored.length).toBe(1);
  });

  it("renders the inline variant without the card chrome", async () => {
    const { container } = render(<FunFactCard grade={5} delayMs={0} variant="inline" />);
    await waitFor(() => expect(screen.getByText(/Did you know\?/i)).toBeTruthy());
    expect(container.querySelector("p")).toBeTruthy();
  });
});
