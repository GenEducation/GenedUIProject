import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../Button";

describe("Button", () => {
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

  it("does not fire onClick while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>
    );
    await userEvent.click(screen.getByRole("button"), { pointerEventsCheck: 0 });
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders a square footprint for icon-only buttons", () => {
    render(<Button iconOnly size="md" aria-label="Delete" />);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveStyle({
      width: "36px",
      height: "36px",
    });
  });

  it("lets a call site override the surface via style", () => {
    render(<Button style={{ borderRadius: 4 }}>Go</Button>);
    expect(screen.getByRole("button")).toHaveStyle({ borderRadius: "4px" });
  });
});
