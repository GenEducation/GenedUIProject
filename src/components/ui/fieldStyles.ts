import type React from "react";

// Shared base class for form fields (text inputs, selects, and button-styled
// pickers) across the student portal. The exact string was previously
// copy-pasted at 5 call sites; centralizing it here means a future style
// change only needs to happen once.
//
// Deliberately excludes horizontal padding (px-*): one call site needs
// `pl-12 pr-4` (icon offset) instead of the plain `px-4` the others use, and
// Tailwind resolves conflicting utilities by their position in the generated
// stylesheet, not by className string order — so appending an override after
// this constant would not reliably win. Each call site supplies its own
// horizontal padding class alongside this constant.
export const FIELD_CLASSNAME =
  "w-full bg-[var(--surface-sunken)] border border-[rgba(4,46,92,0.05)] rounded-2xl py-3.5 text-sm font-medium transition-all";

// Focus treatment for plain form fields (search input, selects). Kept
// separate from FIELD_CLASSNAME: DatePicker/TimePicker use a different,
// per-instance `themeColor`-driven focus style (a JS-set boxShadow), so
// bundling a fixed focus:ring here would silently fight their theming.
export const FIELD_FOCUS_CLASSNAME =
  "focus:outline-none focus:ring-2 focus:ring-[var(--primary-ink)]/10 focus:bg-white";

/**
 * Rewrites a `border` shorthand into its longhands.
 *
 * Select/DatePicker/TimePicker override `borderColor` for their focus and open
 * states. React warns — and can apply the wrong style — when a shorthand and
 * one of its longhands are both set on an element across renders. Call sites
 * pass arbitrary `buttonStyle` objects and naturally write `border: "1px solid
 * X"`, so the components normalize the merged style through this rather than
 * relying on every call site to remember.
 *
 * Only the `<width> <style> <color>` form is handled — the one the app uses.
 * Anything else is passed through untouched.
 */
export function withBorderLonghands(style: React.CSSProperties): React.CSSProperties {
  if (!style.border) return style;
  const { border, ...rest } = style;
  const match = /^(\S+)\s+(\S+)\s+(.+)$/.exec(String(border));
  if (!match) return style;
  // `rest` spreads last so an explicit longhand at the call site still wins.
  return { borderWidth: match[1], borderStyle: match[2], borderColor: match[3], ...rest };
}
