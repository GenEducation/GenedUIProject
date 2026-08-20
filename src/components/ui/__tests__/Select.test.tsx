import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Select, type SelectOption, type SelectProps } from "../Select";

const OPTIONS: SelectOption[] = [
  { value: "parent", label: "Parent" },
  { value: "school", label: "School" },
  { value: "other", label: "Other" },
];

function Harness({
  initial = "",
  onChange,
  ...rest
}: { initial?: string; onChange?: (v: string) => void } & Partial<SelectProps<string>>) {
  const [value, setValue] = useState(initial);
  return (
    <Select
      aria-label="Ordering as"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      options={OPTIONS}
      {...rest}
    />
  );
}

const trigger = () => screen.getByRole("combobox");
const openPanel = () => {
  fireEvent.click(trigger());
  return screen.getByRole("listbox");
};

describe("Select", () => {
  it("renders a button, not a native select, so the option list is app-styled", () => {
    render(<Harness />);
    expect(trigger().tagName).toBe("BUTTON");
    expect(document.querySelector("select")).toBeNull();
  });

  it("shows the placeholder until a value is chosen, then the label", () => {
    render(<Harness placeholder="Select…" />);
    expect(trigger()).toHaveTextContent("Select…");
    fireEvent.click(within(openPanel()).getByRole("option", { name: "School" }));
    expect(trigger()).toHaveTextContent("School");
  });

  it("keeps the list closed until opened and closes it again on selection", () => {
    render(<Harness />);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");

    openPanel();
    expect(trigger()).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("option", { name: "Other" }));
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("mirrors the value into a hidden input so form wiring keeps working", () => {
    const { container } = render(<Harness name="buyerType" initial="parent" />);
    const hidden = () => container.querySelector<HTMLInputElement>('input[name="buyerType"]');
    expect(hidden()?.value).toBe("parent");

    fireEvent.click(within(openPanel()).getByRole("option", { name: "School" }));
    expect(hidden()?.value).toBe("school");
  });

  it("selects with the keyboard and returns focus to the trigger", () => {
    const onChange = vi.fn();
    render(<Harness initial="parent" onChange={onChange} />);

    trigger().focus();
    fireEvent.keyDown(trigger(), { key: "ArrowDown" }); // opens, highlights current
    fireEvent.keyDown(trigger(), { key: "ArrowDown" }); // -> School
    fireEvent.keyDown(trigger(), { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("school");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger());
  });

  it("wraps arrow navigation and exposes the highlight via aria-activedescendant", () => {
    render(<Harness initial="other" />);
    trigger().focus();
    fireEvent.keyDown(trigger(), { key: "ArrowDown" }); // opens on "Other" (index 2)
    fireEvent.keyDown(trigger(), { key: "ArrowDown" }); // wraps to index 0
    expect(trigger().getAttribute("aria-activedescendant")).toMatch(/option-0$/);

    fireEvent.keyDown(trigger(), { key: "End" });
    expect(trigger().getAttribute("aria-activedescendant")).toMatch(/option-2$/);
  });

  it("closes on Escape without changing the value", () => {
    const onChange = vi.fn();
    render(<Harness initial="parent" onChange={onChange} />);
    openPanel();
    fireEvent.keyDown(trigger(), { key: "Escape" });

    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("jumps to an option by typeahead", () => {
    render(<Harness />);
    trigger().focus();
    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    fireEvent.keyDown(trigger(), { key: "s" });
    expect(trigger().getAttribute("aria-activedescendant")).toMatch(/option-1$/);
  });

  it("closes when clicking outside", () => {
    render(<Harness />);
    openPanel();
    fireEvent.mouseDown(document.body);
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("ignores disabled options", () => {
    const onChange = vi.fn();
    render(
      <Harness
        onChange={onChange}
        options={[
          { value: "a", label: "Available" },
          { value: "b", label: "Taken", disabled: true },
        ]}
      />,
    );
    fireEvent.click(within(openPanel()).getByRole("option", { name: "Taken" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("does not open when disabled", () => {
    render(<Harness disabled />);
    fireEvent.click(trigger());
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("filters options when searchable and reports when nothing matches", () => {
    render(<Harness searchable />);
    openPanel();
    const search = screen.getByPlaceholderText("Search…");

    fireEvent.change(search, { target: { value: "sch" } });
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["School"]);

    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });

  it("marks the current value as the selected option", () => {
    render(<Harness initial="other" />);
    openPanel();
    expect(screen.getByRole("option", { name: "Other" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Parent" })).toHaveAttribute("aria-selected", "false");
  });

  it("surfaces an error message and flags the trigger invalid", () => {
    render(<Harness error="Pick one" />);
    expect(screen.getByText("Pick one")).toBeInTheDocument();
    expect(trigger()).toHaveAttribute("aria-invalid", "true");
  });
});
