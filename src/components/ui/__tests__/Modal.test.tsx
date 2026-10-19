import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Modal } from "../Modal";

describe("Modal", () => {
  it("renders nothing while closed", () => {
    render(
      <Modal open={false} onClose={vi.fn()}>
        <p>Body</p>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("portals to the body so it escapes any clipped ancestor", () => {
    render(
      <div style={{ overflow: "hidden" }}>
        <Modal open onClose={vi.fn()}>
          <p>Body</p>
        </Modal>
      </div>,
    );
    expect(screen.getByRole("dialog").closest("body")).toBe(document.body);
  });

  it("names itself from `title` without necessarily showing it", () => {
    render(
      <Modal open onClose={vi.fn()} title="Placement test">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Placement test" })).toBeInTheDocument();
  });

  describe("dismissing", () => {
    it("closes on Escape", async () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose}>
          <p>Body</p>
        </Modal>,
      );
      await userEvent.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("closes on a backdrop click", async () => {
      const onClose = vi.fn();
      const { container } = render(
        <Modal open onClose={onClose}>
          <p>Body</p>
        </Modal>,
      );
      const backdrop = document.body.querySelector(".fixed.inset-0.z-\\[100\\]");
      expect(backdrop).not.toBeNull();
      await userEvent.click(backdrop as Element);
      expect(onClose).toHaveBeenCalledOnce();
      expect(container).toBeTruthy();
    });

    it("respects dismissOnBackdrop={false}", async () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} dismissOnBackdrop={false}>
          <p>Body</p>
        </Modal>,
      );
      const backdrop = document.body.querySelector(".fixed.inset-0.z-\\[100\\]");
      await userEvent.click(backdrop as Element);
      expect(onClose).not.toHaveBeenCalled();
    });

    /**
     * The placement form relies on this: omitting `onClose` must make the
     * dialog genuinely non-dismissible, because a student who can Escape out
     * of a graded item halfway through loses it.
     */
    it("is non-dismissible with no onClose", async () => {
      render(
        <Modal open>
          <button type="button">Inside</button>
        </Modal>,
      );
      await userEvent.keyboard("{Escape}");
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("focus", () => {
    it("moves focus into the dialog on open", async () => {
      render(
        <Modal open onClose={vi.fn()}>
          <button type="button">First</button>
          <button type="button">Second</button>
        </Modal>,
      );
      await vi.waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole("button", { name: "First" })),
      );
    });

    it("keeps Tab inside the dialog", async () => {
      render(
        <>
          <button type="button">Outside</button>
          <Modal open onClose={vi.fn()}>
            <button type="button">First</button>
            <button type="button">Last</button>
          </Modal>
        </>,
      );

      const first = screen.getByRole("button", { name: "First" });
      const last = screen.getByRole("button", { name: "Last" });
      await vi.waitFor(() => expect(document.activeElement).toBe(first));

      await userEvent.tab();
      expect(document.activeElement).toBe(last);

      // Past the last focusable, Tab wraps back rather than reaching "Outside".
      await userEvent.tab();
      expect(document.activeElement).toBe(first);
    });
  });

  it("locks body scroll while open and restores it on close", () => {
    const { rerender } = render(
      <Modal open onClose={vi.fn()}>
        <p>Body</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <Modal open={false} onClose={vi.fn()}>
        <p>Body</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("");
  });

  it("passes className through to the panel, which is how theming scopes in", () => {
    render(
      <Modal open onClose={vi.fn()} className="placement-theme">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("placement-theme");
  });
});
