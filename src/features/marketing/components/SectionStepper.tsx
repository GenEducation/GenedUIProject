"use client";

import { useEffect, useState } from "react";
import { bindStepperKeys, step, stepperState, subscribeStepper } from "../engine/stepper.js";

/**
 * The marketing pages' "next" control: a round down button at the foot of the screen that moves the page on one
 * step (the next beat of a scroll story, or the next section), and the same on the ↓ key (↑ goes back). It hides
 * until the page's engine has registered its steps and, on the home page, until the intro has played; and once
 * the last step is reached.
 */
export function SectionStepper() {
  const [state, setState] = useState({ ready: false, hasNext: false });

  useEffect(() => {
    const sync = () => {
      const s = stepperState();
      setState((prev) => (prev.ready === s.ready && prev.hasNext === s.hasNext ? prev : { ready: s.ready, hasNext: s.hasNext }));
    };
    const unsub = subscribeStepper(sync);
    const unbind = bindStepperKeys();
    // the home intro unlocks without a scroll; check now and then until something else wakes us
    const poll = setInterval(sync, 500);
    sync();
    return () => {
      unsub();
      unbind();
      clearInterval(poll);
    };
  }, []);

  const shown = state.ready && state.hasNext;
  return (
    // eslint-disable-next-line no-restricted-syntax -- a bespoke floating control on the marketing site, styled by site.css
    <button
      type="button"
      className="zv-stepper"
      data-shown={shown ? "" : undefined}
      aria-hidden={!shown}
      tabIndex={shown ? 0 : -1}
      aria-label="Next section"
      title="Next section (↓)"
      onClick={() => step(1)}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M6 9.5l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
