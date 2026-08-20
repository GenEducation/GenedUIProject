import { fireEvent, screen, within } from "@testing-library/react";

/**
 * Helpers for driving the shared <Select> (src/components/ui/Select.tsx).
 *
 * Selects used to be native `<select>` elements, so tests reached for
 * `fireEvent.change(combobox, { target: { value } })`. The component is now a
 * button + portalled listbox, so a change event on the trigger does nothing —
 * the interaction is "click the trigger, then click the option".
 *
 * The listbox portals to document.body, so `screen`-level queries find it.
 */

/** Opens the dropdown and returns its listbox element. */
export function openSelect(trigger: HTMLElement): HTMLElement {
  fireEvent.click(trigger);
  return screen.getByRole("listbox");
}

/** The option labels currently rendered, in order. */
export function getSelectOptionLabels(trigger: HTMLElement): string[] {
  const listbox = openSelect(trigger);
  return within(listbox)
    .getAllByRole("option")
    .map((o) => o.textContent ?? "");
}

/** Opens the dropdown and clicks the option with the given label. */
export function chooseSelectOption(trigger: HTMLElement, label: string | RegExp): void {
  const listbox = openSelect(trigger);
  fireEvent.click(within(listbox).getByRole("option", { name: label }));
}
