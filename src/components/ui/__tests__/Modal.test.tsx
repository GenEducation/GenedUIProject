import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Modal } from "../Modal";

describe("Modal", () => {
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
});
