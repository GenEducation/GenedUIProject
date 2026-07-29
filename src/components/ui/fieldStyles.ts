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
  "w-full bg-[var(--surface-sunken)] border border-[var(--primary-ink)]/5 rounded-2xl py-3.5 text-sm font-medium transition-all";

// Focus treatment for plain form fields (search input, selects). Kept
// separate from FIELD_CLASSNAME: DatePicker/TimePicker use a different,
// per-instance `themeColor`-driven focus style (a JS-set boxShadow), so
// bundling a fixed focus:ring here would silently fight their theming.
export const FIELD_FOCUS_CLASSNAME =
  "focus:outline-none focus:ring-2 focus:ring-[var(--primary-ink)]/10 focus:bg-white";
