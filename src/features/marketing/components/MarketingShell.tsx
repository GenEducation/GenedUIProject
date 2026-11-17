"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { safeRedirect, withRedirect } from "@/features/auth/usePostAuthRedirect";
import { footer } from "../content/home";
import { marketingFontVars } from "../fonts";
import { useReveal } from "../hooks";
import { CtaButton } from "./CtaButton";
import { ZooviLogo } from "./ZooviLogo";
import "../marketing.css";

const NAV = [
  { label: "Home", href: "/" },
  { label: "How Zoovi Works", href: "/how-zoovi-works" },
  { label: "For Parents", href: "/#parents" },
  { label: "For Educators", href: "/#educators" },
  { label: "FAQs", href: "#faqs" },
];

/** Nav, paper ground, footer and scroll reveals shared by the Zoovi marketing pages. */
export function MarketingShell({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useReveal(root);

  // AuthGuard sends a signed-out visitor here with `?redirect=<where they were going>` (a parent's invitation
  // link, say); Log in carries it on. Read after hydration only, so server and first client render agree.
  const authRedirect = hydrated ? safeRedirect(new URLSearchParams(window.location.search).get("redirect")) : null;
  const loginHref = withRedirect("/login", authRedirect);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Smooth in-page scrolling while these pages are mounted.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = "smooth";
    return () => {
      html.style.scrollBehavior = prev;
    };
  }, []);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : href === pathname);
  const close = () => setMenuOpen(false);

  return (
    <div ref={root} className={`zv ${marketingFontVars}`}>
      <a className="zv-skip" href="#main">Skip to content</a>
      <header className={`zv-nav${scrolled ? " is-scrolled" : ""}${menuOpen ? " is-menu" : ""}`}>
        <div className="zv-wrap zv-nav__bar">
          <Link href="/" className="zv-nav__logo" aria-label="Zoovi home">
            <ZooviLogo height={32} priority />
          </Link>
          <nav className="zv-nav__links" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.label} href={n.href} className={isActive(n.href) ? "is-active" : undefined} aria-current={isActive(n.href) ? "page" : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="zv-nav__actions">
            <Link className="zv-nav__login" href={loginHref}>Log in</Link>
            <CtaButton variant="primary">Get an Invite</CtaButton>
            {/* eslint-disable-next-line no-restricted-syntax -- the Zoovi marketing pages carry their own paper-and-ink button styles, not the app's */}
            <button
              type="button"
              className={`zv-burger${menuOpen ? " is-open" : ""}`}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="zv-drawer"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <div id="zv-drawer" className={`zv-drawer${menuOpen ? " is-open" : ""}`} aria-hidden={!menuOpen}>
        <nav aria-label="Mobile">
          {NAV.map((n, i) => (
            <Link key={n.label} href={n.href} onClick={close} tabIndex={menuOpen ? 0 : -1} style={{ ["--i" as string]: i }}>
              {n.label}
            </Link>
          ))}
          <Link href={loginHref} onClick={close} tabIndex={menuOpen ? 0 : -1} style={{ ["--i" as string]: NAV.length }}>
            Log in
          </Link>
        </nav>
      </div>

      <main id="main">{children}</main>

      <footer className="zv-footer">
        <div className="zv-wrap">
          <div className="zv-footer__top">
            <div className="zv-footer__brand">
              <ZooviLogo height={44} />
              <p className="zv-footer__tagline">{footer.tagline}</p>
            </div>
            <nav className="zv-footer__col" aria-label="Footer">
              <Link href="/">Home</Link>
              <Link href="/how-zoovi-works">How Zoovi Works</Link>
              <Link href="/#parents">For Parent</Link>
              <Link href="/#educators">For Educators</Link>
            </nav>
            <div className="zv-footer__col">
              <span>About</span>
              <span>Contact</span>
            </div>
          </div>
          <p className="zv-footer__base">{footer.attribution}</p>
        </div>
      </footer>
    </div>
  );
}
