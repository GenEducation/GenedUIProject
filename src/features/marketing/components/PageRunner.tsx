"use client";

import { useEffect } from "react";
import type { SitePage } from "../routes";

type Cleanup = () => void;

// Each page's engine (scroll story, three.js device, frame sequences) is browser-only and heavy, so it is loaded
// after the server-rendered markup is on screen.
const ENGINES: Record<SitePage, () => Promise<Cleanup>> = {
  home: () => import("../engine/run-home.js").then((m) => m.runHome()),
  parents: () => import("../engine/run-parents.js").then((m) => m.runParents()),
  educators: () => import("../engine/run-educators.js").then((m) => m.runEducators()),
};

// Engines take over the whole document (scroll triggers, the page's canvas), so only one runs at a time: a new one
// starts after the previous one has started and been torn down. In development React mounts twice; the first
// mount is unmounted before its turn comes, so it never starts at all.
let queue: Promise<unknown> = Promise.resolve();

/** Brings a marketing page's server-rendered markup to life, and tears its engine down on unmount. */
export function PageRunner({ page }: { page: SitePage }) {
  useEffect(() => {
    let cleanup: Cleanup | null = null;
    let gone = false;
    queue = queue
      .then(() => (gone ? null : ENGINES[page]()))
      .then((c) => {
        if (!c) return;
        if (gone) c();
        else cleanup = c;
      })
      .catch((err) => console.error(`[zoovi] the ${page} page engine failed to start`, err));
    return () => {
      gone = true;
      cleanup?.();
    };
  }, [page]);
  return null;
}
