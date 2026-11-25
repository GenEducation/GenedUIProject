// The marketing pages' markup (About is new in the app, not ported from a prototype), from render_handoff_v72/prototypes/home: index.html (Home, take B),
// parents.html (For Parents, take A) and educators.html (For Educators, take A). Server-safe: string builders only.
// The pages render this HTML on the server; run-home.js / run-parents.js / run-educators.js then bring it to life.
import { content as C, esc, rich, pillarRing, ctas, tailHtml, webTablet, parentTablet, teacherTablet } from './content.js';
import { parents as P_, concernIcon, parentTailHtml, more } from './content-parents.js';
import { portalTablet, basicReportCard } from './portal.js';
import { educators as E, philoLede, eduTailHtml } from './content-educators.js';
import { aboutHeroHtml, aboutTailHtml } from './content-about.js';
import { faqHtml } from './content-faq.js';

/* ------------------------------------------------------------------ Home (B, "One Question") ------------------------------------------------------------------ */
const typed = (s) => `<p class="typed" aria-label="${esc(s)}">${[...s].map((ch) => `<span aria-hidden="true">${esc(ch)}</span>`).join('')}</p>`;

const homeBeats = () => `
  <div class="intro" aria-hidden="true"><img class="intro-logo" src="/zoovi/zoovi-logo-nodot.png" alt="" width="1063" height="365"></div>
  <div class="q" aria-hidden="true"></div>
  <img class="intro-dot" src="/zoovi/zoovi-logo-dot.png" alt="" aria-hidden="true" width="90" height="87">

  <section class="beat left" data-b="hero">
    <h1>${rich(C.hero.title)}</h1>
    <p class="lede">${esc(C.hero.lede)}</p>
    ${ctas(C.hero.ctas)}
  </section>

  <section class="beat left" data-b="does">
    <p class="eyebrow">${esc(C.does.verbs)}</p>
    <h2 style="margin-top:18px">${rich(C.does.title)}</h2>
    <p class="lede">${esc(C.does.intro)}</p>
  </section>
  ${C.does.beats.map((b, i) => `
  <section class="beat left verb" data-b="verb${i}">
    <div class="ticks" aria-hidden="true">${C.does.beats.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div>
    <p class="big">${esc(b.verb)}.</p>
    <h3>${esc(b.title)}</h3>
    ${typed(b.line)}
  </section>`).join('')}
  <section class="beat left" data-b="outro">
    <h2>${rich(C.does.outro)}</h2>
    ${ctas(C.does.ctas)}
  </section>

  <section class="window" aria-labelledby="par-h">
    <div>
      <h2 id="par-h">${rich(C.parents.title)}</h2>
      <p class="lede">${esc(C.parents.lede)}</p>
      <ol class="points">${C.parents.points.map((p, i) => `<li><span class="dot" aria-hidden="true">${i + 1}</span><span>${esc(p)}</span></li>`).join('')}</ol>
      ${ctas([C.parents.cta])}
    </div>
    ${parentTablet()}
  </section>

  <section class="beat ways-title" data-b="ways"><h2>${rich(C.ways.title)}</h2></section>
  <div class="twin dev" aria-hidden="true"></div>
  <div class="twin web">${webTablet()}</div>
  <div class="cap dev"><h3>${esc(C.ways.device.title)}</h3><p>${esc(C.ways.device.body)}</p></div>
  <div class="cap web"><h3>${esc(C.ways.web.title)}</h3><p>${esc(C.ways.web.body)}</p></div>

  <section class="beat left" data-b="approach">
    <h2>${rich(C.approach.title)}</h2>
    <p class="lede">${esc(C.approach.intro)}</p>
    ${ctas([C.approach.cta])}
  </section>
  ${pillarRing(C.approach.pillars)}`;

export const homeHtml = () => `
  <div class="story" id="story">
    <div class="stage">
      <canvas id="bot" aria-label="Zoovi deskbot, 3D model" role="img"></canvas>
      <div id="beats">${homeBeats()}</div>
    </div>
  </div>
  <div id="tail" class="tail">${tailHtml()}</div>`;

/* ------------------------------------------------------------------ For Parents (A, "The Window") ------------------------------------------------------------------ */
export const parentsHtml = () => {
  const { hero, concerns, dashboard, reportCard: before, dashboardAfter } = P_;
  return `
  <section class="ahero" aria-labelledby="hero-h">
    <img class="ahero-img" src="/zoovi/parents/office.webp" alt="A parent's desk: the Zoovi Parent Portal open on the monitor, showing Aarav's learning score, study time, activity trend and subject overview." width="3000" height="1350">
    <div class="ahero-text" id="hero-text">
      <h1 id="hero-h">${rich(hero.title)}</h1>
      ${more(hero.lede)}
      ${ctas(hero.ctas)}
    </div>
  </section>

  <div class="story" id="story">
    <div class="stage">
      <canvas id="bot" aria-label="The Zoovi device, 3D model" role="img"></canvas>
      <div id="beats">
        <section class="beat c-title" data-b="ctitle"><h2>${rich(concerns.title)}</h2></section>
        <ol class="orbit" data-more-group aria-label="What parents want to know">${concerns.items.map((c, i) => `
          <li class="pp-q" data-b="q${i}" data-i="${i}" style="--col:${i < 3 ? -1 : 1};--row:${(i % 3) - 1}">${concernIcon(i)}<h3><span>${esc(c.q)}</span></h3>${more(c.a, '', 'Read more')}</li>`).join('')}
        </ol>
        <section class="beat c-outro" data-b="couter"><h2>${rich(concerns.outro)}</h2></section>
      </div>
    </div>
  </div>

  <div class="reveal" id="reveal" aria-label="From the school report card to the Parent Dashboard">
    <div class="rv-stage" id="rv-stage">
      <div class="rv-layer rv-before">
        <div class="rv-text"><p class="eyebrow">${esc(before.eyebrow)}</p><h2>${rich(before.title)}</h2>${more(before.lede)}</div>
        <div class="rv-card"><i class="rv-shadow" aria-hidden="true"></i>${basicReportCard(true)}</div>
      </div>
      <div class="rv-layer rv-after">
        <div class="rv-text"><p class="eyebrow">${esc(dashboard.eyebrow)}</p><h2>${rich(dashboard.title)}</h2>${more(dashboardAfter)}</div>
        <div class="rv-card">${portalTablet(5)}</div>
      </div>
      <i class="rv-hl" aria-hidden="true"></i>
    </div>
  </div>

  <div id="tail" class="tail">${parentTailHtml({ dashIntro: false, faqs: false })}</div>`;
};

/* ------------------------------------------------------------------ For Educators (A, "The Staffroom Window") ------------------------------------------------------------------ */
export const PH_STEPS = E.philosophy.points.length + 1;
export const LAB_KEYS = E.atWork.beats.slice(1).map((b) => b.screen);   // beats 2–4 are told on the portal; beat 1 by the render

export const educatorsHtml = () => {
  const { hero, philosophy: ph, atWork: W } = E;
  const dotsHtml = (cls) => `<div class="ph-dots ${cls}" role="group" aria-label="Philosophy steps">${Array.from({ length: PH_STEPS }, (_, s) => `<button type="button" data-s="${s}" class="${s ? '' : 'on'}" aria-label="${s ? esc(ph.points[s - 1].title) : 'The philosophy'}"></button>`).join('')}</div>`;
  return `
  <section class="ahero" aria-labelledby="hero-h">
    <img class="ahero-img" src="/zoovi/educators/staffdesk.webp" alt="A teacher's desk: the Zoovi Teacher Portal open on a laptop showing a class report, a stack of exercise books, a register, a mug and the Zoovi device." width="3000" height="1350">
    <div class="ahero-text" id="hero-text">
      <p class="eyebrow">${esc(hero.eyebrow)}</p>
      <h1 id="hero-h">${rich(hero.title)}</h1>
      ${more(hero.lede)}
      ${ctas(hero.ctas)}
    </div>
  </section>

  <div class="ph" id="philosophy">
    <div class="ph-pin">
      <div class="fd-wrap">
        <div class="fd">
          <i class="fd-shadow" aria-hidden="true"></i>
          <div class="fd-panel fd-back" aria-hidden="true">
            <span class="fd-tab"></span>
            <div class="fd-sheets">${[2, 1, 0].map((k) => `<div class="fd-sheet" data-k="${k}"><canvas data-k="${k}"></canvas></div>`).join('')}</div>
            <i class="fd-clip"></i>
          </div>
          <div class="fd-panel fd-cover">
            <div class="fd-face fd-out" aria-hidden="true"><span class="fd-label"><img src="/zoovi/zoovi-logo.png" alt=""><span>For educators</span></span><i class="fd-band"></i></div>
            <div class="fd-face fd-inside">
              <div class="fd-pts">${ph.points.map((p, i) => `
                <section class="fd-pt" data-s="${i + 1}" aria-labelledby="ph-${i}">
                  <p class="eyebrow">${esc(ph.eyebrow)}</p>
                  <h3 id="ph-${i}"><span class="ph-n" aria-hidden="true">${i + 1}</span>${esc(p.title)}</h3><p>${esc(p.body)}</p>
                </section>`).join('')}
              </div>
              <div class="fd-pocket">${dotsHtml('open')}</div>
            </div>
          </div>
        </div>
      </div>
      <section class="ph-head" aria-labelledby="ph-h">
        <p class="eyebrow">${esc(ph.eyebrow)}</p>
        <h2 id="ph-h">${rich(ph.title)}</h2>
        ${philoLede()}
        ${dotsHtml('closed')}
      </section>
    </div>
  </div>

  <div class="lab" id="at-work">
    <div class="lab-stage" id="lab-stage">
      <canvas id="lab-seq" role="img" aria-label="A school computer lab with a Zoovi device on every desk. The devices wake up as students start learning, then the camera moves to the teacher's desk and into the Teacher Portal on the tablet."></canvas>
      <i class="lab-veil" aria-hidden="true"></i>
      <section class="lab-beat" data-b="intro"><p class="eyebrow">${esc(W.eyebrow)}</p><h2>${rich(W.title)}</h2><p class="lede">${esc(W.lede)}</p></section>
      ${W.beats.map((b, i) => `<section class="lab-beat" data-b="b${i}"><span class="lab-n" aria-hidden="true">${i + 1}</span><h3>${esc(b.title)}</h3><p class="lede">${esc(b.body)}</p></section>`).join('')}
      <section class="lab-beat" data-b="close"><h2>${rich(W.closing)}</h2></section>
      <div class="lab-tab">${teacherTablet(LAB_KEYS, 'lab-portal', 'The Zoovi Teacher Portal on the teacher’s tablet: the class report, one student’s report, and today’s periods with a follow-up period scheduled.')}</div>
      <div class="lab-dots" aria-hidden="true">${W.beats.map(() => '<i></i>').join('')}</div>
    </div>
  </div>

  <div id="tail" class="tail">${eduTailHtml()}</div>`;
};

/* ------------------------------------------------------------------ About ------------------------------------------------------------------ */
export const aboutHtml = () => `
  ${aboutHeroHtml()}
  <div id="tail" class="tail">${aboutTailHtml()}</div>`;

/* ------------------------------------------------------------------ FAQ ------------------------------------------------------------------ */
export const faqPageHtml = () => faqHtml();
