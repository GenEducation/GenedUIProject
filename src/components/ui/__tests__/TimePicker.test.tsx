import { fireEvent, render, screen, within } from "@testing-library/react";
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

  it("commits a sane default when opened with no value", () => {
    const onChange = vi.fn();
    render(<Harness initial="" onChange={onChange} />);
    fireEvent.click(trigger());
    expect(onChange).toHaveBeenCalledWith("09:00");
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

    it("round-trips AM/PM", () => {
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);
      openPanel();

      fireEvent.click(screen.getByRole("button", { name: "PM" }));
      expect(onChange).toHaveBeenLastCalledWith("21:30");

      fireEvent.click(screen.getByRole("button", { name: "AM" }));
      expect(onChange).toHaveBeenLastCalledWith("09:30");
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

  describe("wheel mode", () => {
    it("exposes hour, minute and period wheels", () => {
      render(<Harness mode="wheel" />);
      openPanel();
      expect(screen.getByRole("listbox", { name: "Hour" })).toBeInTheDocument();
      expect(screen.getByRole("listbox", { name: "Minute" })).toBeInTheDocument();
      expect(screen.getByRole("listbox", { name: "AM or PM" })).toBeInTheDocument();
    });

    it("selects by clicking a wheel item", () => {
      const onChange = vi.fn();
      render(<Harness mode="wheel" onChange={onChange} />);
      openPanel();

      const hours = screen.getByRole("listbox", { name: "Hour" });
      fireEvent.click(within(hours).getByRole("option", { name: "11" }));
      expect(onChange).toHaveBeenLastCalledWith("11:30");
    });

    it("honours minuteStep", () => {
      render(<Harness mode="wheel" minuteStep={15} />);
      openPanel();
      const minutes = screen.getByRole("listbox", { name: "Minute" });
      expect(within(minutes).getAllByRole("option").map((o) => o.textContent)).toEqual([
        "00",
        "15",
        "30",
        "45",
      ]);
    });

    it("marks the current selection", () => {
      render(<Harness mode="wheel" initial="11:00" />);
      openPanel();
      const hours = screen.getByRole("listbox", { name: "Hour" });
      expect(within(hours).getByRole("option", { name: "11" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
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

  it("clears the value", () => {
    const onChange = vi.fn();
    render(<Harness clearable onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear time" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("does not open when disabled", () => {
    render(<Harness disabled />);
    fireEvent.click(trigger());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("mirrors the value into a hidden input", () => {
    const { container } = render(<Harness name="startTime" />);
    expect(container.querySelector<HTMLInputElement>('input[name="startTime"]')?.value).toBe(
      "09:30",
    );
  });

  it("surfaces an error and points the trigger at it for screen readers", () => {
    render(<Harness error="Pick a time" />);
    const message = screen.getByRole("alert");
    expect(message).toHaveTextContent("Pick a time");
    // aria-invalid isn't valid on button's implicit role, so the association
    // is made with aria-describedby instead.
    expect(trigger()).toHaveAttribute("aria-describedby", message.id);
  });
});
