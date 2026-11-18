"use client";

import { useEffect, useState, type RefObject } from "react";

/** Adds `.in` to every `.zv-reveal` under `root` as it scrolls into view (once). */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const targets = el.querySelectorAll<HTMLElement>(".zv-reveal:not(.in)");
    if (typeof IntersectionObserver === "undefined") {
      targets.forEach((t) => t.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [root]);
}

/**
 * Writes how far `ref`'s element has travelled through the viewport into the
 * CSS custom property `--p` (0 as its top meets the bottom of the screen, 1 as
 * its bottom leaves the top) — scroll-driven drawings read it without React
 * re-rendering on every frame.
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      el.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref]);
}

/**
 * Index of the last step (`[data-step]` under `root`) whose top has passed the middle of the screen, so a step stays
 * active until the next one takes over — including through the reading room left after the last step. Read from
 * scroll position directly, which holds up on fast flicks where an IntersectionObserver can miss a crossing.
 */
export function useActiveStep(root: RefObject<HTMLElement | null>, count: number) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const steps = Array.from(el.querySelectorAll<HTMLElement>("[data-step]"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.55;
      let next = 0;
      steps.forEach((s, i) => {
        if (s.getBoundingClientRect().top <= line) next = i;
      });
      setActive(next);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [root, count]);
  return active;
}
