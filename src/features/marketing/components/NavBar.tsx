"use client";

import { useEffect, useRef } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { safeRedirect, withRedirect } from "@/features/auth/usePostAuthRedirect";
import { EDUCATOR_INVITE_HREF, INVITE_HREF, ROUTES, SKIP_INTRO_KEY, type SitePage } from "../routes";

function Arrow() {
  return (
    <svg className="arrow" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/**
 * The marketing pages' top nav (navBar() in the prototypes' content.js): logo, Home, For Parents, For Educators,
 * About, FAQs, Log in, Get an Invite. The logo goes home through the Zoovi loader; the Home link goes straight to the hero.
 * It picks up a paper ground once the page scrolls. Its classes are set by hand, never by React, because the
 * Home story hides it (.hidden) until the opening loader has played.
 *
 * Links are plain anchors on purpose: each marketing page runs its own scroll and WebGL engines, and a full page
 * load between them (and out to the app) starts every page clean.
 */
export function NavBar({ current }: { current: SitePage }) {
  const ref = useRef<HTMLElement>(null);
  const hydrated = useHydrated();
  // AuthGuard sends a signed-out visitor here with `?redirect=<where they were going>` (a parent's invitation link,
  // say); Log in carries it on. Read after hydration only, so server and first client render agree.
  const authRedirect = hydrated ? safeRedirect(new URLSearchParams(window.location.search).get("redirect")) : null;
  const loginHref = withRedirect("/login", authRedirect);

  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const on = () => nav.classList.toggle("scrolled", window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const here = (page: SitePage) => (current === page ? ({ "aria-current": "page" } as const) : {});
  const skipIntro = () => {
    try {
      sessionStorage.setItem(SKIP_INTRO_KEY, "1");
    } catch {
      // storage blocked: the home page simply plays its loader
    }
  };
  return (
    <header ref={ref} className="nav" data-current={current}>
      <a className="nav-logo" href={ROUTES.home} aria-label="Zoovi home">
        {/* eslint-disable-next-line @next/next/no-img-element -- the prototype's own sizing; next/image adds a wrapper */}
        <img src="/zoovi/zoovi-logo.png" alt="Zoovi" width={1063} height={365} />
      </a>
      <nav className="nav-pages" aria-label="Pages">
        <a className="nav-page" href={ROUTES.home} onClick={skipIntro} {...here("home")}>
          Home
        </a>
        <a className="nav-page" href={ROUTES.parents} {...here("parents")}>
          <span className="nav-for">For </span>Parents
        </a>
        <a className="nav-page" href={ROUTES.educators} {...here("educators")}>
          <span className="nav-for">For </span>Educators
        </a>
        <a className="nav-page" href={ROUTES.about} {...here("about")}>
          About
        </a>
        {/* hidden on the narrowest phones (site.css), where the footer and the invite forms still link to it */}
        <a className="nav-page nav-faq" href={ROUTES.faq} {...here("faq")}>
          FAQs
        </a>
      </nav>
      <nav className="nav-links" aria-label="Account">
        <a className="pill ghost nav-login" href={loginHref}>
          <span>Log in</span>
        </a>
        <a className="pill nav-cta" href={current === "educators" ? EDUCATOR_INVITE_HREF : INVITE_HREF}>
          <span>Get an Invite</span>
          <Arrow />
        </a>
      </nav>
    </header>
  );
}
