import type React from "react";

/**
 * Former per-area button fills (lab/partner forest green, parent green).
 * The Deep Ocean + Citron rebrand put every area on the shared --primary, so
 * these are now empty and buttons inherit the brand. Kept so existing
 * `style={LEGACY_*}` call sites keep compiling; `grep LEGACY_` to remove them.
 */

type Surface = React.CSSProperties;

export const LEGACY_FOREST_BUTTON = {} as Surface;

export const LEGACY_PARENT_BUTTON = {} as Surface;
