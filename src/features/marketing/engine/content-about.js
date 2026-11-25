// Copy for the About page, from "GenED-Website-About Page v1-Nov '26" (sentence case on the page). Builders return HTML
// strings; the page renders them on the server and engine/run-about.js brings them to life.
// Left out on purpose, because other pages already tell them:
//   §2's Ask / Wonder / Discover cards are one quiet line here (home tells Ask / Understand / Practise / Explore);
//   §5's six beliefs are home's six approach pillars, so only their call to action is kept (in the vision section);
//   §6's team photo is left out for now (on request).
import { esc, rich, ctas, closingAndFooter } from './content.js';

const MAIL = 'mailto:info@gened.ai';
const HOME = '/';

export const about = {
  hero: {
    title: 'Beyond answers. *Towards real understanding.*',
    lede: 'With Zoovi, GenEd is creating a learning experience where children can ask questions freely, explore their interests, and build the confidence to learn independently, while keeping parents and educators connected to their progress.',
    ctas: [
      { label: 'Discover Zoovi', href: HOME },
      { label: 'Meet the team', href: '#team', ghost: true },
    ],
  },
  why: {
    eyebrow: 'Why we exist',
    title: 'Children are naturally *curious.* Learning should ~encourage that.~',
    lede: 'A child’s learning journey continues beyond lessons, through the questions they ask, the things they wonder about, and the ideas they want to explore.',
    words: [
      { word: 'Ask', line: 'Questions that spark learning' },
      { word: 'Wonder', line: 'Ideas that invite exploration' },
      { word: 'Discover', line: 'New ways of seeing and learning' },
    ],
    belief: 'We started GenEd with a belief that technology could do more to support this journey. That belief led us to ^Zoovi^, an AI-powered Knowledge Companion designed around the way children learn and explore.',
  },
  problem: {
    eyebrow: 'The problem we want to solve',
    title: 'Learning doesn’t follow the *same path* for every child.',
    lede: 'A topic that comes easily to one child may take another more time. Every child needs room to learn at a pace and in a way that helps them move forward.',
    paths: [
      { title: 'Different starting points', body: 'Children come to a concept with different levels of understanding.' },
      { title: 'Time to revisit', body: 'Some need to revisit topics or try a different approach.' },
      { title: 'Practice to progress', body: 'Some need more opportunities to practise before moving ahead.' },
    ],
    fixed: 'Yet many learning experiences are built around a fixed sequence and pace.',
    change: 'We want to change that.',
    answer: 'Zoovi learns from each child’s interests, responses and behaviour to understand what engages them and where they need support. It adapts its explanations, guidance, and activities accordingly, keeping the learning experience relevant and responsive to each child.',
  },
  vision: {
    eyebrow: 'Our vision for children’s learning',
    title: 'A future where curiosity has *room to grow*',
    quote: 'I don’t understand',
    note: 'never a reason to hold back, but an opportunity to look at something in a new way',
    body: [
      'We imagine a world where children feel free to ask questions, explore ideas, and pursue interests beyond the classroom. Where saying “I don’t understand” is never a reason to hold back, but an opportunity to look at something in a new way.',
      'We want to help create a generation of confident, curious, and independent learners, with technology that supports children and the people who guide them.',
    ],
    ctaLead: 'See our learning philosophy in action',
    cta: { label: 'Explore Zoovi', href: HOME },
  },
  team: {
    eyebrow: 'Meet the founders',
    title: 'Meet the *team*',
    founders: [
      {
        name: 'Vedant',
        role: 'Founder & CEO',
        bio: 'A Computer Engineering graduate from VIT, Vedant leads product, business and go-to-market at GenEd. His experience as a student helped shape the idea behind Zoovi.',
        photo: '/zoovi/about/vedant',
        alt: 'Vedant, Founder and CEO of GenEd, arms crossed and smiling, in a white Zoovi polo.',
        linkedin: 'https://www.linkedin.com/in/vedant-bisen-147a591b9',
        tone: 'lime',
      },
      {
        name: 'Utkarsh',
        role: 'Co-Founder & CTO',
        bio: 'An Electronics and Computer Engineering graduate from Thapar Institute of Engineering & Technology, Utkarsh leads technology and engineering, driving Zoovi’s AI development.',
        photo: '/zoovi/about/utkarsh',
        alt: 'Utkarsh, Co-Founder and CTO of GenEd, arms crossed and smiling, in a white Zoovi polo.',
        linkedin: 'https://www.linkedin.com/in/utkarsh9abxt',
        tone: 'yellow',
      },
    ],
  },
  mission: {
    eyebrow: 'Our mission & values',
    title: 'Making personalised learning *accessible to every child*',
    lede: 'Our mission is to build technology that gives more children the opportunity to learn in ways that work for them, with their safety, growth, and individual needs always in mind.',
    valuesTitle: 'What guides us',
    values: [
      { title: 'Empathy', body: 'Recognise each child’s unique needs and make them feel heard and supported.' },
      { title: 'Curiosity', body: 'Keep the joy of asking, exploring and discovering alive.' },
      { title: 'Understanding', body: 'Focus on helping children grasp concepts, not just finding the right answer.' },
      { title: 'Accessibility', body: 'Make personalised learning accessible to more children.' },
      { title: 'Responsibility', body: 'Build AI experiences that prioritise children’s safety, privacy, and well-being.' },
    ],
    signoff: 'We are GenEd. And with ^Zoovi^, we’re working towards a future where every child has the support and opportunities to reach their potential.',
  },
  closing: {
    title: 'Meet a new kind of *learning companion*',
    lede: 'Discover Zoovi and see how it brings curiosity, exploration, and personalised learning into every child’s journey.',
    ctas: [
      { label: 'Discover Zoovi', href: HOME },
      { label: 'Get in Touch', href: MAIL, ghost: true },
    ],
  },
};

/* ------------------------------------------------------------------ pieces ------------------------------------------------------------------ */

// "About us" in chunky paper letters: the stand-in shown until the 3D model is on screen, and where WebGL is missing.
const TYPE = [['A', 'paper'], ['b', 'lime'], ['o', 'face'], ['u', 'yellow'], ['t', 'green'], [' ', ''], ['u', 'lime'], ['s', 'yellow']];
const aboutType = () => `<p class="ah-type" aria-hidden="true">${TYPE.map(([ch, tone], i) =>
  ch === ' ' ? '<i class="sp"></i>' : `<span class="t-${tone}" style="--i:${i}">${ch === 'o' ? '<b class="ah-o"><i></i><i></i><i></i></b>' : esc(ch)}</span>`).join('')}</p>`;

// The five values' icons (24px grid, drawn with the stroke).
const VALUE_ICONS = [
  '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  '<path d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.4-1.5 1.3-1.5 2.3v.5"/><circle cx="12" cy="18" r=".6" fill="currentColor"/><circle cx="12" cy="12" r="9.5"/>',
  '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/>',
  '<path d="M4 20V10l8-6 8 6v10"/><path d="M10 20v-5h4v5"/><path d="M2.5 20h19"/>',
  '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.4"/>',
];
const valueIcon = (i) => `<svg class="ab-vi" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${VALUE_ICONS[i]}</svg>`;

const LINKEDIN = '<svg viewBox="0 0 24 24" aria-hidden="true" class="ab-li"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.2c0-1.2 0-2.9-1.8-2.9s-2 1.4-2 2.8V21h-4z"/></svg>';

// The problem's drawing: one fixed track, and the three paths children actually take. viewBox 600 × 420.
const PATHS = [
  // 1. Different starting points: this one starts further along, and somewhere else
  { d: 'M150 78C250 40 300 150 400 112S520 70 556 82', end: [556, 82], start: [150, 78] },
  // 2. Time to revisit: it loops back over itself before going on
  { d: 'M44 214C150 214 214 150 300 186C376 218 346 298 284 262C232 232 290 168 392 196S520 222 556 212', end: [556, 212], start: [44, 214] },
  // 3. Practice to progress: small steps up
  { d: 'M44 372H140Q160 372 160 352V340H256Q276 340 276 320V308H372Q392 308 392 288V276H486Q506 276 506 256V248H556', end: [556, 248], start: [44, 372] },
];
const problemSvg = () => `
  <svg class="ab-paths" viewBox="0 0 600 420" role="img" aria-label="One straight, fixed track, and three different paths beside it: one starts further along, one loops back to revisit, one climbs in small steps.">
    <path class="ab-track" d="M44 214H556"/>
    <text class="ab-track-t" x="48" y="244">fixed sequence &amp; pace</text>
    ${PATHS.map((p, i) => `
    <g class="ab-path" data-i="${i}">
      <circle class="ab-p-start" cx="${p.start[0]}" cy="${p.start[1]}" r="7"/>
      <path class="ab-p-line" pathLength="1" d="${p.d}"/>
      <g class="ab-p-end" transform="translate(${p.end[0]} ${p.end[1]})"><circle r="17"/><text y="6" text-anchor="middle">${i + 1}</text></g>
    </g>`).join('')}
  </svg>`;

/* ------------------------------------------------------------------ the page ------------------------------------------------------------------ */

export function aboutHeroHtml() {
  const { hero } = about;
  return `
  <section class="about-hero" aria-labelledby="hero-h">
    <div class="ah-text">
      <h1 id="hero-h">${rich(hero.title)}</h1>
      <p class="lede">${esc(hero.lede)}</p>
      ${ctas(hero.ctas)}
    </div>
    <div class="ah-stage" id="ah-stage">
      <i class="ah-sun" aria-hidden="true"></i>
      ${aboutType()}
      <canvas id="about-us" role="img" aria-label="The words “About us” as chunky 3D paper letters; the o is the Zoovi device itself, smiling back, with a question mark leaning on the s."></canvas>
    </div>
  </section>`;
}

export function aboutTailHtml() {
  const { why, problem: pr, vision: v, team, mission: m, closing } = about;
  return `
    <section class="ab-why" aria-labelledby="why-h">
      <p class="eyebrow" data-reveal>${esc(why.eyebrow)}</p>
      <h2 id="why-h" data-reveal>${rich(why.title)}</h2>
      <div class="ab-why-row">
        <p class="lede" data-reveal>${esc(why.lede)}</p>
        <ul class="ab-words" aria-label="Ask, wonder, discover">${why.words.map((w, i) => `
          <li data-reveal style="--i:${i}"><span class="ab-word">${esc(w.word)}</span><span class="ab-word-l">${esc(w.line)}</span></li>`).join('')}
        </ul>
      </div>
      <p class="ab-belief" data-reveal>${rich(why.belief)}</p>
    </section>

    <div class="ab-band ab-band-ink" id="problem">
      <section class="ab-problem" aria-labelledby="prob-h">
        <div class="ab-prob-grid">
          <div class="ab-prob-head">
            <p class="eyebrow" data-reveal>${esc(pr.eyebrow)}</p>
            <h2 id="prob-h" data-reveal>${rich(pr.title)}</h2>
            <p class="lede" data-reveal>${esc(pr.lede)}</p>
            <ol class="ab-prob-list">${pr.paths.map((p, i) => `
              <li data-i="${i}"><span class="dot" aria-hidden="true">${i + 1}</span><div><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div></li>`).join('')}
            </ol>
          </div>
          <div class="ab-prob-map">${problemSvg()}</div>
        </div>
        <div class="ab-prob-turn" data-reveal>
          <div>
            <p class="ab-fixed">${esc(pr.fixed)}</p>
            <p class="ab-change">${esc(pr.change)}</p>
          </div>
          <p class="lede">${esc(pr.answer)}</p>
        </div>
      </section>
    </div>

    <div class="ab-band ab-band-lime">
      <section class="ab-vision" aria-labelledby="vis-h">
        <div class="ab-vis-grid">
          <div class="ab-vis-text">
            <p class="eyebrow" data-reveal>${esc(v.eyebrow)}</p>
            <h2 id="vis-h" data-reveal>${rich(v.title)}</h2>
            <div class="ab-vis-body">${v.body.map((p) => `<p data-reveal>${esc(p)}</p>`).join('')}</div>
            <div class="ab-vis-cta" data-reveal><p>${esc(v.ctaLead)}</p>${ctas([v.cta])}</div>
          </div>
          <figure class="ab-quote" aria-hidden="true">
            <blockquote>“${esc(v.quote)}”</blockquote>
            <figcaption class="ab-note"><svg viewBox="0 0 80 60" class="ab-note-arrow"><path d="M72 54C54 50 28 38 14 10M14 10l-1 16M14 10l14 7"/></svg><span>${esc(v.note)}</span></figcaption>
          </figure>
        </div>
      </section>
    </div>

    <section class="ab-team" id="team" aria-labelledby="team-h">
      <p class="eyebrow" data-reveal>${esc(team.eyebrow)}</p>
      <h2 id="team-h" data-reveal>${rich(team.title)}</h2>
      <ul class="ab-founders">${team.founders.map((f, i) => `
        <li class="ab-f t-${f.tone}" style="--i:${i}" data-reveal>
          <figure class="ab-f-pic"><i class="ab-f-disc" aria-hidden="true"></i><img src="${esc(f.photo)}.webp" srcset="${esc(f.photo)}-sm.webp 360w, ${esc(f.photo)}.webp 720w" sizes="(max-width: 700px) 320px, 400px" alt="${esc(f.alt)}" width="720" height="910" loading="lazy" decoding="async"></figure>
          <div class="ab-f-text">
            <h3>${esc(f.name)}</h3>
            <p class="ab-f-role">${esc(f.role)}</p>
            <p class="ab-f-bio">${esc(f.bio)}</p>
            ${f.linkedin ? `<a class="pill ghost ab-f-in" href="${esc(f.linkedin)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(f.name)} on LinkedIn">${LINKEDIN}<span>LinkedIn</span></a>` : ''}
          </div>
        </li>`).join('')}
      </ul>
    </section>

    <section class="ab-mission" aria-labelledby="mis-h">
      <p class="eyebrow" data-reveal>${esc(m.eyebrow)}</p>
      <h2 id="mis-h" data-reveal>${rich(m.title)}</h2>
      <p class="lede" data-reveal>${esc(m.lede)}</p>
      <h3 class="ab-values-h" data-reveal>${esc(m.valuesTitle)}</h3>
      <ul class="ab-values">${m.values.map((x, i) => `
        <li class="ab-value" style="--i:${i}" data-reveal>${valueIcon(i)}<h4>${esc(x.title)}</h4><p>${esc(x.body)}</p></li>`).join('')}
      </ul>
      <p class="ab-signoff" data-reveal>${rich(m.signoff)}</p>
    </section>
    ${closingAndFooter(closing)}`;
}
