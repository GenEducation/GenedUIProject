// Home (take B, "One Question"): the script of render_handoff_v72/prototypes/home/index.html, run on the markup that
// pages.js homeHtml() rendered. Browser only. runHome() resolves to a cleanup for when the page unmounts.
import { content as C } from './content.js';
import { createStage, flipTextOverDevice, shellAt, tokenRoot } from './deskbot.js';
import { initScroll, eduSteps, speechMode, reduced, mobile, bp, htmlState, killScroll } from './scroll.js';

export async function runHome() {
  const life = { dead: false, undo: [htmlState()] };
  const cleanup = () => { life.dead = true; life.undo.reverse().forEach((f) => f()); killScroll(); };
  const nav = document.querySelector('.nav');
  // the intro is decided before the page is painted (components/HomeIntro.tsx): "skip" starts straight on the hero
  const skipIntro = document.querySelector('.zv-site')?.dataset.intro === 'skip';
  if (!reduced && !skipIntro) nav?.classList.add('hidden'); // arrives with the hero, after the loader
  life.undo.push(() => nav?.classList.remove('hidden'));

  const tail = document.getElementById('tail');
  eduSteps(tail);

  const P = {
    open:     bp({ rotY: 0, rotX: .47, dist: 2.4, shiftX: 0, shiftY: 0 },   { rotY: 0, rotX: .47, dist: 4.6, shiftX: 0, shiftY: 0 }),
    hero:     bp({ rotY: -.6, rotX: .04, dist: 3.4, shiftX: .2, shiftY: 0 }, { rotY: -.6, rotX: .04, dist: 5.8, shiftX: 0, shiftY: -.3 }),
    face:     bp({ rotY: 0, rotX: .47, dist: 2.3, shiftX: .2, shiftY: 0 },   { rotY: 0, rotX: .47, dist: 5.0, shiftX: 0, shiftY: -.25 }),
    ways:     bp({ rotY: -.5, rotX: .05, dist: 4.9, shiftX: -.2, shiftY: -.03 }, { rotY: -.5, rotX: .05, dist: 9, shiftX: -.22, shiftY: -.28 }),
    approach: bp({ rotY: .45, rotX: .05, dist: 3.6, shiftX: .2, shiftY: 0 }, { rotY: .45, rotX: .05, dist: 6.4, shiftX: 0, shiftY: -.3 }),
    pillars:  bp({ rotY: .25, rotX: .12, dist: 7.0, shiftX: 0, shiftY: 0 }, { rotY: .25, rotX: .2, dist: 10, shiftX: 0, shiftY: -.36 }),
    pillars2: { rotY: -.35 },
  };

  // 701–1100px: pull the bot back and further right so it never sits under the text column
  if (!mobile && matchMedia('(max-width: 1100px)').matches) {
    for (const k in P) { const p = P[k]; if (p.dist) p.dist *= 1.35; if (p.shiftX > .1) p.shiftX += .07; if (p.shiftX < -.1) p.shiftX -= .04; }
  }
  // speech-bubble experiment: the device sits left of centre and a little closer, so the bubble has room
  if (speechMode) { Object.assign(P.pillars, { shiftX: -.16, dist: 5.2, rotY: (P.pillars.rotY || 0) - .25 }); Object.assign(P.pillars2, { rotY: (P.pillars.rotY || 0) + .15 }); }
  const canvas = document.getElementById('bot');
  // without the intro the device first appears already in its hero pose
  const stage = await createStage(canvas, { pose: skipIntro ? { ...P.hero } : { ...P.open } });
  life.undo.push(() => stage.dispose());
  if (life.dead) { stage.dispose(); return cleanup; }
  await document.fonts.ready;
  if (life.dead) return cleanup;
  const $ = (s) => document.querySelector(s);
  if (!reduced) flipTextOverDevice(stage, '.beat.left');
  const $$ = (s) => [...document.querySelectorAll(s)];

  if (reduced) {
    stage.pose.opacity = 1; Object.assign(stage.pose, P.hero, { shiftX: 0, shiftY: 0 });
    stage.setFace('happy');
    return cleanup;
  }

  // the loader always starts from the top of the page
  const restoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  life.undo.push(() => { history.scrollRestoration = restoration; });
  scrollTo(0, 0);
  const { gsap, ScrollTrigger, lenis, destroy } = initScroll();
  life.undo.push(destroy);
  lenis?.stop();
  stage.pose.opacity = 0;

  // Geometry the tweens depend on; re-measured whenever ScrollTrigger refreshes (resize).
  let G;
  const measure = () => {
    const vw = innerWidth, vh = canvas.getBoundingClientRect().height;
    const scr = stage.measure(P.open).screen;
    // the i-dot in zoovi-logo.png: centre at (95.06%, 15.07%), 8.47% of the logo's width across
    const st = $('.stage').getBoundingClientRect(), il = $('.intro-logo').getBoundingClientRect();
    const d0 = { x: il.left - st.left + il.width * .9506, y: il.top - st.top + il.height * .1507, w: il.width * .0847 };
    G = { scr, vw, vh, d0 };
  };
  measure();
  ScrollTrigger.addEventListener('refreshInit', measure);
  life.undo.push(() => ScrollTrigger.removeEventListener('refreshInit', measure));

  // One timeline for the whole story. 0 → LOADED plays on a clock as the page loads (the logo's dot becomes the device and
  // the hero arrives); scrolling then scrubs LOADED → the end.
  const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true });
  life.undo.push(() => tl.kill());
  const LOADED = 2.0;
  const pose = (at, p, d = .6) => tl.to(stage.pose, { ...p, duration: d, ease: 'power1.inOut' }, at);
  const show = (sel, at, d = .3) => tl.fromTo(sel, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: d, ease: 'power2.out' }, at);
  const hide = (sel, at, d = .3) => tl.to(sel, { autoAlpha: 0, y: -24, duration: d, ease: 'power2.in' }, at);
  const fade = (sel, at, to, d = .3) => tl.to(sel, { autoAlpha: to, duration: d }, at);
  tl.set({}, {}, 15.7);

  // 0 – loader: the logo's dot lifts off, grows into the screen, and the bot appears around it; the letters step back
  const css = getComputedStyle(tokenRoot()), lime = css.getPropertyValue('--lime').trim(), cream = css.getPropertyValue('--face-screen').trim();
  // the logo's dot is a rounded square turned 45°: start as exactly that shape, then round it off into a circle as it grows
  const side0 = () => G.d0.w / 1.3;
  gsap.set('.intro-dot', { left: G.d0.x, top: G.d0.y, width: G.d0.w });
  gsap.set('.q', { left: G.d0.x, top: G.d0.y, width: side0(), borderRadius: '24%', backgroundColor: lime, opacity: 0 });
  tl.to('.intro-logo', { opacity: 0, scale: .94, duration: .45, ease: 'power1.in' }, .08);
  tl.to('.intro-dot', { opacity: 0, duration: .08 }, .1);
  tl.fromTo('.q', { opacity: 0 }, { opacity: 1, duration: .08, immediateRender: false }, .1);
  tl.fromTo('.q', { left: () => G.d0.x, top: () => G.d0.y, width: side0 },
    { left: () => G.scr.x, top: () => G.scr.y, width: () => G.scr.radius * 2, duration: .85, ease: 'power2.inOut' }, .12);
  tl.fromTo('.q', { borderRadius: '24%' }, { borderRadius: '50%', duration: .5, ease: 'power1.inOut', immediateRender: false }, .14);
  tl.fromTo('.q', { backgroundColor: lime }, { backgroundColor: cream, duration: .5, ease: 'power1.inOut', immediateRender: false }, .4);
  tl.to(stage.pose, { opacity: 1, duration: .3 }, .85);
  tl.to('.q', { opacity: 0, duration: .25 }, 1.05);
  pose(1.3, P.hero, .8);
  show('[data-b=hero]', 1.7);
  hide('[data-b=hero]', 2.6);

  // 2.9 – four verbs, each line typed in while the face shows the verb
  pose(2.7, P.face, .6);
  show('[data-b=does]', 3.0);
  hide('[data-b=does]', 3.6);
  C.does.beats.forEach((b, i) => {
    const at = 3.9 + i * .9;
    show(`[data-b=verb${i}]`, at, .2);
    const chars = $$(`[data-b=verb${i}] .typed span`);
    tl.to(chars, { opacity: 1, duration: .01, stagger: .45 / chars.length }, at + .12);
    hide(`[data-b=verb${i}]`, at + .7, .15);
  });
  show('[data-b=outro]', 7.5);
  hide('[data-b=outro]', 8.0);

  // 8.3 – the bot opens a window: a circle grows out of the screen
  const winAt = (r) => () => { const s = stage.measure(P.face).screen; return `circle(${r === 'full' ? Math.hypot(G.vw, G.vh) : 0}px at ${s.x}px ${s.y}px)`; };
  tl.fromTo('.window', { clipPath: winAt(0) }, { clipPath: winAt('full'), duration: .8, ease: 'power2.in' }, 8.3);
  tl.fromTo('.window > *', { opacity: 0 }, { opacity: 1, duration: .3 }, 8.8);
  tl.to('.window', { clipPath: winAt(0), duration: .6, ease: 'power2.inOut' }, 9.9);

  // 10.6 – one companion, two ways
  pose(10.4, P.ways, .6);
  show('[data-b=ways]', 10.6);
  tl.fromTo('.twin', { autoAlpha: 0, scale: .7 }, { autoAlpha: 1, scale: 1, duration: .4, ease: 'power2.out', stagger: .1 }, 10.7);
  fade('.cap', 10.9, 1);
  fade('[data-b=ways], .twin, .cap', 11.6, 0);

  // 11.7 – approach: title beside the bot, then the bot glides into the centre and the pillars orbit in around it
  pose(11.6, P.approach, .5);
  show('[data-b=approach]', 11.85);
  hide('[data-b=approach]', 12.45);
  pose(12.45, P.pillars, .8);
  pose(13.05, P.pillars2, 2.5);
  $$('.pillars li').forEach((li, i) => {
    const a = -60 + i * 60;
    tl.fromTo(li, { '--a': `${a - 60}deg`, '--r': .35, opacity: 0 }, { '--a': `${a}deg`, '--r': 1, opacity: 1, duration: .7, ease: 'power2.out' }, 12.6 + i * .08);
  });
  fade('.pillars li', 15.45, 0, .25);
  // the ring is in place by 13.7; then each pillar gets an equal turn (0.28 units ≈ a quarter screen of scroll)
  const focus = (t) => (t < 13.7 || t > 15.4 ? -1 : Math.min(5, Math.floor((t - 13.7) / .28)));
  let lastFocus = -2;
  const setFocus = (k) => { if (k === lastFocus) return; lastFocus = k;
    document.querySelectorAll('.pillars li').forEach((li, j) => li.classList.toggle('on', j === k));
    document.querySelectorAll('.sb, .sb-steps i').forEach((el) => el.classList.toggle('on', +el.dataset.i === k));
  };

  const faces = [[0, 'idle'], [1.3, 'happy'], [3.0, 'surprised'], ...C.does.beats.map((b, i) => [3.9 + i * .9, b.screen]),
    [7.5, 'correct'], [8.3, 'happy'], [10.4, 'listening'], [11.6, 'happy']];
  // the shell changes colour through the story (logo tokens), easing into each beat
  const SHELL = [[0, 'paper'], [1.3, 'lime'], [3.0, 'yellow'], [3.9, 'green'], [4.8, 'paper'], [5.7, 'lime'], [6.6, 'yellow'], [7.5, 'green'],
    [8.3, 'paper'], [10.4, 'lime'], [11.6, 'yellow'], [12.45, 'green'], [13.9, 'paper'], [14.7, 'lime']];
  let shown = null;
  tl.eventCallback('onUpdate', () => {
    const t = tl.time();
    stage.bodyColor(shellAt(SHELL, t));
    let f = 'idle'; for (const [at, name] of faces) if (t >= at) f = name;
    if (speechMode && focus(t) >= 0) f = 'talk';
    if (shown !== f) { shown = f; stage.show(f); }
    setFocus(focus(t));
  });

  // the loader: a short pause on the logo, then 0 → LOADED on a clock; the nav and scrolling arrive with the hero
  const loaded = () => {
    if (life.dead) return;
    nav?.classList.remove('hidden');
    lenis?.start();
    ScrollTrigger.create({ trigger: '#story', start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true,
      animation: tl.tweenFromTo(LOADED, tl.duration(), { paused: true, ease: 'none', immediateRender: false }) });
  };
  if (skipIntro) {
    tl.time(LOADED);   // the logo has stepped back, the device is in place and the hero is up
    loaded();
    return cleanup;
  }
  tl.time(0);
  const loader = gsap.delayedCall(.45, () => tl.tweenFromTo(0, LOADED, { duration: 2.3, ease: 'none', onComplete: loaded }));
  life.undo.push(() => loader.kill());
  return cleanup;
}
