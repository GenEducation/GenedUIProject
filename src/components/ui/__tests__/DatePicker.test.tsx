import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DatePicker, type DatePickerProps } from "../DatePicker";

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

  it("mirrors the value into a hidden input for form submission", () => {
    const { container } = render(<Harness name="sessionDate" />);
    expect(container.querySelector<HTMLInputElement>('input[name="sessionDate"]')?.value).toBe(
      "2026-08-19",
    );
  });
});
