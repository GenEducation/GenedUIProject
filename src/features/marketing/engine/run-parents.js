// For Parents (take A, "The Window"): the script of render_handoff_v72/prototypes/home/parents.html, run on the markup
// that pages.js parentsHtml() rendered. Browser only. runParents() resolves to a cleanup for when the page unmounts.
import { initMore, initHops } from './content-parents.js';
import { createStage, shellAt } from './deskbot.js';
import { initScroll, growOnScroll, activeSteps, revealOnScroll, reduced, mobile, bp, htmlState, killScroll } from './scroll.js';

export async function runParents() {
  const life = { dead: false, undo: [htmlState()] };
  const cleanup = () => { life.dead = true; life.undo.reverse().forEach((f) => f()); killScroll(); };
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];

  life.undo.push(initMore());
  const tail = document.getElementById('tail');
  const hops = { dead: false };
  initHops(tail, hops);
  life.undo.push(() => { hops.dead = true; hops.stop?.(); });
  growOnScroll(tail);
  revealOnScroll(tail);
  activeSteps([...tail.querySelectorAll('.pf-points li')], (i) => {
    tail.querySelectorAll('.pf-panel, .pf-tab').forEach((el) => el.classList.toggle('on', +el.dataset.i === i));
  }, { line: mobile ? '78%' : '55%' });

  /* ---------- the highlighter reveal: the tablet shows through wherever the highlighter has passed ---------- */
  // The highlighter sweeps the section in broad left-to-right strokes, top-left to bottom-right. The revealed area is the union of the stroke so far (rectangles
  // along each segment, round caps), drawn as one clip-path on the tablet; all polygons share one winding so they add up.
  // A yellow wash covers just the last stretch of the stroke, so the colour leads and the screen clears behind it.
  const ours = $('.rv-after'), hl = $('.rv-hl');
  let SEG = [], LEN = 0, HALF = 0, TRAIL = 0;
  function layoutScribble() {
    // Every pass runs left to right with a slight downward slant, like a real highlighter lifted between strokes;
    // the first starts at the top-left corner and the last ends at the bottom-right.
    const w = ours.offsetWidth, h = ours.offsetHeight, n = mobile ? 6 : 5, rise = h / n * .6;
    HALF = h / n * .74; TRAIL = w * .4;
    SEG = []; LEN = 0;
    for (let k = 0; k < n; k++) {
      const y = (k + .5) * h / n;
      const a = [-w * .04, y - rise / 2], b = [w * 1.04, y + rise / 2], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      SEG.push({ a, b, l, at: LEN }); LEN += l;
    }
  }
  const area = (poly) => poly.reduce((acc, [x, y], i) => { const [x2, y2] = poly[(i + 1) % poly.length]; return acc + x * y2 - x2 * y; }, 0);
  const wind = (poly) => (area(poly) < 0 ? poly.reverse() : poly);
  const pathOf = (poly) => 'M' + poly.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';
  const disc = ([cx, cy], r) => Array.from({ length: 16 }, (_, i) => [cx + r * Math.cos(i / 16 * 2 * Math.PI), cy + r * Math.sin(i / 16 * 2 * Math.PI)]);
  // the stroke between two lengths along the path, as one clip-path
  function strokeBetween(from, to, half) {
    const polys = [];
    for (const s of SEG) {
      if (s.at + s.l < from || s.at > to) continue;
      const t0 = Math.max(0, (from - s.at) / s.l), t1 = Math.min(1, (to - s.at) / s.l);
      const [ax, ay] = s.a, dx = s.b[0] - ax, dy = s.b[1] - ay;
      const p0 = [ax + dx * t0, ay + dy * t0], p1 = [ax + dx * t1, ay + dy * t1];
      const nx = -dy / s.l * half, ny = dx / s.l * half;
      polys.push(wind([[p0[0] + nx, p0[1] + ny], [p1[0] + nx, p1[1] + ny], [p1[0] - nx, p1[1] - ny], [p0[0] - nx, p0[1] - ny]]), wind(disc(p1, half)), wind(disc(p0, half)));
    }
    return polys.length ? `path('${polys.map(pathOf).join(' ')}')` : "path('M0 0Z')";
  }
  function scribble(p) {
    if (!SEG.length) layoutScribble();
    if (p <= 0) { ours.style.clipPath = hl.style.clipPath = "path('M0 0Z')"; return; }
    if (p >= 1) { ours.style.clipPath = 'none'; hl.style.clipPath = "path('M0 0Z')"; return; }
    const upto = LEN * p;
    ours.style.clipPath = strokeBetween(0, upto, HALF);
    hl.style.clipPath = strokeBetween(Math.max(0, upto - TRAIL), upto, HALF * 1.02);
  }

  /* ---------- the journey stage ---------- */
  const P = {
    concerns: bp({ rotY: 0, rotX: .32, dist: 5.2, shiftX: 0, shiftY: -.06 }, { rotY: 0, rotX: .32, dist: 6.2, shiftX: 0, shiftY: .02 }),
    view:     bp({ rotY: 0, rotX: .45, dist: 3.9, shiftX: 0, shiftY: -.1 },  { rotY: 0, rotX: .45, dist: 4.8, shiftX: 0, shiftY: 0 }),
  };
  if (!mobile && matchMedia('(max-width: 1100px)').matches) for (const k in P) P[k].dist *= 1.3;
  // the device turns to each question as it arrives: left column to its left, right column to its right, up or down with the row
  const look = (col, row) => ({ rotY: col * .42, rotX: .32 + row * .13 });
  const FACES = ['thinking', 'listening', 'surprised', 'encourage', 'happy', 'correct'];

  const canvas = document.getElementById('bot');
  const stage = await createStage(canvas, { pose: { ...P.concerns } });
  life.undo.push(() => stage.dispose());
  if (life.dead) { stage.dispose(); return cleanup; }
  await document.fonts.ready;
  if (life.dead) return cleanup;

  if (reduced) {
    stage.setFace('happy');
    return cleanup;
  }
  const { gsap, ScrollTrigger, lenis, destroy } = initScroll();
  life.undo.push(destroy);
  const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true });
  const pose = (at, p, d = .6) => tl.to(stage.pose, { ...p, duration: d, ease: 'power1.inOut' }, at);
  const show = (sel, at, d = .3) => tl.fromTo(sel, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: d, ease: 'power2.out' }, at);
  const hide = (sel, at, d = .3) => tl.to(sel, { autoAlpha: 0, y: -24, duration: d, ease: 'power2.in' }, at);

  // 0 – the title; then the six questions arrive one by one and the device turns to each
  show('[data-b=ctitle]', .1);
  const qs = $$('.orbit li');
  const C0 = .9, STEP = .85;  // the title settles first; each question then has the screen to itself for a while
  qs.forEach((li, i) => {
    const at = C0 + i * STEP, col = i < 3 ? -1 : 1, row = (i % 3) - 1;
    if (mobile) {
      tl.fromTo(li, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .2, ease: 'power2.out' }, at);
      if (i < qs.length - 1) tl.to(li, { opacity: 0, y: -20, duration: .15 }, at + STEP - .15);
    } else {
      tl.fromTo(li, { '--r': .2, '--k': .5, opacity: 0 }, { '--r': 1, '--k': 1, opacity: 1, duration: .45, ease: 'back.out(1.4)' }, at);
      pose(at, look(col, row), .4);
    }
  });
  // they all come into view: the device faces you again and the questions are drawn into its screen
  const IN = C0 + qs.length * STEP + .2;
  hide('[data-b=ctitle]', IN);
  pose(IN, P.view, .7);
  qs.forEach((li, i) => {
    if (mobile) tl.to(li, { opacity: 0, y: -20, duration: .2 }, IN);
    else tl.to(li, { '--r': 0, '--k': .1, opacity: 0, duration: .55, ease: 'power2.in' }, IN + .05 + i * .04);
  });
  show('[data-b=couter]', IN + .55);
  tl.set({}, {}, IN + 1.6);

  const SHELL = [[0, 'paper'], [C0, 'yellow'], [IN, 'lime']];
  const focus = (t) => (t < C0 || t >= IN ? -1 : Math.min(qs.length - 1, Math.floor((t - C0) / STEP)));
  let shown = null, lastF = -2;
  tl.eventCallback('onUpdate', () => {
    const t = tl.time(), k = focus(t);
    stage.bodyColor(shellAt(SHELL, t));
    const f = t >= IN + .3 ? 'happy' : k >= 0 ? FACES[k] : 'idle';
    if (shown !== f) { shown = f; stage.show(f); }
    if (k !== lastF) { lastF = k; qs.forEach((li, j) => li.classList.toggle('on', j === k)); }
  });
  ScrollTrigger.create({ trigger: '#story', start: 'top top', end: 'bottom bottom', scrub: 0.6, animation: tl });

  // the reveal: the plain card and its text settle in and hold; the highlighter sweeps the whole section over to the
  // Parent Dashboard (text and tablet together), then it holds
  const rv = { p: 0 };
  gsap.timeline({ scrollTrigger: { trigger: '#reveal', start: 'top top', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true } })
    .fromTo('.rv-before .rv-text', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .06 }, 0)
    .fromTo('.rv-before .rv-card', { autoAlpha: 0, y: 40, rotate: -2 }, { autoAlpha: 1, y: 0, rotate: 0, duration: .08 }, 0)
    .fromTo(rv, { p: 0 }, { p: 1, duration: .66, onUpdate: () => scribble(rv.p) }, .22)
    .fromTo('.rv-after .rv-card', { scale: .97 }, { scale: 1, duration: .1, ease: 'power1.out' }, .86)
    .to({}, { duration: .1 }, .9);
  const resetScribble = () => { SEG = []; };
  ScrollTrigger.addEventListener('refreshInit', resetScribble);
  life.undo.push(() => ScrollTrigger.removeEventListener('refreshInit', resetScribble));
  ScrollTrigger.refresh();

  // the "Explore the Parent Dashboard" CTA jumps past the pinned story
  $$('a[href="#dashboard"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); if (lenis) lenis.scrollTo('#dashboard', { offset: -40 }); else $('#dashboard').scrollIntoView(); }));
  return cleanup;
}
