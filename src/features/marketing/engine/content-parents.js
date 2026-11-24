// Ported from render_handoff_v72/prototypes/home/shared/content-parents.js (Zoovi website, round 1). Asset paths point at /zoovi/,
// page links at the app's routes. Builders return HTML strings; the marketing pages render them on the server.
// Copy for the For Parents page, verbatim from "GenED-Website- For Parent Page v2-Nov '26" (sentence case on the page).
// Sections 3 (Learning beyond the classroom), 4 (Interaction) and 7 (Safety) are left out on purpose: the home page already tells them.
// Shared by parents.html (Take A) and parents-b.html (Take B).
import { esc, rich, growingQuestion, closingAndFooter } from './content.js';

const MAIL = 'mailto:info@gened.ai';
const INVITE = '/get-an-invite'; // INVITE_HREF in ../routes.ts

export const parents = {
  hero: {
    eyebrow: 'Zoovi for parents',
    title: 'Know more about your child’s learning. *Every day.*',
    lede: 'Go beyond marks and periodic school updates. Follow your child’s daily learning, see what they’re understanding, discover their interests, and identify where they may need more practice. Zoovi gives you timely insights to stay involved and offer the right support at the right time.',
    ctas: [
      { label: 'Get an Invite', href: INVITE },
      { label: 'Explore the Parent Dashboard', href: '#dashboard', ghost: true },
    ],
  },
  concerns: {
    title: 'You want to know what’s happening in your child’s ~learning journey~',
    items: [
      { q: 'What are they spending time on?', a: 'You want visibility into their learning activity, interests, and the topics they revisit.' },
      { q: 'Are they learning meaningfully?', a: 'You want to know what they’re exploring, what interests them, and how they express their ideas.' },
      { q: 'Are they understanding or just getting answers?', a: 'You want them to build understanding and expand knowledge, not simply complete tasks.' },
      { q: 'Where do they need support?', a: 'You want to identify subjects, chapters, and skills that may need more practice.' },
      { q: 'How can you support their homework?', a: 'You want to guide your child towards understanding, rather than simply provide answers.' },
      { q: 'How are they progressing?', a: 'You want a clear view of each child’s learning journey, all in one place.' },
    ],
    outro: 'Zoovi brings these aspects of learning *into view*, helping you stay involved without overseeing every step.',
  },
  // The reveal's "before" side (Take A): adapted from §5's lede and §1's "Go beyond marks and periodic school updates".
  // Not verbatim from the document: written for the plain report card the highlighter wipes away.
  reportCard: {
    eyebrow: 'The report card',
    title: 'A grade, a remark, and a ~long wait~',
    lede: 'School updates and report cards offer periodic snapshots of progress: a mark for each subject and a line from the teacher, a few times a year. They don’t show what your child understood, what they keep revisiting, or where they need support today.',
  },
  // the reveal's "after" side keeps §5's title and the second sentence of its lede
  dashboardAfter: 'Zoovi gives you daily insights into your child’s learning activity, progress, and areas where they may need support.',
  dashboard: {
    eyebrow: 'The Parent Dashboard',
    title: 'Daily insights into your child’s ^learning^',
    lede: 'School updates and report cards offer periodic snapshots of progress. Zoovi gives you daily insights into your child’s learning activity, progress, and areas where they may need support.',
    features: [
      { title: 'Daily learning updates', body: 'Follow your child’s learning activity and progress through daily reports.' },
      { title: 'Subject and chapter progress', body: 'See what they’re learning, the chapters they complete, and the topics they revisit.' },
      { title: 'Understanding and skill development', body: 'Get insights into concepts understood and areas where more practice may help.' },
      { title: 'Learning activity', body: 'Review sessions and time spent learning.' },
      { title: 'Shareable reports', body: 'Share progress with teachers to support more informed discussions.' },
    ],
  },
  support: {
    title: 'Celebrate every small win. *Encourage every new step.*',
    lede: 'With a clearer view of your child’s learning, you can make everyday support more meaningful.',
    points: [
      { title: 'Celebrate progress.', body: 'Recognise new skills, mastered concepts, and small wins.' },
      { title: 'Foster self-motivation.', body: 'Encourage your child to practise independently and explore topics that interest them.' },
      { title: 'Keep the conversation going.', body: 'Show interest in their questions, discoveries, and learning experiences.' },
    ],
  },
  faqs: {
    title: 'Frequently asked ^questions^',
    items: [
      { q: 'What is Zoovi, and how does it help my child?', a: 'Zoovi is an AI-enabled, voice-led learning companion that helps children ask questions, understand concepts, practise and explore beyond the classroom.' },
      { q: 'Which age groups can use Zoovi?', a: 'Zoovi is designed for school-going children, offering an engaging learning experience through the Zoovi Device and Web App.' },
      { q: 'Can Zoovi help with school lessons and homework?', a: 'Yes. Children can revisit classroom concepts, clear doubts, and work through questions step by step.' },
      { q: 'How often will I receive updates about my child’s learning?', a: 'The Zoovi Parent Dashboard provides daily learning updates, helping you follow your child’s activity and progress more regularly.' },
      { q: 'What can I see on the Parent Dashboard?', a: 'You can view learning activity, subject and chapter progress, areas where more practice may help and relevant learning insights.' },
      { q: 'Can I share my child’s progress with the teachers?', a: 'Yes. Shareable progress reports can support more informed discussions between parents and teachers.' },
      { q: 'Is Zoovi safe for children?', a: 'Zoovi offers a dedicated learning environment without open browsing, unrestricted apps, or social media. Voice interaction is activation-based, and audio recordings are not stored.' },
      { q: 'Does Zoovi replace classroom teaching?', a: 'No. Zoovi complements classroom learning by giving children more opportunities to ask questions, revisit concepts, practise and explore.' },
    ],
  },
  closing: {
    title: 'Be closer to every step of your child’s *learning journey*',
    lede: 'Understand what your child is learning, recognise their progress, and give them the support they need to keep growing.',
    ctas: [
      { label: 'Get an Invite', href: INVITE },
      { label: 'Talk to Us', href: MAIL, ghost: true },
    ],
  },
};

/**
 * Read more (phones only, up to 700px wide; wider screens show the copy as it is): long copy stays folded behind a round "+" under its heading. Opening it rotates the "+" into a "×" and
 * the paragraph unfolds word by word under a highlighter wipe. Pass the copy and an optional class for the <p>.
 * Works inside pinned beats: initMore() keeps a beat and its flip-twin (flipTextOverDevice) in step.
 */
let moreN = 0;
export const more = (text, cls = 'lede', label = 'Read more') => {
  const id = `more-${++moreN}`;
  const words = String(text).split(' ').map((w, i) => `<span style="--w:${i}">${esc(w)}</span>`).join(' ');
  return `<div class="more">
    <button type="button" class="more-btn" aria-expanded="false" aria-controls="${id}"><i aria-hidden="true"></i><span class="more-l" data-open="Show less">${esc(label)}</span></button>
    <div class="more-body" id="${id}"><div><p class="${cls}">${words}</p></div></div>
  </div>`;
};
export function initMore(root = document) {
  const onClick = (e) => {
    const btn = e.target.closest('.more-btn'); if (!btn) return;
    const open = btn.getAttribute('aria-expanded') !== 'true';
    // a flip-twin carries the same data-b, so open both copies together
    const beat = btn.closest('[data-b]');
    const boxes = beat ? [...document.querySelectorAll(`[data-b="${beat.dataset.b}"] .more`)] : [btn.closest('.more')];
    const k = [...(beat || document).querySelectorAll('.more')].indexOf(btn.closest('.more'));
    const twins = beat ? [...document.querySelectorAll(`[data-b="${beat.dataset.b}"]`)].map((b) => b.querySelectorAll('.more')[k]).filter(Boolean) : boxes;
    twins.forEach((m) => { m.classList.toggle('open', open); m.querySelector('.more-btn').setAttribute('aria-expanded', open); });
    // inside a [data-more-group] (the orbit of questions) only one answer is open at a time
    const grp = btn.closest('[data-more-group]');
    if (open && grp) grp.querySelectorAll('.more.open').forEach((m) => { if (!twins.includes(m)) { m.classList.remove('open'); m.querySelector('.more-btn').setAttribute('aria-expanded', 'false'); } });
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}

/** Concern icons rendered in Blender (blender/parents). */
export const concernIcon = (i) => `<img class="pp-icon" src="/zoovi/parents/icons/concern-${i + 1}.png" alt="" width="256" height="256" loading="lazy">`;

/* The parent portal screens (tablet, desktop, report cards) live in portal.js, drawn after the real product. */
export { portalTablet, featureTablet } from './portal.js';
import { featureTablet } from './portal.js';

/** The 5 features beside the tablet: the one crossing the middle of the screen (or clicked) is shown. */
export const featureList = (features) => `
  <ol class="pf-points">${features.map((f, i) => `
    <li class="${i === 0 ? 'on' : ''}" data-i="${i}"><button type="button" aria-pressed="${i === 0}"><span class="dot" aria-hidden="true">${i + 1}</span>
      <span><h3>${esc(f.title)}</h3><p>${esc(f.body)}</p></span></button></li>`).join('')}
  </ol>`;

/**
 * The calm tail shared by both takes: the dashboard features (lime band), support, FAQs, closing and footer.
 * opts.dashIntro: false when the page already showed the dashboard title and lede in its pinned story (the title stays for screen readers).
 * opts.faqs: false leaves the FAQs out (Take A).
 */
export function parentTailHtml({ dashIntro = true, faqs = true } = {}) {
  const { dashboard: d, support: s, faqs: f, closing } = parents;
  return `
    <div class="pp-band" id="dashboard">
      <section aria-labelledby="dash-h">
        <p class="eyebrow">${esc(d.eyebrow)}</p>
        <h2 id="dash-h" class="${dashIntro ? '' : 'sr-only'}" style="margin-top:16px">${rich(d.title)}</h2>
        ${dashIntro ? `<p class="lede">${esc(d.lede)}</p>` : ''}
        <div class="pf-grid">
          ${featureList(d.features)}
          <div class="pf-device">${featureTablet()}</div>
        </div>
      </section>
    </div>
    <section aria-labelledby="sup-h">
      <h2 id="sup-h">${rich(s.title)}</h2>
      <p class="lede">${esc(s.lede)}</p>
      <ol class="pp-wins">${s.points.map((p, i) => `
        <li data-reveal style="--i:${i}"><img class="pp-icon" src="/zoovi/parents/icons/support-${i + 1}.png" alt="" width="256" height="256" loading="lazy">
          <div><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div></li>`).join('')}</ol>
    </section>
    ${faqs ? `<section class="faq-sec" aria-labelledby="faq-h">
      <h2 id="faq-h" class="faq-title">${rich(f.title)}${growingQuestion()}</h2>
      <div class="faqs">${f.items.map((x) => `<details><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('')}</div>
    </section>` : ''}
    ${closingAndFooter(closing, `<div class="pp-steps" data-reveal aria-hidden="true">
      <img src="/zoovi/parents/icons/closing.png" alt="" width="900" height="750" loading="lazy">
      <svg class="pp-hops" viewBox="0 0 120 100"><defs><mask id="pp-hop-mask" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
        <path class="pp-hop-reveal" pathLength="1" fill="none" stroke="white" stroke-width="5" stroke-linecap="round"/></mask></defs>
        <path class="pp-hop-dots" fill="none" mask="url(#pp-hop-mask)"/><circle class="pp-hop-start" r="1.3"/>
        <path class="pp-hop-arrow" d="M-2.6,-2 L2.2,0 L-2.6,2 Z"/></svg>
    </div>`)}`;
}

/**
 * The closing's hop path: a dotted line that hops from boulder to boulder (/zoovi/parents/icons/closing.png), small hops
 * up the first three, then one big hop over the second-last onto the top one, with an arrowhead at its tip.
 * The boulders' tops in the image come from Blender (icons/closing.json, written by render_parents.py).
 * It draws itself once when it scrolls into view; with reduced motion it is simply drawn.
 */
export async function initHops(root = document, signal = { dead: false }) {
  const box = root.querySelector('.pp-steps'); if (!box) return;
  let tops;
  // the SVG's viewBox matches the image's aspect (closing.json): x in 0..100*aspect, y in 0..100
  let aspect = 1.2;
  try { const j = await (await fetch('/zoovi/parents/icons/closing.json')).json(); aspect = j.aspect || 1; tops = j.tops.map(([x, y]) => [x * 100 * aspect, y * 100 - 2.5]); } catch { return; }
  if (signal.dead) return;
  box.querySelector('.pp-hops').setAttribute('viewBox', `0 0 ${100 * aspect} 100`);
  const HOPS = [[0, 1, 9], [1, 2, 12], [2, 4, 16]];   // from, to, height of the arc (the last one skips the second-last boulder)
  const d = `M${tops[0][0]},${tops[0][1]} ` + HOPS.map(([a, b, h]) => {
    const [x0, y0] = tops[a], [x1, y1] = tops[b];
    return `Q${(x0 + x1) / 2},${Math.min(y0, y1) - h} ${x1},${y1}`;
  }).join(' ');
  const dots = box.querySelector('.pp-hop-dots'), reveal = box.querySelector('.pp-hop-reveal'), arrow = box.querySelector('.pp-hop-arrow');
  dots.setAttribute('d', d); reveal.setAttribute('d', d);
  box.querySelector('.pp-hop-start').setAttribute('cx', tops[0][0]); box.querySelector('.pp-hop-start').setAttribute('cy', tops[0][1]);
  // where each hop ends along the path, for the per-hop timing
  const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path'); probe.setAttribute('d', d);
  const L = dots.getTotalLength();
  const ends = HOPS.map((_, i) => { const sub = `M${tops[0][0]},${tops[0][1]} ` + d.split(' Q').slice(1, i + 2).map((q) => 'Q' + q).join(' '); probe.setAttribute('d', sub); return probe.getTotalLength(); });
  const set = (len) => {
    reveal.style.strokeDashoffset = 1 - len / L;
    const p = dots.getPointAtLength(len), q = dots.getPointAtLength(Math.max(0, len - .8));
    arrow.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${Math.atan2(p.y - q.y, p.x - q.x) * 180 / Math.PI})`);
    arrow.style.opacity = len > .5 ? 1 : 0;
  };
  reveal.style.strokeDasharray = 1;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('rm');
  if (reduced) { set(L); return; }
  set(0);
  // each hop eases out of one boulder and onto the next; a short pause on each boulder
  const DUR = [550, 550, 900], PAUSE = 220;
  const ease = (t) => (1 - Math.cos(Math.PI * t)) / 2;
  const play = () => {
    const t0 = performance.now();
    const tick = (now) => {
      let t = now - t0, from = 0;
      for (let i = 0; i < HOPS.length; i++) {
        if (signal.dead) return;
        if (t < DUR[i]) { set(from + (ends[i] - from) * ease(t / DUR[i])); return requestAnimationFrame(tick); }
        t -= DUR[i]; from = ends[i];
        if (i < HOPS.length - 1) { if (t < PAUSE) { set(from); return requestAnimationFrame(tick); } t -= PAUSE; }
      }
      set(L);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) { io.disconnect(); setTimeout(() => { if (!signal.dead) play(); }, 300); } }, { threshold: .6 });
  io.observe(box);
  signal.stop = () => io.disconnect();
}
