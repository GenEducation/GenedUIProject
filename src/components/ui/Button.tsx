"use client";

import React from "react";
import { STUDENT_COLORS } from "@/features/student/theme/colors";

type Variant = "primary" | "secondary" | "tertiary" | "destructive";
type Size = "sm" | "md" | "lg";

const VARIANT_STYLES: Record<Variant, React.CSSProperties> = {
  primary: {
    // Keep the CTA visible even if a route is briefly rendered before the global
    // token stylesheet arrives (dev HMR and streamed route CSS can expose that gap).
    // Without the fallback the declaration is invalid while the text stays white,
    // producing an apparently empty button on a white card.
    background: `var(--primary, ${STUDENT_COLORS.primary})`,
    color: STUDENT_COLORS.card,
    border: "1.5px solid transparent",
  },
  secondary: {
    background: "transparent",
    color: `var(--primary, ${STUDENT_COLORS.primary})`,
    border: `1.5px solid var(--primary, ${STUDENT_COLORS.primary})`,
  },
  tertiary: {
    background: "transparent",
    color: "var(--primary-ink)",
    border: "1.5px solid transparent",
  },
  destructive: {
    background: "rgba(232,99,90,0.08)",
    color: STUDENT_COLORS.danger,
    border: "1px solid rgba(232,99,90,0.15)",
  },
};

const SIZE_STYLES: Record<Size, React.CSSProperties> = {
  sm: { padding: "6px 12px", fontSize: 12, borderRadius: "var(--radius-control, 10px)" },
  md: { padding: "9px 16px", fontSize: 13.5, borderRadius: "var(--radius-control, 10px)" },
  lg: { padding: "12px 20px", fontSize: 15, borderRadius: "var(--radius-control, 10px)" },
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * The app's single CTA component. Before this, every button was styled
 * inline per call site — the same "Voice" action rendered as a blue pill on
 * one subject and a green pill on another. Subject/accent colors may tint
 * icons, progress bars, and card headers elsewhere, but never a primary
 * button fill — use `variant="primary"` for that everywhere.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", leadingIcon, trailingIcon, fullWidth, style, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 cursor-pointer font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed ${fullWidth ? "w-full" : ""} ${className ?? ""}`}
      style={{
        fontFamily: "var(--font-body)",
        outlineColor: `var(--primary, ${STUDENT_COLORS.primary})`,
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        ...style,
      }}
      {...rest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
});
