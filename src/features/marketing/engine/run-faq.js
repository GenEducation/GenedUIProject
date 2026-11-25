// The FAQ page: brings the markup from content-faq.js faqHtml() to life. Browser only. runFaq() resolves to a cleanup
// for when the page unmounts.
//   hero: the question mark draws itself and grows its sprout
//   groups: the list beside the questions marks the group you're reading, and its links glide to each group
//   still have questions: "Copy address" puts the email on the clipboard
import { initScroll, revealOnScroll, reduced, htmlState, killScroll } from './scroll.js';
import { registerStepper, sectionStops, topOf } from './stepper.js';

export async function runFaq() {
  const life = { dead: false, undo: [htmlState()] };
  const cleanup = () => { life.dead = true; life.undo.reverse().forEach((f) => f()); killScroll(); };
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const on = (el, type, f) => { el.addEventListener(type, f); life.undo.push(() => el.removeEventListener(type, f)); };
  const tail = document.getElementById('tail');

  const { gsap, ScrollTrigger, lenis, destroy } = initScroll();
  life.undo.push(destroy);
  revealOnScroll(tail);

  /* ---------- the hero's question mark ---------- */
  const grow = $('.fq-grow');
  if (grow) {
    if (reduced) grow.style.setProperty('--p', '1');
    else {
      const p = { v: 0 };
      gsap.to(p, { v: 1, duration: 2.4, delay: .5, ease: 'power1.inOut', onUpdate: () => grow.style.setProperty('--p', p.v.toFixed(3)) });
    }
  }

  /* ---------- the group list ---------- */
  const links = $$('.fq-nav a'), groups = $$('.fq-group');
  const mark = (id) => links.forEach((a) => {
    const here = a.dataset.g === id;
    if (here) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    // on phones the chips scroll sideways: keep the marked one in view
    if (here && a.parentElement.parentElement.scrollWidth > a.parentElement.parentElement.clientWidth) {
      a.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced ? 'auto' : 'smooth' });
    }
  });
  mark(groups[0]?.id);
  groups.forEach((g) => ScrollTrigger.create({ trigger: g, start: 'top 40%', end: 'bottom 40%', onToggle: (st) => st.isActive && mark(g.id) }));
  links.forEach((a) => on(a, 'click', (e) => {
    const target = document.getElementById(a.dataset.g);
    if (!target) return;
    e.preventDefault();
    const offset = -(parseFloat(getComputedStyle(target).scrollMarginTop) || 100);
    if (lenis) lenis.scrollTo(target, { offset });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    mark(a.dataset.g);
    history.replaceState(null, '', `#${a.dataset.g}`);
  }));

  // opening or closing an answer moves everything below it, so the scroll triggers re-measure
  let refreshT = 0;
  const remeasure = () => { clearTimeout(refreshT); refreshT = setTimeout(() => ScrollTrigger.refresh(), 380); };
  $$('.fq-group details').forEach((d) => on(d, 'toggle', remeasure));
  life.undo.push(() => clearTimeout(refreshT));

  /* ---------- copy the address ---------- */
  $$('.fq-copy').forEach((b) => on(b, 'click', async () => {
    const label = b.querySelector('span');
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      b.toggleAttribute('data-done', true); label.textContent = 'Copied!';
    } catch {
      label.textContent = b.dataset.copy;   // no clipboard access: show the address to copy by hand
    }
    setTimeout(() => { b.removeAttribute('data-done'); label.textContent = 'Copy address'; }, 2200);
  }));

  // ↓ / the down button: the hero, each group, then the sections below
  life.undo.push(registerStepper({
    lenis,
    stops: () => [topOf($('.fq-hero')), ...groups.map((g) => topOf(g) - (parseFloat(getComputedStyle(g).scrollMarginTop) || 0)), ...sectionStops(tail).slice(1)],
  }));

  if (life.dead) return cleanup;
  ScrollTrigger.refresh();
  return cleanup;
}
