"use client";

import React from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "destructive"
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
    "--btn-bg": "var(--primary)",
    "--btn-bg-hover": "var(--primary-hover)",
    "--btn-bg-active": "var(--primary-active)",
    "--btn-fg": "#FFFFFF",
    "--btn-border": "transparent",
    "--btn-ring": "var(--primary-ring)",
  },
  secondary: {
    "--btn-bg": "transparent",
    "--btn-bg-hover": "var(--primary-soft)",
    "--btn-bg-active": "rgba(5,159,109,0.14)",
    "--btn-fg": "var(--primary)",
    "--btn-border": "var(--primary)",
    "--btn-ring": "var(--primary-ring)",
  },
  tertiary: {
    "--btn-bg": "transparent",
    "--btn-bg-hover": "var(--btn-neutral-hover)",
    "--btn-bg-active": "rgba(4,46,92,0.09)",
    "--btn-fg": "var(--primary-ink)",
    "--btn-border": "transparent",
    "--btn-ring": "var(--primary-ring)",
  },
  destructive: {
    "--btn-bg": "var(--danger-2-soft)",
    "--btn-bg-hover": "rgba(232,99,90,0.16)",
    "--btn-bg-active": "rgba(232,99,90,0.22)",
    "--btn-fg": "var(--danger-2)",
    "--btn-border": "var(--danger-2-border)",
    "--btn-ring": "rgba(232,99,90,0.35)",
  },
  destructiveSolid: {
    "--btn-bg": "var(--danger-2)",
    "--btn-bg-hover": "var(--danger-2-hover)",
    "--btn-bg-active": "var(--danger-2-active)",
    "--btn-fg": "#FFFFFF",
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
    "--btn-fg": "#F8A9A2",
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
  "disabled:cursor-not-allowed disabled:opacity-[var(--btn-disabled-opacity)]",
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

function Spinner({ size }: { size: number }) {
  return (
    <span
      aria-hidden
      className="absolute animate-spin rounded-full border-2 border-current border-r-transparent"
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
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-variant={variant}
      className={`${BASE_CLASS} ${fullWidth ? "w-full" : ""} ${className ?? ""}`}
      style={{
        fontFamily: "var(--font-body)",
        borderRadius: pill ? "var(--radius-pill)" : "var(--radius-control)",
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
