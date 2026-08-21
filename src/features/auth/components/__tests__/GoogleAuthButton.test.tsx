import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

/**
 * Stand-in for Google's widget, which really paints into a cross-origin iframe
 * a test cannot reach into.
 */
vi.mock("@react-oauth/google", () => ({
  GoogleLogin: ({ width, text }: { width?: number; text?: string }) => (
    <div data-testid="gsi-widget" data-width={width} data-text={text}>
      Google
    </div>
  ),
}));

import { GoogleAuthButton } from "../GoogleAuthButton";

const CONTAINER_WIDTH = 360;

beforeEach(() => {
  // jsdom has no layout, so feed the component the width it measures.
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(CONTAINER_WIDTH);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("GoogleAuthButton", () => {
  it("renders Google's real widget, visible and un-obscured", async () => {
    // Two earlier versions hid the widget behind a custom surface and both
    // shipped a button that looked fine and did nothing. Nothing may cover it.
    render(<GoogleAuthButton onSuccess={vi.fn()} />);

    await waitFor(() => expect(screen.getByTestId("gsi-widget")).toBeInTheDocument());
    expect(screen.getByTestId("google-widget-layer")).not.toHaveClass("opacity-0");
  });

  it("sizes the widget to the container so it spans the full card width", async () => {
    render(<GoogleAuthButton onSuccess={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId("gsi-widget")).toHaveAttribute("data-width", String(CONTAINER_WIDTH)),
    );
  });

  it("passes the sign-up copy through when asked", async () => {
    render(<GoogleAuthButton text="signup_with" onSuccess={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId("gsi-widget")).toHaveAttribute("data-text", "signup_with"),
    );
  });

  it("clamps the width to the maximum GSI will render", async () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(900);
    render(<GoogleAuthButton onSuccess={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId("gsi-widget")).toHaveAttribute("data-width", "400"),
    );
  });
});
