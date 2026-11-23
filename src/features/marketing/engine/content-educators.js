// Ported from render_handoff_v72/prototypes/home/shared/content-educators.js (Zoovi website, round 1). Asset paths point at /zoovi/,
// page links at the app's routes. Builders return HTML strings; the marketing pages render them on the server.
// Copy for the For Educators page, verbatim from "GenED-Website-For Teachers Page v2-Nov '26" (sentence case on the page).
// Left out on purpose, because home already tells them: §3 "What Zoovi brings to the classroom" (home's educators section,
// the same six benefits beside the teacher tablet) and §4 "Teaching methodology" (home's Ask / Understand / Practise /
// Explore story and its approach pillars), and §6 "Zoovi Teacher Programme" (removed on request). Shared by educators.html (Take A) and educators-b.html (Take B).
import { esc, rich, ctas, closingAndFooter } from './content.js';

const EDUCATOR_INVITE = '/get-an-invite/educators'; // EDUCATOR_INVITE_HREF in ../routes.ts
const REGISTER = { label: 'Register for the Educator Programme', href: EDUCATOR_INVITE };

export const educators = {
  hero: {
    eyebrow: 'For teachers, schools and education partners',
    title: 'More support for students. *More insight for educators.*',
    lede: 'Zoovi extends learning beyond the classroom, giving students more opportunities to ask, practise and explore, while helping educators stay informed about their progress.',
    ctas: [REGISTER],
  },
  philosophy: {
    eyebrow: 'Zoovi’s educational philosophy',
    title: 'Every child learns differently. *Every question deserves attention.*',
    lede: [
      'Learning goes beyond completing lessons and finding the right answers. It is about understanding concepts, building confidence, and nurturing curiosity.',
      'Zoovi gives children the freedom to ask questions, learn at their own pace, and explore beyond the classroom.',
    ],
    points: [
      { title: 'Curiosity matters', body: 'Encourage children to ask questions and discover new ideas.' },
      { title: 'Understanding takes time', body: 'Give children the space to work through concepts at their own pace.' },
      { title: 'Every child has a different learning journey', body: 'Recognise that children have different questions, interests, and learning needs.' },
    ],
  },
  // The video beats: each is told by the lab render, then by the Teacher Portal screen named in `screen` (TEACHER_PANELS).
  // NOT verbatim from the brief: rewritten on request around "an extra pair of hands in the classroom", to match the render
  // (a Zoovi at every desk, then the teacher's tablet). Every claim maps to a real screen: the per-period Class report,
  // the student report card, and the follow-up list and common gaps that lead to a Gap Recovery period.
  atWork: {
    eyebrow: 'Zoovi at work in your classroom',
    title: 'Your teaching assistant. ~Your extra pair of hands.~',
    lede: 'One teacher can’t be at every desk at once. Zoovi can.',
    beats: [
      { title: 'A helper at every desk', body: 'While you teach the room, Zoovi works one-to-one at each desk, answering questions, explaining again and practising with every student at their own pace.', screen: 'live' },
      { title: 'The notes, taken for you', body: 'Zoovi keeps track of what each student asked and practised. By the end of the period, the class report shows who finished, who needs a follow-up, and the gaps the class shares.', screen: 'report' },
      { title: 'Time with every learner', body: 'Open any student to see their chapters, mastery and progress, without pulling them aside or waiting for the next test.', screen: 'student' },
      { title: 'Your next step, lined up', body: 'The follow-up list points to where your time matters most, so you can plan a focused period for the students who need it.', screen: 'periods' },
    ],
    closing: 'More hands in the classroom. *More time for teaching.*',
  },
  school: {
    title: 'Bring Zoovi into ^your school^',
    steps: [
      { title: 'Connect with our team', body: 'Discuss your school’s learning objectives, curriculum, and requirements.' },
      { title: 'Plan your school’s Zoovi setup', body: 'Work with our team to align the Zoovi experience with your curriculum and learning materials.' },
      { title: 'Introduce Zoovi to your students', body: 'Bring Zoovi into your learning environment and give students access to additional learning support.' },
    ],
    ctas: [REGISTER],
  },
};

/** Clay icons rendered in Blender (blender/educators): group 'school', i from 0. */
export const eduIcon = (group, i) => `<img class="pp-icon" src="/zoovi/educators/icons/${group}-${i + 1}.png" alt="" width="512" height="512" loading="lazy">`;

/** The philosophy lede: two short paragraphs. */
export const philoLede = () => educators.philosophy.lede.map((p) => `<p class="lede">${esc(p)}</p>`).join('');

/**
 * The calm tail shared by both takes: Bring Zoovi into your school (three steps on clay icons joined by a dotted hop
 * path) and the footer. §6 Educator Programme and the final "Explore Zoovi" section are left out on request.
 */
export function eduTailHtml() {
  const { school: s } = educators;
  return `
    <section class="ed-school" aria-labelledby="school-h">
      <h2 id="school-h">${rich(s.title)}</h2>
      <div class="ed-steps">
        <svg class="ed-hops" aria-hidden="true"><path class="ed-hop-dots"/><path class="ed-hop-arrow" d="M-5,-4 L4.5,0 L-5,4 Z"/></svg>
        <ol>${s.steps.map((x, i) => `
          <li style="--i:${i}"><div class="ed-ic">${eduIcon('school', i)}</div><span class="dot" aria-hidden="true">${i + 1}</span>
            <h3>${esc(x.title)}</h3><p>${esc(x.body)}</p></li>`).join('')}</ol>
      </div>
      ${ctas(s.ctas)}
    </section>
    ${closingAndFooter(null)}`;
}

/**
 * The school steps' hop path: a dotted line hops from the top of one clay icon to the next and ends in an arrowhead,
 * measured from the icons on the page (so it follows the layout at any width). It draws once when the steps come
 * into view; with reduced motion it is simply drawn. Phones stack the steps and show no path.
 */
export function initStepHops(root = document) {
  const box = root.querySelector('.ed-steps'); if (!box) return;
  const svg = box.querySelector('.ed-hops'), dots = svg.querySelector('.ed-hop-dots'), arrow = svg.querySelector('.ed-hop-arrow');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('rm');
  let L = 0, shown = reduced ? 1 : 0;
  const layout = () => {
    const b = box.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${b.width} ${b.height}`);
    const tops = [...box.querySelectorAll('.ed-ic img')].map((im) => { const r = im.getBoundingClientRect(); return [r.left - b.left + r.width / 2, r.top - b.top + r.height * .12]; });
    if (tops.length < 2 || tops[1][1] - tops[0][1] > 60) { dots.setAttribute('d', ''); arrow.style.opacity = 0; L = 0; return; }   // stacked: no path
    // from just right of each icon's top to just left of the next one's, arcing over the gap
    const pad = (tops[1][0] - tops[0][0]) * .22;
    let d = '';
    for (let i = 0; i < tops.length - 1; i++) {
      const [x0, y0] = tops[i], [x1, y1] = tops[i + 1], a = x0 + pad, c = x1 - pad, h = Math.min(90, (c - a) * .28);
      d += `${i ? ' ' : ''}M${a},${y0} Q${(a + c) / 2},${Math.min(y0, y1) - h} ${c},${y1}`;
    }
    dots.setAttribute('d', d); L = dots.getTotalLength(); set(shown);
  };
  const set = (t) => {
    shown = t; if (!L) return;
    const len = L * t;
    // dotted up to len, then nothing: the dash pattern itself grows (round caps turn the 0-length dashes into dots)
    dots.style.opacity = t > 0 ? 1 : 0;
    dots.style.strokeDasharray = t >= 1 ? '0 9' : dotted(len);
    const p = dots.getPointAtLength(len), q = dots.getPointAtLength(Math.max(0, len - 2));
    arrow.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${Math.atan2(p.y - q.y, p.x - q.x) * 180 / Math.PI})`);
    arrow.style.opacity = t > .02 ? 1 : 0;
  };
  // a dash pattern that is dotted up to `len`, then one long gap: "0 9 0 9 ... 0 L"
  const dotted = (len) => { const n = Math.max(0, Math.floor(len / 9)); return (Array(n).fill('0 9').join(' ') + ` 0 ${L * 2}`).trim(); };
  const ro = new ResizeObserver(layout); ro.observe(box);
  addEventListener('load', layout);
  let raf = 0, timer = 0, io = null;
  const stop = () => { ro.disconnect(); removeEventListener('load', layout); io?.disconnect(); clearTimeout(timer); cancelAnimationFrame(raf); };
  if (reduced) return stop;
  io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return; io.disconnect();
    const t0 = performance.now(), D = 1800, ease = (t) => (1 - Math.cos(Math.PI * t)) / 2;
    const tick = (now) => { const t = Math.min(1, (now - t0) / D); set(ease(t)); if (t < 1) raf = requestAnimationFrame(tick); };
    timer = setTimeout(() => { raf = requestAnimationFrame(tick); }, 250);
  }, { threshold: .5 });
  io.observe(box);
  return stop;
}

/**
 * A scroll-scrubbed image sequence on a canvas (cover-fit): frames dir/000.webp .. dir/NNN.webp, preloaded progressively.
 * Returns { draw(p) } where p is 0..1; it redraws on resize. Used for the philosophy animations and the lab day.
 */
export function frameSeq(canvas, dir, n, { fit = 'contain', first = 0 } = {}) {
  const ctx = canvas.getContext('2d'), imgs = new Array(n);
  const url = (i) => `${dir}/${String(i).padStart(3, '0')}.webp`;
  let cur = first, want = first;
  const load = (i) => { if (imgs[i]) return imgs[i]; const im = new Image(); im.decoding = 'async'; im.src = url(i); im.onload = () => { if (i === want) paint(i); }; imgs[i] = im; return im; };
  const size = () => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  };
  const paint = (i) => {
    const im = imgs[i]; if (!im || !im.complete || !im.naturalWidth) return false;
    size();
    const cw = canvas.width, ch = canvas.height, s = (fit === 'cover' ? Math.max : Math.min)(cw / im.naturalWidth, ch / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.clearRect(0, 0, cw, ch); ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h); cur = i; return true;
  };
  // load the first frame, then every 8th, then fill in
  load(first);
  const order = [...Array(n).keys()].sort((a, b) => (a % 8 === 0 ? 0 : 1) - (b % 8 === 0 ? 0 : 1));
  let k = 0, timer = 0; const step = () => { for (let j = 0; j < 6 && k < order.length; j++, k++) load(order[k]); if (k < order.length) timer = setTimeout(step, 30); };
  timer = setTimeout(step, 200);
  const ro = new ResizeObserver(() => paint(cur)); ro.observe(canvas);
  return {
    dispose() { clearTimeout(timer); ro.disconnect(); },
    draw(p) {
      const i = Math.max(0, Math.min(n - 1, Math.round(p * (n - 1)))); want = i;
      load(i);
      if (!paint(i)) { // nearest loaded frame meanwhile
        for (let d = 1; d < n; d++) { if (paint(i - d) || paint(i + d)) break; }
      }
    },
  };
}
