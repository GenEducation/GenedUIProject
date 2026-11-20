"use client";

import { useLayoutEffect } from "react";
import { SKIP_INTRO_KEY } from "../routes";

/**
 * The Zoovi intro (the logo whose dot grows into the device) on its own switch. It plays when the visitor comes home
 * through the logo or from outside; the nav's Home link turns it off. The choice is made before the home page is
 * first painted and written on the wrapper as data-intro="play" | "skip": with "skip" the intro is never drawn
 * (styles/site.css) and the story engine starts on the hero (engine/run-home.js).
 */
export function HomeIntro() {
  useLayoutEffect(() => {
    const site = document.querySelector<HTMLElement>(".zv-site");
    // decided once per page load (React may run this twice in development; the flag is already gone the second time)
    if (!site || site.dataset.intro) return;
    let skip = false;
    try {
      skip = sessionStorage.getItem(SKIP_INTRO_KEY) === "1";
      sessionStorage.removeItem(SKIP_INTRO_KEY);
    } catch {
      // storage blocked: the intro plays
    }
    site.dataset.intro = skip ? "skip" : "play";
  }, []);
  return null;
}
