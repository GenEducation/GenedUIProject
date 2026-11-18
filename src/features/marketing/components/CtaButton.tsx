import Link from "next/link";
import type { ReactNode } from "react";

interface CtaButtonProps {
  children: ReactNode;
  /** Where it goes. Left out, it renders as a plain button with nowhere to go yet. */
  href?: string;
  variant?: "primary" | "ghost" | "sun" | "light";
  arrow?: boolean;
  className?: string;
}

function Arrow() {
  return (
    <svg className="zv-btn__arrow" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** A Zoovi call to action. A folded-paper corner flips over on hover, like the logo's letters. */
export function CtaButton({ children, href, variant = "primary", arrow = false, className }: CtaButtonProps) {
  const cls = `zv-btn zv-btn--${variant}${className ? ` ${className}` : ""}`;
  const inner = (
    <>
      <span className="zv-btn__label">{children}</span>
      {arrow && <Arrow />}
    </>
  );
  // An email link: a plain anchor, handed to the visitor's mail app.
  if (href?.startsWith("mailto:")) {
    return (
      <a className={cls} href={href}>
        {inner}
      </a>
    );
  }
  if (href) {
    return (
      <Link className={cls} href={href}>
        {inner}
      </Link>
    );
  }
  return (
    // eslint-disable-next-line no-restricted-syntax -- the Zoovi marketing pages carry their own paper-and-ink button styles, not the app's
    <button type="button" className={cls}>
      {inner}
    </button>
  );
}
