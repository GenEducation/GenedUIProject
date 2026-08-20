import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DatePicker, type DatePickerProps } from "../DatePicker";
import { todayDateString } from "@/utils/datetime";

function Harness({
  initial = "2026-08-19",
  onChange,
  ...rest
}: { initial?: string; onChange?: (v: string) => void } & Partial<DatePickerProps>) {
  const [value, setValue] = useState(initial);
  return (
    <DatePicker
      aria-label="Session date"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      {...rest}
    />
  );
}

const trigger = () => screen.getByRole("button", { name: /session date/i });
const openPanel = () => {
  fireEvent.click(trigger());
  return screen.getByRole("dialog");
};
const day = (n: string) => within(screen.getByRole("dialog")).getByRole("gridcell", { name: n });

describe("DatePicker", () => {
  it("renders the selected date", () => {
    render(<Harness />);
    expect(trigger()).toHaveTextContent("Wed, Aug 19, 2026");
  });

  it("falls back to the placeholder when empty", () => {
    render(<Harness initial="" placeholder="Pick a day" />);
    expect(trigger()).toHaveTextContent("Pick a day");
  });

  it("opens and closes, and selects a day", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    expect(screen.queryByRole("dialog")).toBeNull();

    openPanel();
    expect(trigger()).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(day("21"));
    expect(onChange).toHaveBeenCalledWith("2026-08-21");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  /**
   * The regression test for the reported bug: the student pickers rendered
   * their panel in normal document flow (a stray `relative` beat the
   * `absolute`), so opening one grew the card that contained it. The panel must
   * be position:fixed and must NOT live inside the trigger's own subtree.
   */
  it("renders the panel portalled and fixed, so it never grows its container", () => {
    const { container } = render(
      <div style={{ overflow: "hidden" }}>
        <Harness />
      </div>,
    );
    const panel = openPanel();

    expect(panel.style.position).toBe("fixed");
    expect(container.contains(panel)).toBe(false);
    expect(document.body.contains(panel)).toBe(true);
  });

  it("navigates months without changing the value", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const panel = openPanel();

    expect(panel).toHaveTextContent("August 2026");
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("September 2026");

    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("July 2026");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disables days outside min/max", () => {
    const onChange = vi.fn();
    render(<Harness min="2026-08-18" max="2026-08-20" onChange={onChange} />);
    openPanel();

    expect(day("17")).toBeDisabled();
    expect(day("18")).toBeEnabled();
    expect(day("20")).toBeEnabled();
    expect(day("21")).toBeDisabled();

    fireEvent.click(day("21"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("marks the selected day and today", () => {
    render(<Harness />);
    openPanel();
    expect(day("19")).toHaveAttribute("aria-selected", "true");
    expect(day("20")).toHaveAttribute("aria-selected", "false");
  });

  it("moves by day, week and month with the keyboard and selects with Enter", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    trigger().focus();

    fireEvent.keyDown(trigger(), { key: "ArrowDown" }); // opens on the 19th
    fireEvent.keyDown(trigger(), { key: "ArrowRight" }); // 20th
    fireEvent.keyDown(trigger(), { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("2026-08-20");

    onChange.mockClear();
    fireEvent.keyDown(trigger(), { key: "ArrowDown" }); // reopen on the 20th
    fireEvent.keyDown(trigger(), { key: "ArrowDown" }); // +7 -> 27th
    fireEvent.keyDown(trigger(), { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("2026-08-27");
  });

  it("pages across a month boundary with PageDown", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    trigger().focus();
    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    fireEvent.keyDown(trigger(), { key: "PageDown" }); // +28 -> Sep 16
    fireEvent.keyDown(trigger(), { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("2026-09-16");
  });

  it("closes on Escape and restores focus without changing the value", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    trigger().focus();
    openPanel();

    fireEvent.keyDown(trigger(), { key: "Escape" });
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes when clicking outside", () => {
    render(<Harness />);
    openPanel();
    fireEvent.mouseDown(document.body);
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("selects today from the footer shortcut", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(onChange).toHaveBeenCalledWith(todayDateString());
  });

  it("hides the Today shortcut when disabled", () => {
    render(<Harness showToday={false} />);
    openPanel();
    expect(screen.queryByRole("button", { name: "Today" })).toBeNull();
  });

  it("clears the value when clearable", () => {
    const onChange = vi.fn();
    render(<Harness clearable onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear date" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("does not open when disabled", () => {
    render(<Harness disabled />);
    fireEvent.click(trigger());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("mirrors the value into a hidden input for form submission", () => {
    const { container } = render(<Harness name="sessionDate" />);
    expect(container.querySelector<HTMLInputElement>('input[name="sessionDate"]')?.value).toBe(
      "2026-08-19",
    );
  });

  it("surfaces an error and points the trigger at it for screen readers", () => {
    render(<Harness error="Pick a date" />);
    const message = screen.getByRole("alert");
    expect(message).toHaveTextContent("Pick a date");
    // aria-invalid isn't valid on button's implicit role, so the association
    // is made with aria-describedby instead.
    expect(trigger()).toHaveAttribute("aria-describedby", message.id);
  });
});
