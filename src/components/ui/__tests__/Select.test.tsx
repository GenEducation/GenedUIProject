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
  it("shows the placeholder until a value is chosen, then the label", () => {
    render(<Harness placeholder="Select…" />);
    expect(trigger()).toHaveTextContent("Select…");
    fireEvent.click(within(openPanel()).getByRole("option", { name: "School" }));
    expect(trigger()).toHaveTextContent("School");
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
});
