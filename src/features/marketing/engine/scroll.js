// Ported from render_handoff_v72/prototypes/home/shared/scroll.js (Zoovi website, round 1). Runs in the browser only
// (the marketing pages import it dynamically); design tokens are read from the .zv-site wrapper.
// Shared scroll setup: Lenis smooth scroll driving GSAP ScrollTrigger.
// With prefers-reduced-motion there is no Lenis, no pinning and no scrub; pages read html.rm and lay out statically.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// ?rm in the URL forces the reduced-motion layout, for review.
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('rm');
// Live bindings: crossing the phone breakpoint updates them, and PageRunner restarts the page engine so it rebuilds
// with the other layout.
const phoneQuery = matchMedia('(max-width: 700px)');
export let mobile = phoneQuery.matches;
/** Pick a value per breakpoint. */
export const bp = (desktop, phone) => (mobile ? phone : desktop);

gsap.registerPlugin(ScrollTrigger);
/** ?pillars=speech: the approach section uses comic speech bubbles from the device instead of the orbit ring. */
const wantsSpeech = new URLSearchParams(location.search).get('pillars') === 'speech';
export let speechMode = wantsSpeech && !mobile;
/**
 * Re-read the layout. Engines call this first when they start: PageRunner restarts an engine from its own listener for
 * the breakpoint, which can run before any listener here would, so a listener alone could hand the engine the old layout.
 */
export function readLayout() {
  mobile = phoneQuery.matches;
  speechMode = wantsSpeech && !mobile;
}
/** The html-level state classes the styles read (html.rm, html.speech-mode). Pages call this on mount and the returned undo on unmount. */
export function htmlState() {
  readLayout();
  const html = document.documentElement;
  html.classList.toggle('rm', reduced);
  html.classList.toggle('speech-mode', speechMode);
  return () => html.classList.remove('rm', 'speech-mode');
}

export function initScroll() {
  if (reduced) return { gsap, ScrollTrigger, lenis: null, destroy: killScroll };
  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  const raf = (t) => lenis.raf(t * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  // A reload mid-page should land on the right beat.
  const refresh = () => ScrollTrigger.refresh();
  addEventListener('load', refresh);
  const destroy = () => { removeEventListener('load', refresh); gsap.ticker.remove(raf); gsap.ticker.lagSmoothing(500, 33); lenis.destroy(); killScroll(); };
  return { gsap, ScrollTrigger, lenis, destroy };
}

/** Kill every ScrollTrigger and tween a page made, so the next page (or the app) starts clean. */
export function killScroll() {
  ScrollTrigger.getAll().forEach((t) => t.kill());
  ScrollTrigger.clearScrollMemory?.();
  gsap.globalTimeline.getChildren(true, true, true).forEach((t) => t.kill());
}

/** Scrub the FAQ's growing question (--p 0..1) as its section scrolls in. */
export function growOnScroll(root = document) {
  const el = root.querySelector('.grow');
  if (!el || reduced) return;
  // plays on a clock once the heading is well in view (not tied to scroll speed), and resets when you scroll back above it
  const p = { v: 0 };
  const draw = (to, d) => gsap.to(p, { v: to, duration: d, ease: to ? 'power1.inOut' : 'none', overwrite: true, onUpdate: () => el.style.setProperty('--p', p.v.toFixed(3)) });
  ScrollTrigger.create({ trigger: el, start: 'top 75%', onEnter: () => draw(1, 2.6), onLeaveBack: () => draw(0, .2) });
}

/** Educators: the point nearest the middle of the screen is active and its iPad screen shows; points are also clickable. */
export function eduSteps(root = document) {
  const items = [...root.querySelectorAll('.edu-points li')];
  const panels = [...root.querySelectorAll('.tc-panel')];
  if (!items.length) return;
  const set = (i) => {
    items.forEach((li, k) => { li.classList.toggle('on', k === i); li.querySelector('button').setAttribute('aria-pressed', k === i); });
    panels.forEach((p, k) => p.classList.toggle('on', k === i));
    // the sidebar follows the panel: teacher or partner portal, and which nav item is lit
    const sides = root.querySelector('.tc-sides');
    if (sides && panels[i]) { sides.dataset.portal = panels[i].dataset.portal; sides.dataset.nav = panels[i].dataset.nav; }
  };
  items.forEach((li, i) => li.querySelector('button').addEventListener('click', () => set(i)));
  if (reduced) return;
  items.forEach((li, i) => ScrollTrigger.create({ trigger: li, start: () => (mobile ? 'top 78%' : 'top 60%'), end: () => (mobile ? 'bottom 78%' : 'bottom 60%'), onToggle: (st) => st.isActive && set(i) }));
}

/**
 * A list of steps where one is active: the one crossing a line on screen (default 55% down), or the one clicked.
 * items: <li> elements each holding a <button>; onSet(i) runs when the active step changes.
 */
export function activeSteps(items, onSet, { line = '55%' } = {}) {
  let cur = -1;
  const set = (i) => {
    if (i === cur) return; cur = i;
    items.forEach((li, k) => { li.classList.toggle('on', k === i); li.querySelector('button')?.setAttribute('aria-pressed', k === i); });
    onSet?.(i);
  };
  items.forEach((li, i) => li.querySelector('button')?.addEventListener('click', () => set(i)));
  set(0);
  if (!reduced) items.forEach((li, i) => ScrollTrigger.create({ trigger: li, start: `top ${line}`, end: `bottom ${line}`, onToggle: (st) => st.isActive && set(i) }));
  return set;
}

/** Elements marked [data-reveal] fade up once as they come into view (staggered by --i). Nothing moves with reduced motion. */
export function revealOnScroll(root = document) {
  if (reduced) return;
  const els = [...root.querySelectorAll('[data-reveal]')];
  gsap.set(els, { autoAlpha: 0, y: 28 });
  ScrollTrigger.batch(els, {
    start: 'top 88%', once: true,
    onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: .8, ease: 'power2.out', stagger: .08, overwrite: true }),
  });
}

export { gsap, ScrollTrigger };
