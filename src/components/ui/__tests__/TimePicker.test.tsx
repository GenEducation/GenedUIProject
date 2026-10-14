import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { TimePicker, type TimePickerProps } from "../TimePicker";

function Harness({
  initial = "09:30",
  onChange,
  ...rest
}: { initial?: string; onChange?: (v: string) => void } & Partial<TimePickerProps>) {
  const [value, setValue] = useState(initial);
  return (
    <TimePicker
      aria-label="Start time"
      mode="typed"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      {...rest}
    />
  );
}

const trigger = () => screen.getByRole("button", { name: /start time/i });
const openPanel = () => {
  fireEvent.click(trigger());
  return screen.getByRole("dialog");
};

describe("TimePicker", () => {
  it("renders the value in 12-hour form and a placeholder when empty", () => {
    const { unmount } = render(<Harness />);
    expect(trigger()).toHaveTextContent("9:30 AM");
    unmount();

    render(<Harness initial="" placeholder="Select a time" />);
    expect(trigger()).toHaveTextContent("Select a time");
  });

  /** Regression guard shared with DatePicker — see that test for the history. */
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

  describe("typed mode", () => {
    it("edits the hour and minute", () => {
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);
      openPanel();

      fireEvent.change(screen.getByLabelText("Hour"), { target: { value: "11" } });
      expect(onChange).toHaveBeenLastCalledWith("11:30");

      fireEvent.change(screen.getByLabelText("Minute"), { target: { value: "45" } });
      expect(onChange).toHaveBeenLastCalledWith("11:45");
    });

    it("rejects out-of-range entry rather than wrapping it", () => {
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);
      openPanel();

      fireEvent.change(screen.getByLabelText("Hour"), { target: { value: "25" } });
      fireEvent.change(screen.getByLabelText("Minute"), { target: { value: "71" } });
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Hour")).toHaveValue("9");
    });

    it("keeps 12 AM at midnight, not noon", () => {
      const onChange = vi.fn();
      render(<Harness initial="00:15" onChange={onChange} />);
      openPanel();
      expect(trigger()).toHaveTextContent("12:15 AM");

      fireEvent.click(screen.getByRole("button", { name: "PM" }));
      expect(onChange).toHaveBeenLastCalledWith("12:15");
    });
  });

  it("closes on Done, Escape and outside click", () => {
    render(<Harness />);

    openPanel();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(trigger()).toHaveAttribute("aria-expanded", "false");

    trigger().focus();
    openPanel();
    fireEvent.keyDown(trigger(), { key: "Escape" });
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger());

    openPanel();
    fireEvent.mouseDown(document.body);
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });
});
