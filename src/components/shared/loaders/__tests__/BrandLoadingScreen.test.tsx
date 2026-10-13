import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BrandLoadingScreen } from "../BrandLoadingScreen";

afterEach(() => vi.useRealTimers());

describe("BrandLoadingScreen", () => {
  it("waits a beat, then shows the current GenEd logo assembling, never a spinner or the old logo", () => {
    vi.useFakeTimers();
    const { container } = render(<BrandLoadingScreen />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull(); // a quick check never flashes the logo

    act(() => { vi.advanceTimersByTime(300); });
    const sources = Array.from(container.querySelectorAll("img")).map((img) => img.getAttribute("src") ?? "");
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((src) => src.includes("/brand/gened-logo-deep-ocean-transparent.png"))).toBe(true);
    expect(container.querySelector(".animate-spin")).toBeNull();
  });
});
