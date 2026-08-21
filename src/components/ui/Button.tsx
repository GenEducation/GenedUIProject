"use client";

import React from "react";
import { STUDENT_COLORS } from "@/features/student/theme/colors";

/**
 * `var(--token, literal)` with the literal always supplied.
 *
 * During dev HMR and streamed route CSS a route can render before the global
 * token stylesheet arrives. An unresolved `var()` makes the whole declaration
 * invalid, which on a primary CTA means white text on a white card — an
 * apparently empty button. Commit a522018 fixed this; 7d9cddd reverted it by
 * accident while doing unrelated lab work. Do not drop these fallbacks again.
 */
const t = (token: string, fallback: string) => `var(${token}, ${fallback})`;

/**
 * Literal values mirroring src/app/globals.css. Keep in sync with that file.
 *
 * The repo's hex guard is disabled for this block specifically. The rule exists
 * to stop files re-growing local hex palettes *instead of* tokens; these are the
 * opposite — the literal last-resort values for the tokens themselves, which by
 * definition cannot be expressed as `var()`. Every one is paired with its token
 * through `t()` below; none is used on its own.
 */
/* eslint-disable no-restricted-syntax -- documented token fallbacks, see above */
const FALLBACK = {
  primary: STUDENT_COLORS.primary, // #059F6D
  primaryHover: "#04835a",
  primaryActive: "#036c4a",
  primarySoft: "rgba(5,159,109,0.08)",
  primaryRing: "rgba(5,159,109,0.35)",
  primaryInk: "#042E5C",
  neutralHover: "rgba(4,46,92,0.05)",
  neutralBorder: "rgba(4,46,92,0.12)",
  danger: STUDENT_COLORS.danger, // #E8635A
  dangerHover: "#d9524a",
  dangerActive: "#c2453e",
  dangerSoft: "rgba(232,99,90,0.08)",
  dangerBorder: "rgba(232,99,90,0.2)",
  dangerOnDark: "#F8A9A2",
} as const;
/* eslint-enable no-restricted-syntax */

export type ButtonVariant =
  /** Solid brand fill. The one main action per view. */
  | "primary"
  /** Brand-coloured outline. A deliberate alternative to the primary action. */
  | "secondary"
  /** Neutral hairline outline. Cancel/Back beside a primary — the audit's
   *  single largest pattern (~45 sites) and the reason this variant exists
   *  separately from `secondary`, which pulls brand colour it should not. */
  | "outline"
  /** No border, no fill. Toolbars, pagination, low-emphasis text actions. */
  | "tertiary"
  /** Soft red wash. Delete/Revoke in lists, where a solid red would shout. */
  | "destructive"
  /** Solid red. The final confirm in a delete dialog. */
  | "destructiveSolid";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonTone = "light" | "onDark";

/**
 * Per-variant color surface, expressed as CSS custom properties consumed by
 * the single shared class list below. Doing it this way (rather than a
 * per-variant Tailwind string) keeps hover/active/focus in CSS — the old
 * inline-style version had no hover state at all, which is why every call
 * site hand-rolled its own.
 */
type Surface = React.CSSProperties & Record<string, string>;

const VARIANT_SURFACE: Record<ButtonVariant, Surface> = {
  primary: {
    "--btn-bg": t("--primary", FALLBACK.primary),
    "--btn-bg-hover": t("--primary-hover", FALLBACK.primaryHover),
    "--btn-bg-active": t("--primary-active", FALLBACK.primaryActive),
    "--btn-fg": STUDENT_COLORS.card,
    "--btn-border": "transparent",
    "--btn-ring": t("--primary-ring", FALLBACK.primaryRing),
  },
  secondary: {
    "--btn-bg": "transparent",
    "--btn-bg-hover": t("--primary-soft", FALLBACK.primarySoft),
    "--btn-bg-active": "rgba(5,159,109,0.14)",
    "--btn-fg": t("--primary", FALLBACK.primary),
    "--btn-border": t("--primary", FALLBACK.primary),
    "--btn-ring": t("--primary-ring", FALLBACK.primaryRing),
  },
  outline: {
    "--btn-bg": "transparent",
    "--btn-bg-hover": t("--btn-neutral-hover", FALLBACK.neutralHover),
    "--btn-bg-active": "rgba(4,46,92,0.09)",
    "--btn-fg": t("--primary-ink", FALLBACK.primaryInk),
    "--btn-border": t("--btn-neutral-border", FALLBACK.neutralBorder),
    "--btn-ring": t("--primary-ring", FALLBACK.primaryRing),
  },
  tertiary: {
    "--btn-bg": "transparent",
    "--btn-bg-hover": t("--btn-neutral-hover", FALLBACK.neutralHover),
    "--btn-bg-active": "rgba(4,46,92,0.09)",
    "--btn-fg": t("--primary-ink", FALLBACK.primaryInk),
    "--btn-border": "transparent",
    "--btn-ring": t("--primary-ring", FALLBACK.primaryRing),
  },
  destructive: {
    "--btn-bg": t("--danger-2-soft", FALLBACK.dangerSoft),
    "--btn-bg-hover": "rgba(232,99,90,0.16)",
    "--btn-bg-active": "rgba(232,99,90,0.22)",
    "--btn-fg": t("--danger-2", FALLBACK.danger),
    "--btn-border": t("--danger-2-border", FALLBACK.dangerBorder),
    "--btn-ring": "rgba(232,99,90,0.35)",
  },
  destructiveSolid: {
    "--btn-bg": t("--danger-2", FALLBACK.danger),
    "--btn-bg-hover": t("--danger-2-hover", FALLBACK.dangerHover),
    "--btn-bg-active": t("--danger-2-active", FALLBACK.dangerActive),
    "--btn-fg": STUDENT_COLORS.card,
    "--btn-border": "transparent",
    "--btn-ring": "rgba(232,99,90,0.35)",
  },
};

/**
 * Admin/partner shells render on a dark ground where `--primary-ink` text and
 * the navy hairline border disappear. Only the non-solid variants need to
 * change; primary emerald reads correctly on both.
 */
const ON_DARK_SURFACE: Partial<Record<ButtonVariant, Surface>> = {
  outline: {
    "--btn-fg": "rgba(255,255,255,0.8)",
    "--btn-border": "rgba(255,255,255,0.15)",
    "--btn-bg-hover": "rgba(255,255,255,0.08)",
    "--btn-bg-active": "rgba(255,255,255,0.14)",
    "--btn-ring": "rgba(255,255,255,0.5)",
  },
  secondary: {
    "--btn-fg": "rgba(255,255,255,0.85)",
    "--btn-border": "rgba(255,255,255,0.18)",
    "--btn-bg-hover": "rgba(255,255,255,0.08)",
    "--btn-bg-active": "rgba(255,255,255,0.14)",
    "--btn-ring": "rgba(255,255,255,0.5)",
  },
  tertiary: {
    "--btn-fg": "rgba(255,255,255,0.6)",
    "--btn-bg-hover": "rgba(255,255,255,0.08)",
    "--btn-bg-active": "rgba(255,255,255,0.14)",
    "--btn-ring": "rgba(255,255,255,0.5)",
  },
  destructive: {
    "--btn-fg": t("--danger-2-on-dark", FALLBACK.dangerOnDark),
    "--btn-border": "rgba(232,99,90,0.3)",
    "--btn-ring": "rgba(248,169,162,0.5)",
  },
};

/** Text sizes/padding collapsed from the 20+ ad-hoc px/py combos in the audit. */
const SIZE_STYLES: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: "6px 12px", fontSize: 12, lineHeight: "16px", gap: 6 },
  md: { padding: "9px 16px", fontSize: 13.5, lineHeight: "20px", gap: 8 },
  lg: { padding: "12px 20px", fontSize: 15, lineHeight: "22px", gap: 8 },
};

/** Square footprint for icon-only buttons, so they line up with text buttons. */
const ICON_ONLY_STYLES: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: 0, width: 28, height: 28, fontSize: 12 },
  md: { padding: 0, width: 36, height: 36, fontSize: 13.5 },
  lg: { padding: 0, width: 44, height: 44, fontSize: 15 },
};

const SPINNER_SIZE: Record<ButtonSize, number> = { sm: 12, md: 14, lg: 16 };

const BASE_CLASS = [
  "relative inline-flex items-center justify-center whitespace-nowrap font-semibold",
  "select-none cursor-pointer",
  "bg-[var(--btn-bg)] text-[var(--btn-fg)] border-[1.5px] border-solid border-[var(--btn-border)]",
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out",
  "enabled:hover:bg-[var(--btn-bg-hover)]",
  "enabled:active:bg-[var(--btn-bg-active)] enabled:active:scale-[0.98]",
  // Focus uses `outline`, not `ring`. A ring is a box-shadow, which gets
  // clipped by the `overflow-hidden` cards and scroll containers many of
  // these buttons sit inside; an outline is never clipped and costs no layout.
  // Note: do NOT add `outline-none`/`focus:outline-none` here — in Tailwind v4
  // those set `--tw-outline-style: none`, which the `outline-2` utility then
  // reads, leaving the focus ring 2px wide but styleless (i.e. invisible).
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--btn-ring)]",
  "disabled:cursor-not-allowed disabled:opacity-[var(--btn-disabled-opacity,0.45)]",
].join(" ");

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Use on dark shells (admin/partner surfaces, dark sidebars). */
  tone?: ButtonTone;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
  /** Pill radius instead of `--radius-control`; for chips and filter toggles. */
  pill?: boolean;
  /** Square footprint. `aria-label` is required — enforce it at the call site. */
  iconOnly?: boolean;
  /**
   * Swaps the label for a spinner and disables the button. The label stays in
   * the DOM (hidden) so the button does not change width mid-submit — the
   * `{saving ? "Saving…" : "Save"}` pattern the audit found does jump.
   */
  loading?: boolean;
}

/**
 * Uses `.btn-spinner` (globals.css) rather than Tailwind's `animate-spin`.
 * Several tests assert on `.animate-spin` to detect a *page's* own loading
 * state — e.g. ConnectionQualityBanner.test.tsx expects none — and a Button
 * placed in those trees would otherwise satisfy that selector and flip the
 * assertion. Keeping our spinner on its own class makes that impossible.
 */
function Spinner({ size }: { size: number }) {
  return (
    <span
      aria-hidden
      data-button-spinner
      className="btn-spinner absolute rounded-full border-2 border-current border-r-transparent"
      style={{ width: size, height: size, opacity: 0.9 }}
    />
  );
}

/**
 * The app's single button. Every clickable action — CTA, toolbar icon, modal
 * footer, destructive confirm — should render through this rather than a bare
 * `<button className="...">`. Subject/accent colors may tint icons, progress
 * bars, and card headers elsewhere, but never a button fill; use
 * `variant="primary"` for that everywhere.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    tone = "light",
    leadingIcon,
    trailingIcon,
    fullWidth,
    pill,
    iconOnly,
    loading = false,
    style,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref
) {
  const surface: Surface = {
    ...VARIANT_SURFACE[variant],
    ...(tone === "onDark" ? ON_DARK_SURFACE[variant] : null),
  };

  return (
    // eslint-disable-next-line no-restricted-syntax -- this IS the shared Button
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-variant={variant}
      className={`${BASE_CLASS} ${fullWidth ? "w-full" : ""} ${className ?? ""}`}
      style={{
        fontFamily: t("--font-body", "ui-sans-serif, system-ui"),
        borderRadius: pill
          ? t("--radius-pill", "999px")
          : t("--radius-control", "10px"),
        ...surface,
        ...SIZE_STYLES[size],
        ...(iconOnly ? ICON_ONLY_STYLES[size] : null),
        ...style,
      }}
      {...rest}
    >
      {loading && <Spinner size={SPINNER_SIZE[size]} />}
      <span
        className="inline-flex items-center justify-center"
        // `opacity: 0` rather than `visibility: hidden`: both reserve the
        // width, but visibility:hidden also drops the text from the
        // accessibility tree, leaving a loading button with no accessible
        // name (screen readers announce a bare "busy, button").
        style={{ gap: "inherit", opacity: loading ? 0 : undefined }}
      >
        {leadingIcon}
        {children}
        {trailingIcon}
      </span>
    </button>
  );
});
