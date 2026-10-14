import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../Button";
import { STUDENT_COLORS } from "@/features/student/theme/colors";

describe("Button", () => {
  /**
   * Restored from commit a522018, which commit 7d9cddd deleted by accident
   * along with the fallbacks themselves.
   *
   * A route can render before the global token stylesheet arrives (dev HMR,
   * streamed route CSS). An unresolved `var()` invalidates the whole
   * declaration, so a primary CTA becomes white-on-white — an apparently
   * empty button. Every token reference must carry a literal fallback.
   */
  describe("CSS token fallbacks", () => {
    it("pins a literal fallback on the primary fill", () => {
      render(<Button variant="primary">Go</Button>);
      const bg = screen.getByRole("button").style.getPropertyValue("--btn-bg");
      expect(bg).toBe(`var(--primary, ${STUDENT_COLORS.primary})`);
    });

    it("pins a literal fallback on the destructive fill", () => {
      render(<Button variant="destructiveSolid">Delete</Button>);
      const bg = screen.getByRole("button").style.getPropertyValue("--btn-bg");
      expect(bg).toBe(`var(--danger-2, ${STUDENT_COLORS.danger})`);
    });

    it("leaves no bare var() anywhere in the inline style", () => {
      // Catches a fallback dropped from any variant, not just the two above.
      const variants = ["primary", "secondary", "tertiary", "destructive", "destructiveSolid"] as const;
      for (const variant of variants) {
        const { unmount } = render(<Button variant={variant}>x</Button>);
        const style = screen.getByRole("button").getAttribute("style") ?? "";
        const bare = style.match(/var\(--[\w-]+\)/g);
        expect(bare, `${variant} has unguarded var(): ${bare?.join(", ")}`).toBeNull();
        unmount();
      }
    });
  });

  it("keeps its loading spinner off the shared animate-spin class", () => {
    // Tests elsewhere assert `.animate-spin` is absent to prove a page is not
    // loading; a Button in those trees must not satisfy that selector.
    const { container } = render(<Button loading>Save</Button>);
    expect(container.querySelector(".animate-spin")).toBeNull();
    expect(container.querySelector("[data-button-spinner]")).not.toBeNull();
  });

  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button");
  });

  it("keeps the label mounted while loading so the width does not jump", () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toHaveTextContent("Save");
  });

  it("keeps its accessible name while loading", () => {
    // Regression: the label was hidden with `visibility: hidden`, which drops
    // it from the accessibility tree and leaves the button unnamed.
    render(<Button loading>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("drops its own relative when the call site positions it absolutely", () => {
    render(<Button aria-label="Close" className="absolute top-4 right-4">x</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("absolute");
    expect(btn).not.toHaveClass("relative");
  });
});
