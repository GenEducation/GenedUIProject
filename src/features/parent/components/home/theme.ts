import React from "react";

/**
 * Parent portal palette, scoped to the portal root so nothing outside it
 * changes. Zoovi's lime-tinted paper surfaces, green ink, a single green for "good".
 */
export const PORTAL_THEME = {
  "--pp-ink": "#1D6315",
  "--pp-ink-soft": "#5A6E52",
  "--pp-green": "#287624",
  "--pp-green-deep": "#22661F",
  "--pp-mint": "#ECF5D8",
  "--pp-mint-strong": "#DDEBC1",
  "--pp-line": "#E9F0D6",
  "--pp-bg": "#F8F9EF",
  "--pp-side": "#F7F8EC",
} as React.CSSProperties;

export const ICON = (name: string) => `/parent-portal/${name}.png`;

/**
 * Frosted-glass surface for the portal's cards: translucent white over the
 * colour blobs behind the content, a bright top edge, a soft shadow.
 */
export const GLASS =
  "border border-white/70 bg-white/55 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_30px_-18px_rgba(29,72,21,0.28)]";

/** Hover: a small lift and a deeper shadow. Big panels lift less. */
export const LIFT =
  "transition-[transform,box-shadow] duration-300 ease-out motion-safe:hover:-translate-y-1 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_24px_48px_-22px_rgba(29,72,21,0.38)]";
export const LIFT_SOFT =
  "transition-[transform,box-shadow] duration-300 ease-out motion-safe:hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_22px_44px_-24px_rgba(29,72,21,0.32)]";

/** A sidebar nav row; the switcher renders its own row with the same look. */
export const NAV_ROW =
  "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-[var(--pp-ink)] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pp-green)]";
export const NAV_ROW_ACTIVE = "bg-[var(--pp-mint-strong)]/70 font-semibold hover:bg-[var(--pp-mint-strong)]/70";

export { MaskIcon } from "@/components/report-card/MaskIcon";
