// For Educators (take A, "The Staffroom Window"): the script of render_handoff_v72/prototypes/home/educators.html, run on
// the markup that pages.js educatorsHtml() rendered. Browser only. runEducators() returns a cleanup for when the page unmounts.
import { setTeacherPanel } from './content.js';
import { frameSeq, initStepHops } from './content-educators.js';
import { initMore } from './content-parents.js';
import { PH_STEPS as STEPS } from './pages.js';
import { initScroll, revealOnScroll, reduced, mobile, htmlState, killScroll } from './scroll.js';

export function runEducators() {
  const life = { dead: false, undo: [htmlState()] };
  const cleanup = () => { life.dead = true; life.undo.reverse().forEach((f) => f()); killScroll(); };
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];

  const tail = document.getElementById('tail');
  life.undo.push(initStepHops(tail));
  life.undo.push(initMore());
  revealOnScroll(tail);

  // 2 · philosophy: one pinned section round a file folder
  // step 0: the folder closed, the heading under it; steps 1–3: open, one principle inside the cover, its animation on a sheet
  const PH_N = 60;
  // 3 · Zoovi at work: the beats over the lab render, then the live Teacher Portal (one real screen per beat)
  const LAB = { N: 150, dir: mobile ? '/zoovi/educators/lab-m' : '/zoovi/educators/lab' };

  // the three animations, one per sheet; each plays through once (about 2.4 s) when its sheet lands
  const seqs = [0, 1, 2].map((k) => frameSeq($(`.fd-sheet canvas[data-k="${k}"]`), `/zoovi/educators/philo-${k + 1}${mobile ? '-m' : ''}`, PH_N));
  seqs.forEach((q) => q.draw(0));
  const playing = [];
  life.undo.push(() => { seqs.forEach((q) => q.dispose()); playing.forEach((r) => cancelAnimationFrame(r)); });
  function play(k) {
    cancelAnimationFrame(playing[k]);
    const t0 = performance.now(), D = 2400;
    const tick = (now) => { const t = Math.min(1, (now - t0) / D); seqs[k].draw(t); if (t < 1) playing[k] = requestAnimationFrame(tick); };
    playing[k] = requestAnimationFrame(tick);
  }
  const pin = $('.ph-pin'), book = $('.fd'), sheets = [0, 1, 2].map((k) => $(`.fd-sheet[data-k="${k}"]`));
  const pts = $$('.fd-pt'), dots = $$('.ph-dots button');
  let step = -1;
  /** f: 0..3. 0→1 opens the folder; then sheet k turns over f = 1 + k .. 2 + k (past halfway it is gone). */
  function turn(f) {
    pin.style.setProperty('--o', Math.max(0, Math.min(1, f)).toFixed(4));
    sheets.forEach((sh, k) => {
      const t = Math.max(0, Math.min(1, f - 1 - k));
      sh.style.setProperty('--t', t.toFixed(4));
      sh.style.zIndex = 10 - k;
      sh.style.visibility = t >= .5 ? 'hidden' : 'visible';
    });
    const s = Math.min(STEPS - 1, Math.round(f));
    if (s !== step) {
      step = s;
      pts.forEach((el) => el.classList.toggle('on', +el.dataset.s === Math.max(1, s)));
      dots.forEach((d) => d.classList.toggle('on', +d.dataset.s === s));
      if (s > 0) play(s - 1);
    }
  }
  turn(0);
  const lab = frameSeq($('#lab-seq'), LAB.dir, LAB.N, { fit: 'cover', first: 30 });
  life.undo.push(() => lab.dispose());
  const tabRoot = $('.lab-tab');

  if (reduced) {
    turn(1);
    // the dots sit inside the folder: stop the click there so the folder's own "next sheet" click doesn't also fire
    dots.forEach((d) => d.addEventListener('click', (e) => { e.stopPropagation(); turn(Math.max(1, +d.dataset.s)); }));
    book.addEventListener('click', () => turn(step >= STEPS - 1 ? 1 : step + 1));
    lab.draw(70 / 149);
    return cleanup;
  }

  const { gsap, ScrollTrigger, lenis, destroy } = initScroll();
  life.undo.push(destroy);
  // the philosophy: scroll only turns the pages (eased, a hold on each spread); the animations play on their own
  const PH = { f: 0 };
  const phTl = gsap.timeline({ paused: true, onUpdate: () => turn(PH.f) });
  phTl.to({}, { duration: .5 });
  for (let k = 1; k < STEPS; k++) phTl.to(PH, { f: k, duration: 1, ease: 'power2.inOut' }).to({}, { duration: .6 });
  const phST = ScrollTrigger.create({ trigger: '#philosophy', start: 'top top', end: 'bottom bottom', scrub: .4, animation: phTl });
  // stops: the closed folder, each open spread in the middle of its hold (flip k ends at .5 + (k - 1) * 1.6 + 1, then
  // holds .6), and the section's end
  const PH_STOPS = [0, ...Array.from({ length: STEPS - 1 }, (_, k) => .5 + k * 1.6 + 1 + .3), phTl.duration()];
  life.undo.push(snapToStops(phST, phTl, lenis, PH_STOPS));
  // the dots jump to a spread
  dots.forEach((d) => d.addEventListener('click', () => {
    const at = PH_STOPS[+d.dataset.s];
    const y = phST.start + (phST.end - phST.start) * (at / phTl.duration());
    if (lenis) lenis.scrollTo(y, { duration: 1 }); else window.scrollTo({ top: y, behavior: 'smooth' });
  }));

  // the lab: frames 30 → 149 over the first part; the portal takes over for beats 2–4
  const cam = { f: 30 }, labDots = $$('.lab-dots i');
  const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true, onUpdate: () => lab.draw(cam.f / (LAB.N - 1)) });
  const show = (sel, at, d = .3) => tl.fromTo(sel, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: d, ease: 'power2.out' }, at);
  const hide = (sel, at, d = .25) => tl.to(sel, { autoAlpha: 0, y: -24, duration: d, ease: 'power2.in' }, at);
  const go = (at, f, d, ease = 'none') => tl.to(cam, { f, duration: d, ease }, at);
  const dot = (at, k) => tl.call(() => labDots.forEach((d, j) => d.classList.toggle('on', j === k)), [], at);
  const panel = (at, k) => tl.call(() => setTeacherPanel(tabRoot, Math.max(0, k)), [], at);
  // 0 – the empty lab in the morning; the title
  show('[data-b=intro]', .05);
  go(0, 45, 1.2);
  hide('[data-b=intro]', 1.1);
  // 1.3 – beat 1: the devices wake up as the camera comes down the room to the close-up of the desk beside the
  // teacher's (render frames 45 → 85), and holds there while the beat reads
  dot(1.25, 0); dot(1.2, -1);
  show('[data-b=b0]', 1.35);
  go(1.3, 85, .95, 'power1.out');
  hide('[data-b=b0]', 2.85);
  // 3 – to the teacher's desk, then the push into the tablet (85 → 149); the portal takes over
  go(3.0, 149, 1.6, 'power1.inOut');
  tl.to('#lab-seq', { opacity: 0, duration: .3 }, 4.5);
  tl.to('.lab-veil', { opacity: 0, duration: .3 }, 4.5);
  tl.fromTo('.lab-tab', { autoAlpha: 0, scale: .94 }, { autoAlpha: 1, scale: 1, duration: .3, ease: 'power2.out' }, 4.55);
  // 4.9 – beats 2–4, each on its own portal screen
  [2, 3, 4].forEach((n, k) => {
    const at = 4.9 + k * 1.2;
    panel(at, k); dot(at, n - 1);
    show(`[data-b=b${n - 1}]`, at);
    hide(`[data-b=b${n - 1}]`, at + .95);
  });
  // 8.6 – the closing line, the last screen held
  show('[data-b=close]', 8.6);
  dot(8.55, -1);
  tl.set({}, {}, 9.6);
  // a step back from the start rewinds the portal too
  tl.call(() => setTeacherPanel(tabRoot, 0), [], 4.5);
  const labST = ScrollTrigger.create({ trigger: '#at-work', start: 'top top', end: 'bottom bottom', scrub: .6, animation: tl });
  life.undo.push(snapToStops(labST, tl, lenis, LAB_STOPS));
  ScrollTrigger.refresh();
  return cleanup;
}

// the lab story's stops (timeline times): each beat in the middle of its hold, and the section's two ends
const LAB_STOPS = [0, .6, 2.45, 5.35, 6.55, 7.75, 9.1, 9.6];

/**
 * A pinned, scrubbed section that stops only on its beats (`stops`, times on its timeline `tl`). Between two beats the
 * screen is mid-change or briefly empty, so when a scroll comes to rest inside the section anywhere but on a stop, it
 * is carried on to the next stop in the direction it was going: the smallest nudge moves the story on a whole beat.
 * Include the section's two ends as stops so the visitor can scroll on out of it. Done through Lenis (which owns the
 * scroll position), not ScrollTrigger's snap, which Lenis overrides.
 */
function snapToStops(st, tl, lenis, stops) {
  if (!lenis) return () => {};
  const D = tl.duration();
  const yAt = (t) => st.start + (st.end - st.start) * (t / D);
  let settled = scrollY, timer = 0, release = 0, snapping = false;
  const settle = () => {
    const y = scrollY;
    if (y <= st.start + 2 || y >= st.end - 2) { settled = y; return; }
    const t = (y - st.start) / (st.end - st.start) * D;
    if (stops.some((s) => Math.abs(s - t) < .05)) { settled = y; return; }
    const down = y >= settled;
    const to = down ? stops.find((s) => s > t) : [...stops].reverse().find((s) => s < t);
    const done = () => { snapping = false; clearTimeout(release); settled = scrollY; };
    snapping = true;
    // if the visitor takes over mid-glide, Lenis drops this scroll without calling onComplete
    release = setTimeout(done, 1400);
    lenis.scrollTo(yAt(to), { duration: .9, easing: (x) => 1 - (1 - x) ** 3, onComplete: done });
  };
  const onScroll = () => { if (snapping) return; clearTimeout(timer); timer = setTimeout(settle, 160); };
  lenis.on('scroll', onScroll);
  return () => { lenis.off?.('scroll', onScroll); clearTimeout(timer); clearTimeout(release); };
}
