import type React from "react";

/**
 * TEMPORARY — surface overrides that keep off-brand button fills looking
 * exactly as they did before the Button migration.
 *
 * The app accumulated three "brand" greens for the same action:
 *   --primary  #059F6D  the actual brand token (student, admin, auth)
 *   #1A3D2C             lab + partner
 *   #1a3a2a             parent, and leaking into analytics + student
 *
 * The last two are drift, not deliberate area theming: neither area has a
 * palette module, `#1a3a2a` appears well outside parent, and both
 * `analytics-ui-audit.md` and `auth-ui-audit.md` already flag them as
 * off-brand. Crucially they are used far more as *ink* (161 and 107 text
 * usages) than as button fills (~21 and ~17), so recolouring buttons alone
 * would leave green headings beside emerald CTAs.
 *
 * So the button migration preserves these fills rather than silently
 * restyling five feature areas. When the ink-first colour pass happens,
 * delete this file and drop the `style` prop at each call site — `grep` for
 * `LEGACY_` to find every one.
 */

type Surface = React.CSSProperties;

/** Lab + partner. Hover/active mirror the hand-rolled `hover:bg-[#0f2a1d]`. */
export const LEGACY_FOREST_BUTTON = {
  "--btn-bg": "#1A3D2C",
  "--btn-bg-hover": "#0f2a1d",
  "--btn-bg-active": "#0a1f15",
} as unknown as Surface;

/** Parent, plus the analytics and student components it leaked into. */
export const LEGACY_PARENT_BUTTON = {
  "--btn-bg": "#1a3a2a",
  "--btn-bg-hover": "#122b1e",
  "--btn-bg-active": "#0d2116",
} as unknown as Surface;
