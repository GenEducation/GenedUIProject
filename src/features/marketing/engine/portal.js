// Ported from render_handoff_v72/prototypes/home/shared/portal.js (Zoovi website, round 1). Asset paths point at /zoovi/,
// page links at the app's routes. Builders return HTML strings; the marketing pages render them on the server.
// The Zoovi parent portal, drawn after the real product (GenedUIProject: src/features/parent, src/components/report-card),
// in the Zoovi palette. Structure, labels and features follow the app; numbers are sample data (Aarav Sharma, Grade 7, CBSE).
// Sizes use --u (1% of the screen's width), so one component works on the hero monitor, a tablet, or a card on the page.
//   Home dashboard: ParentHome.tsx, MetricCards.tsx, ActivityTrendChart.tsx, AlertsPanel.tsx, SubjectOverview.tsx
//   Subject report: SubjectHero.tsx, skill mastery groups, "Chapter by chapter"
//   Report card:    SummaryHeader.tsx, InsightsPanel.tsx, SectionCards.tsx (Study habits)
import { IPAD } from './content.js';

export const CHILD = { name: 'Aarav', full: 'Aarav Sharma', grade: 'Grade 7', board: 'CBSE Board', parent: 'Sunita', period: 'October 2026' };
// mastery bands (utils.ts): Advanced ≥80, Proficient ≥60, Approaching ≥40, Developing <40
const band = (v) => (v >= 80 ? ['Advanced', 'green'] : v >= 60 ? ['Proficient', 'lime'] : v >= 40 ? ['Approaching', 'yellow'] : ['Developing', 'paper']);
const SUBJECTS = [
  { n: 'English', v: 82, s: 18, t: '9h 20m', ch: [7, 9], icon: 'book' },
  { n: 'Mathematics', v: 68, s: 22, t: '11h 05m', ch: [5, 10], icon: 'hash' },
  { n: 'Social Science', v: 55, s: 12, t: '5h 40m', ch: [4, 11], icon: 'globe' },
  { n: 'Science', v: 47, s: 14, t: '6h 10m', ch: [3, 9], icon: 'flask' },
];
const IC = {
  home: '<path d="M4 11l8-6 8 6v8h-5v-5H9v5H4z"/>',
  card: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  swap: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8M15 11l3 3-3 3M21 14h-7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0"/>',
  score: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  skill: '<path d="M4 18l5-6 4 3 7-9"/>',
  done: '<circle cx="12" cy="12" r="8"/><path d="M8.5 12.5l2.4 2.4 4.6-5"/>',
  time: '<circle cx="12" cy="13" r="7"/><path d="M12 9v4h3M9 3h6"/>',
  book: '<path d="M5 5h6a2 2 0 0 1 1 .3A2 2 0 0 1 13 5h6v13h-6a2 2 0 0 0-1 .3 2 2 0 0 0-1-.3H5z"/>',
  hash: '<path d="M9 4L7 20M17 4l-2 16M4 9h16M3 15h16"/>',
  globe: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.6 2.5 13.4 0 16M12 4c-2.5 2.6-2.5 13.4 0 16"/>',
  flask: '<path d="M10 4h4M11 4v5l-5 9a1.5 1.5 0 0 0 1.3 2h9.4a1.5 1.5 0 0 0 1.3-2l-5-9V4"/>',
  up: '<path d="M5 15l5-5 3 3 6-6M14 7h5v5"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6"/>',
  flag: '<path d="M6 21V4M6 4h10l-2 4 2 4H6"/>',
  pdf: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M12 11v6M9.5 14.5L12 17l2.5-2.5"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5M12 8h.01"/>',
  warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  ok: '<circle cx="12" cy="12" r="8"/><path d="M8.5 12.5l2.4 2.4 4.6-5"/>',
};
const ic = (k, cls = '') => `<svg class="zp-ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;
const ring = (v, c = 'green', label = '') => `<span class="zp-ring" style="--v:${v};--c:var(--${c})"><b>${v}${label}</b></span>`;
const chip = (v) => { const [t, c] = band(v); return `<i class="zp-chip" style="--c:var(--${c})">${t}</i>`; };
const barT = (v, c) => `<span class="zp-bar"><i style="--v:${v}%;--c:var(--${c})"></i></span>`;

/* ------------------------------------------------------------------ shell ------------------------------------------------------------------ */
const NAV = [['home', 'Home'], ['card', 'Report Card'], ['swap', 'Switch Account'], ['gear', 'Settings']];
const sidebar = (active = 0) => `
  <aside class="zp-side">
    <span class="zp-logo">Zoovi<em>Parent Portal</em></span>
    <nav>${NAV.map(([k, l], i) => `<span class="zp-nav${i === active ? ' on' : ''}">${ic(k)}${l}</span>`).join('')}</nav>
    <span class="zp-side-art" aria-hidden="true"><i></i><i></i><i></i></span>
  </aside>`;
const header = (title, sub) => `
  <header class="zp-head"><span><b>${title}</b><em>${sub}</em></span><span class="zp-bell">${ic('bell')}<i></i></span></header>`;
const greet = () => header(`Good evening, ${CHILD.parent}!`, `Here’s how ${CHILD.name} is doing on their learning journey.`);

/* ------------------------------------------------------------------ home dashboard ------------------------------------------------------------------ */
// learning activity trend: daily study minutes, last 30 days
const MINS = [22, 35, 0, 28, 40, 18, 0, 30, 45, 38, 25, 0, 32, 50, 42, 20, 0, 36, 48, 55, 30, 0, 26, 44, 58, 40, 35, 0, 46, 52];
function trend(w = 100, h = 34) {
  const max = 60, step = w / (MINS.length - 1);
  const pts = MINS.map((m, i) => [i * step, h - (m / max) * (h - 3) - 1.5]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2; d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`; }
  return `<svg class="zp-trend" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="zpg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--lime)" stop-opacity=".55"/><stop offset="1" stop-color="var(--lime)" stop-opacity="0"/></linearGradient></defs>
    <path d="${d} L${w},${h} L0,${h} Z" fill="url(#zpg)"/><path d="${d}" fill="none" stroke="var(--green)" stroke-width=".8" vector-effect="non-scaling-stroke"/>
    ${pts.filter((_, i) => i % 3 === 2).map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="var(--green)"/>`).join('')}</svg>`;
}
const metrics = () => `
  <div class="zp-metrics">
    <div class="zp-card zp-metric"><span class="zp-mh">${ic('score', 'zp-ic-c')}OVERALL LEARNING SCORE</span><span class="zp-mrow"><b class="zp-big">74<small>/100</small></b>${ring(74, 'green', '%')}</span></div>
    <div class="zp-card zp-metric"><span class="zp-mh">${ic('skill', 'zp-ic-c')}SKILL INDEX</span><b class="zp-big">1.08</b>
      <span class="zp-index"><i style="--x:58%"></i></span><span class="zp-index-l"><em>Below Grade</em><em>Grade Level</em><em>Above Grade</em></span></div>
    <div class="zp-card zp-metric"><span class="zp-mh">${ic('done', 'zp-ic-c')}COMPLETED SESSIONS</span><b class="zp-big">66</b><span class="zp-up">${ic('up')}+12% this month</span></div>
    <div class="zp-card zp-metric"><span class="zp-mh">${ic('time', 'zp-ic-c')}STUDY TIME</span><b class="zp-big">32h 15m</b><span class="zp-select">Last 30 Days ▾</span></div>
  </div>`;
const ALERTS = [
  ['ok', 'green', 'Fractions & Decimals mastered', 'Aarav reached Strong on 4 fraction skills this week.'],
  ['info', 'yellow', 'Revisit due: Ratio & Proportion', 'A quick revision this weekend will keep it fresh.'],
  ['warn', 'lime', 'Science needs attention', 'Human Biology answers dipped below 40% this week.'],
];
const activityCard = () => `
  <div class="zp-card zp-trend-card"><span class="zp-ch"><b>Learning Activity Trend</b><em>Daily study minutes — last 30 days</em></span>${trend()}
    <span class="zp-axis"><em>19 Sept</em><em>26 Sept</em><em>3 Oct</em><em>10 Oct</em><em>18 Oct</em></span></div>`;
const alertsCard = (n = 3) => `
  <div class="zp-card zp-alerts"><span class="zp-ch"><b>Recent Alerts &amp; Updates</b></span>
    ${ALERTS.slice(0, n).map(([k, c, t, d]) => `<span class="zp-alert" style="--c:var(--${c})">${ic(k)}<span><b>${t}</b><em>${d}</em></span><u>View Details ›</u></span>`).join('')}</div>`;
const subjectCards = (n = 4) => `
  <div class="zp-subjects">${SUBJECTS.slice(0, n).map((s) => { const [, c] = band(s.v); return `
    <div class="zp-card zp-subj" style="--c:var(--${c})"><span class="zp-subj-h">${ic(s.icon, 'zp-ic-c')}<span><b>${s.n}</b>${chip(s.v)}</span></span>
      <span class="zp-mast"><em>Mastery</em><b>${s.v}%</b></span>${barT(s.v, c)}
      <span class="zp-mini"><span><em>SESSIONS</em><b>${s.s}</b></span><span><em>STUDY TIME</em><b>${s.t}</b></span><span><em>CHAPTERS</em><b>${s.ch[0]}/${s.ch[1]}</b></span></span></div>`; }).join('')}</div>`;
export const homeView = () => `
  ${greet()}
  <div class="zp-body">
    ${metrics()}
    <div class="zp-row2">${activityCard()}${alertsCard(2)}</div>
    <span class="zp-ch zp-sec"><b>Subject Overview</b><em>Click any subject to explore detailed chapter-level progress</em></span>
    ${subjectCards()}
  </div>`;

/* ------------------------------------------------------------------ subject report ------------------------------------------------------------------ */
const SKILLS = [['Fractions & Decimals', 86], ['Integers', 74], ['Algebraic Expressions', 63], ['Ratio & Proportion', 52], ['Lines & Angles', 44], ['Data Handling', 33]];
const CHAPTERS = [['Integers', 100, 81, '3h 0m', 6], ['Fractions and Decimals', 85, 86, '2h 30m', 5], ['Data Handling', 60, 33, '1h 35m', 3], ['Simple Equations', 40, 58, '1h 10m', 2]];
const subjectHero = () => `
  <div class="zp-card zp-shero"><span class="zp-eyebrow">SUBJECT REPORT</span>
    <span class="zp-shero-row">${ring(68, 'lime')}<span><b class="zp-sname">Mathematics ${chip(68)}</b>
      <em>Aarav is doing well in Mathematics. Strongest in Fractions &amp; Decimals, while Data Handling needs more practice.</em></span></span>
    <span class="zp-scale">${[['Developing', '0–39', 'paper'], ['Approaching', '40–59', 'yellow'], ['Proficient', '60–79', 'lime', 'on'], ['Advanced', '80+', 'green']].map(([n, r, c, on]) => `<i style="--c:var(--${c})" class="${on || ''}"><b>${n}</b>${r}</i>`).join('')}</span></div>`;
const skillsView = (max = 99) => {
  const grp = [['Strengths', '60 and above', (v) => v >= 60], ['Building up', '40 to 59', (v) => v >= 40 && v < 60], ['Needs attention', 'Below 40', (v) => v < 40]];
  return `<div class="zp-card zp-skills"><span class="zp-eyebrow">SKILL MASTERY</span><b class="zp-h2">Where Aarav stands</b>
    ${grp.filter(([, , f]) => SKILLS.slice(0, max).some(([, v]) => f(v))).map(([t, r, f]) => `<span class="zp-grp"><b>${t}</b><em>${r}</em></span>${SKILLS.slice(0, max).filter(([, v]) => f(v)).map(([n, v]) => { const [, c] = band(v); return `
      <span class="zp-skill"><span>${n}</span><em>${Math.round(v / 11)} concepts · ${Math.round(v / 4)} checks</em>${barT(v, c)}</span>`; }).join('')}`).join('')}</div>`;
};
const chaptersView = () => `
  <div class="zp-card zp-chapters"><span class="zp-eyebrow">CHAPTERS</span><b class="zp-h2">Chapter by chapter</b>
    ${CHAPTERS.map(([n, cov, m, t, s]) => { const [, c] = band(m); return `<span class="zp-chap"><b>${n}</b><em>Covered ${cov}%</em>${barT(cov, 'green')}<span class="zp-m" style="--c:var(--${c})">${m}</span><em>${s} sessions · ${t}</em></span>`; }).join('')}</div>`;
const helpCard = () => `
  <div class="zp-card zp-help"><span class="zp-eyebrow">AT HOME THIS WEEK</span><b>How you can help Aarav</b>
    <em>Spend ten minutes on Data Handling together this week: sort his week’s pocket money into a bar chart.</em>
    <em>Celebrate Fractions &amp; Decimals: he reached Strong on all four skills.</em></div>`;

/* ------------------------------------------------------------------ report card ------------------------------------------------------------------ */
const DAYS = [3, 5, 0, 4, 6, 2, 0, 5, 7, 4, 3, 0, 6, 8, 5, 2, 0, 4, 7, 9, 5, 0, 3, 6, 8, 6, 4, 0, 7, 9];
const habits = () => `
  <div class="zp-card zp-habits"><span class="zp-ch"><b>Study habits</b><em>The last 30 days</em></span>
    <span class="zp-hstats"><span><b>6</b><em>Day streak</em><small>Best 9</small></span><span><b>23</b><em>Active days</em><small>of 30</small></span><span><b>32h</b><em>Study time</em><small>Estimated</small></span></span>
    <span class="zp-days">${DAYS.map((d, i) => `<i style="--h:${d ? 14 + d * 9 : 6}%" class="${!d ? 'off' : i >= 24 ? 'streak' : ''}"></i>`).join('')}</span>
    <span class="zp-legend"><em class="a">Answered</em><em class="o">Opened only</em><em class="s">Streak day</em></span></div>`;
const insights = () => `
  <div class="zp-card zp-insights"><span class="zp-ch"><b>Key Insights</b><em>A short summary of how things are going</em></span>
    <span class="zp-ins" style="--c:var(--green)"><b>Working well</b><em>Algebra is clicking: Aarav explains his steps and gets most fraction questions right first time.</em></span>
    <span class="zp-ins" style="--c:var(--yellow)"><b>Needs attention</b><em>Geometry needs more visual practice; Human Biology answers dipped this month.</em></span>
    <span class="zp-ins" style="--c:var(--lime)"><b>Next steps</b><em>Revisit Lines &amp; Angles with drawings, and a short Science recap each weekend.</em></span>
    <i class="zp-ai">${ic('spark')}Powered by GenEd AI</i></div>`;
const summary = (pdfOn = false) => `
  <div class="zp-card zp-summary">
    <span class="zp-who"><i class="zp-av">A</i><span><b>${CHILD.full}</b><em>${CHILD.grade} • ${CHILD.board}</em></span>
      <i class="zp-period">${CHILD.period}</i><i class="zp-pdf${pdfOn ? ' on' : ''}">${ic('pdf')}Download PDF</i></span>
    <span class="zp-sum-row">${ring(72, 'lime', '%')}<span class="zp-sum-l"><b>Overall Progress</b></span>
      <span class="zp-sstats"><span><em>Average Mastery</em><b>63%</b></span><span><em>Chapters Completed</em><b>19 / 39</b></span><span><em>Right Answers</em><b>412 / 540</b></span></span></span>
    <span class="zp-callouts"><span style="--c:var(--green)">${ic('trophy')}<em>Strongest Subject</em><b>English (82%)</b></span><span style="--c:var(--yellow)">${ic('flag')}<em>Needs Attention</em><b>Science (47%)</b></span></span>
  </div>`;
const subjectRows = (max = 4) => `
  <div class="zp-card zp-srows"><span class="zp-ch"><b>Subjects &amp; Chapters</b><em>Tap a subject to preview its chapters and mastery</em></span>
    ${SUBJECTS.slice(0, max).map((s) => { const [, c] = band(s.v); return `<span class="zp-srow">${ic(s.icon, 'zp-ic-c')}<b>${s.n}</b>${ring(s.v, c)}<span class="zp-cov"><em>Coverage</em>${barT(Math.round(s.ch[0] / s.ch[1] * 100), 'green')}</span><em>${s.ch[0]}/${s.ch[1]} chapters · ${s.s} sessions</em></span>`; }).join('')}</div>`;
/** The report card on its own (no app chrome): the page's "our report card" in the reveal. */
export const reportCardView = () => `
  <div class="zp zp-rc" role="img" aria-label="The Zoovi report card for Aarav Sharma, Grade 7: 72% overall progress, average mastery 63%, 19 of 39 chapters completed, English strongest at 82%, Science needs attention at 47%, key insights on what is working well, what needs attention and next steps, and study habits for the last 30 days.">
    <div aria-hidden="true">${summary()}<div class="zp-rc-grid">${insights()}${habits()}</div></div>
  </div>`;

/* ------------------------------------------------------------------ devices ------------------------------------------------------------------ */
/** The full parent home on a 16:9 desktop screen (the hero monitor's texture: tools/parents/desktop.html). */
export const portalDesktop = () => `<div class="zp zp-desk">${sidebar(0)}<main class="zp-main">${homeView()}</main></div>`;

// tablet screens: a slim icon rail instead of the sidebar, one view per screen
const rail = (active) => `<aside class="zp-rail"><span class="zp-logo-s">Z</span>${NAV.map(([k], i) => `<span class="zp-nav${i === active ? ' on' : ''}">${ic(k)}</span>`).join('')}</aside>`;
const TABLET_VIEWS = [
  // 0 · daily learning updates: home, activity and updates
  [0, () => `${greet()}<div class="zp-body">${metrics()}<div class="zp-row2">${activityCard()}${alertsCard(2)}</div></div>`],
  // 1 · subject and chapter progress: overview, then chapter by chapter
  [0, () => `${header('Subject Overview', 'Click any subject to explore detailed chapter-level progress')}<div class="zp-body">${subjectCards()}${chaptersView()}</div>`],
  // 2 · understanding and skill development: the subject report
  [0, () => `${header('Mathematics', 'Subject report')}<div class="zp-body zp-two">${subjectHero()}${helpCard()}${skillsView(4)}</div>`],
  // 3 · learning activity: study habits and time
  [1, () => `${header('Report Card', CHILD.period)}<div class="zp-body">${metrics()}<div class="zp-two">${habits()}${activityCard()}</div></div>`],
  // 4 · shareable reports: the report card, ready to download and share with teachers
  [1, () => `${header('Report Card', CHILD.period)}<div class="zp-body">${summary(true)}${subjectRows(2)}</div>`],
  // 5 · the whole report card at a glance (the reveal on the page): summary, key insights, study habits
  [1, () => `${header('Report Card', CHILD.period)}<div class="zp-body">${summary()}<div class="zp-rc-grid">${insights()}${habits()}</div></div>`, 'zp-tab-rc'],
];
const tabletScreen = (i) => { const [nav, view, cls = ''] = TABLET_VIEWS[i]; return `<div class="zp zp-tab ${cls}">${rail(nav)}<main class="zp-main">${view()}</main></div>`; };
/** One portal view on a tablet. */
export const portalTablet = (view = 0, cls = '') => IPAD(`<div class="zp-host">${tabletScreen(view)}</div>`,
  'The Zoovi Parent Portal on a tablet: Aarav’s home dashboard with overall learning score, skill index, completed sessions, study time, the learning activity trend and recent updates.', `pp-portal ${cls}`, 'zp-screen');
/** The five dashboard features, one portal view each, switched by the list beside it. */
export const featureTablet = () => IPAD(`<div class="zp-host pf-stage">${TABLET_VIEWS.slice(0, 5).map((_, i) => `<div class="pf-panel${i === 0 ? ' on' : ''}" data-i="${i}">${tabletScreen(i)}</div>`).join('')}</div>`,
  'The Zoovi Parent Portal on a tablet. Its screen changes with the feature selected beside it: the home dashboard with daily activity, subject and chapter progress, skill mastery, study habits, and the report card ready to download and share.', 'pf-tab-wrap', 'zp-screen');

/** A plain school report card: letter grades and one remark, the "periodic snapshot". Same size as the Zoovi report card. */
export const basicReportCard = (landscape = false) => `
  <div class="zp-basic${landscape ? ' zp-basic-land' : ''}" role="img" aria-label="A plain school report card for Term 1: letter grades for Mathematics, Science, English and Social Science, attendance, and a one-line remark.">
    <div aria-hidden="true">
      <span class="zb-h"><b>Progress Report</b><em>Term 1 · 2026–27</em></span>
      <span class="zb-who"><span>Name: <b>Aarav Sharma</b></span><span>Class: <b>VII-B</b></span><span>Roll no.: <b>14</b></span></span>
      <span class="zb-cols"><span class="zb-table"><i>Subject</i><i>Grade</i>${[['English', 'A'], ['Mathematics', 'B+'], ['Social Science', 'B'], ['Science', 'C+']].map(([s, g]) => `<span>${s}</span><b>${g}</b>`).join('')}</span>
      <span class="zb-side"><span class="zb-att">Attendance: <b>92%</b></span>
      <span class="zb-rem"><em>Class teacher’s remark</em>Good. Can do better in Science.</span>
      <span class="zb-sign"><i>Class teacher</i><i>Principal</i><i>Parent</i></span></span></span>
    </div>
  </div>`;
