// Keyboard and button stepping for the marketing pages: ↓ (or the down button) moves to the next step of the page,
// ↑ to the previous one. A "step" is a point where something is fully on screen: each beat of a pinned scroll story
// (a time on its scrubbed timeline, mapped to the scroll position that shows it) and the top of each section below.
//
// Each page engine registers how to compute its steps (positions move on resize, so they are read on every press) and
// the Lenis instance that owns the scroll. The down button (components/SectionStepper.tsx) subscribes to know whether
// there is a next step, and whether the page is ready to be stepped through yet (the home intro locks it).
// No browser globals at module level: the button imports this file on the server too.

let current = null;          // { stops: () => number[], lenis, ready: () => boolean }
const listeners = new Set();
const TOL = 8;               // px: "already here"
let gliding = null;          // the target of a step in flight, so repeated presses go on from it, not from scrollY

const notify = () => listeners.forEach((f) => f());

/** A page engine hands over its steps. Returns the undo for its cleanup. */
export function registerStepper({ stops, lenis = null, ready = () => true }) {
  const mine = { stops, lenis, ready };
  current = mine;
  const onScroll = () => notify();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  notify();
  return () => {
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', onScroll);
    if (current === mine) current = null;
    gliding = null;
    notify();
  };
}

export function subscribeStepper(f) {
  listeners.add(f);
  return () => listeners.delete(f);
}

function positions() {
  if (!current) return [];
  const max = document.documentElement.scrollHeight - innerHeight;
  const ys = current.stops()
    .filter((y) => Number.isFinite(y))
    .map((y) => Math.max(0, Math.min(max, Math.round(y))))
    .sort((a, b) => a - b);
  // two steps closer than a few pixels are one step
  return ys.filter((y, i) => i === 0 || y - ys[i - 1] > TOL * 2);
}

function from() {
  return gliding ?? scrollY;
}

export function stepperState() {
  if (!current || !current.ready()) return { ready: false, hasNext: false, hasPrev: false };
  const ys = positions(), y = from();
  return { ready: true, hasNext: ys.some((s) => s > y + TOL), hasPrev: ys.some((s) => s < y - TOL) };
}

/** Move one step: +1 down, -1 up. Returns whether it moved. */
export function step(dir) {
  if (!current || !current.ready()) return false;
  const ys = positions(), y = from();
  const to = dir > 0 ? ys.find((s) => s > y + TOL) : [...ys].reverse().find((s) => s < y - TOL);
  if (to === undefined) return false;
  gliding = to;
  const done = () => { if (gliding === to) gliding = null; notify(); };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (current.lenis) {
    current.lenis.scrollTo(to, { duration: 0.9, easing: (x) => 1 - (1 - x) ** 3, force: true, onComplete: done });
    // if the visitor takes over mid-glide, Lenis drops this scroll without calling onComplete
    setTimeout(done, 1300);
  } else {
    window.scrollTo({ top: to, behavior: reduced ? 'auto' : 'smooth' });
    setTimeout(done, reduced ? 50 : 900);
  }
  notify();
  return true;
}

// ---- helpers the engines build their steps from -------------------------------------------------------------------

/** Absolute top of an element on the page. */
export const topOf = (el) => (el ? el.getBoundingClientRect().top + scrollY : NaN);

/** Scroll positions of times `ts` on a ScrollTrigger-scrubbed timeline spanning `from`..`to` of it. */
export function timelineStops(st, ts, { from = 0, to }) {
  if (!st) return [];
  return ts.map((t) => st.start + (st.end - st.start) * ((t - from) / (to - from)));
}

/** The top of each top-level section (and the footer) in `root`, e.g. the page's tail below its stories. */
export function sectionStops(root) {
  if (!root) return [];
  return [...root.querySelectorAll('section, footer')]
    .filter((el) => !el.parentElement.closest('section, footer') && el.offsetHeight > 0)
    .map(topOf);
}

/** Wire ↓ / ↑ for the whole document. Typing, open menus and dialogs keep their keys. Returns the undo. */
export function bindStepperKeys() {
  const onKey = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const t = e.target;
    if (t instanceof Element && t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role=dialog], [role=menu], [role=listbox], [role=slider], details[open] summary ~ *')) return;
    if (document.querySelector('[role=dialog][aria-modal="true"], dialog[open]')) return;
    if (step(e.key === 'ArrowDown' ? 1 : -1)) e.preventDefault();
  };
  addEventListener('keydown', onKey);
  return () => removeEventListener('keydown', onKey);
}
