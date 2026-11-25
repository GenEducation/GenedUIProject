// The About page: brings the markup from pages.js aboutHtml() to life. Browser only. runAbout() resolves to a cleanup
// for when the page unmounts.
//   hero: the 3D "About us" letters (about-hero.js); they part and float up as the hero scrolls away
//   problem: the three paths draw themselves beside the fixed track, and each point lights up as its path arrives
//   vision: the yellow highlighter sweeps "I don't understand" and the hand-written note writes itself in
import { createAboutHero } from './about-hero.js';
import { initScroll, revealOnScroll, reduced, htmlState, killScroll } from './scroll.js';
import { registerStepper, sectionStops, topOf } from './stepper.js';

export async function runAbout() {
  const life = { dead: false, undo: [htmlState()] };
  const cleanup = () => { life.dead = true; life.undo.reverse().forEach((f) => f()); killScroll(); };
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const tail = document.getElementById('tail');

  const { gsap, ScrollTrigger, lenis, destroy } = initScroll();
  life.undo.push(destroy);
  revealOnScroll(tail);

  // "Meet the team" in the hero glides to the founders
  const toTeam = (e) => { e.preventDefault(); if (lenis) lenis.scrollTo('#team', { offset: -40 }); else $('#team')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); };
  $$('a[href="#team"]').forEach((a) => { a.addEventListener('click', toTeam); life.undo.push(() => a.removeEventListener('click', toTeam)); });

  life.undo.push(registerStepper({ lenis, stops: () => [topOf($('.about-hero')), ...sectionStops(tail)] }));

  /* ---------- the problem: three paths ---------- */
  const paths = $$('.ab-path'), items = $$('.ab-prob-list li');
  const drawPaths = (p) => {
    // each path has its own stretch of the scroll: its marker pops onto the render and its point in the list lights up
    paths.forEach((m, i) => {
      const k = Math.min(1, Math.max(0, (p - i * .28) / .4));
      m.style.setProperty('--e', Math.min(1, Math.max(0, (k - .55) / .3)).toFixed(3));
      items[i]?.toggleAttribute('data-on', k >= .85);
    });
  };
  /* ---------- the vision: highlighter + hand-written note ---------- */
  const quote = $('.ab-quote blockquote'), note = $('.ab-note');

  if (reduced) {
    drawPaths(1);
  } else {
    drawPaths(0);
    const draw = { p: 0 };
    gsap.to(draw, { p: 1, ease: 'none', onUpdate: () => drawPaths(draw.p), scrollTrigger: { trigger: '.ab-prob-grid', start: 'top 65%', end: 'bottom 70%', scrub: .6 } });
    if (quote && note) {
      gsap.set(quote, { '--sweep': '0%' });
      gsap.set(note, { '--w': 0 });
      gsap.timeline({ scrollTrigger: { trigger: '.ab-quote', start: 'top 72%', toggleActions: 'play none none reverse' } })
        .to(quote, { '--sweep': '100%', duration: .9, ease: 'power2.inOut' })
        .to(note, { '--w': 1, duration: 1.3, ease: 'power1.inOut' }, '-=.2');
    }
  }

  /* ---------- the hero: the 3D letters ---------- */
  const stageEl = $('#ah-stage'), canvas = document.getElementById('about-us');
  if (canvas && stageEl) {
    try {
      const hero = await createAboutHero(canvas, { motion: !reduced });
      if (life.dead) { hero.dispose(); return cleanup; }
      life.undo.push(() => hero.dispose());
      // the CSS letters wait (page-about.css --ah-wait) so the word drops in once, in 3D. If the model was slow and they
      // have already shown, the 3D takes over standing still instead of dropping the word in a second time.
      const cssLetter = stageEl.querySelector('.ah-type span');
      if (cssLetter && parseFloat(getComputedStyle(cssLetter).opacity) > .05) hero.skipIntro();
      stageEl.classList.add('gl');
      life.undo.push(() => stageEl.classList.remove('gl'));
      if (!reduced) {
        ScrollTrigger.create({
          trigger: '.about-hero', start: 'top top', end: 'bottom top', scrub: true,
          onUpdate: (st) => hero.setPart(st.progress),
        });
      }
    } catch (err) {
      // no WebGL or no model yet: the CSS lettering shows now rather than after its wait
      stageEl.classList.add('nogl');
      life.undo.push(() => stageEl.classList.remove('nogl'));
      console.warn('[about] 3D hero unavailable, keeping the CSS letters:', err?.message ?? err);
    }
  }
  if (life.dead) return cleanup;
  ScrollTrigger.refresh();
  return cleanup;
}
