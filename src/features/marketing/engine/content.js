// Ported from render_handoff_v72/prototypes/home/shared/content.js (Zoovi website, round 1). Asset paths point at /zoovi/,
// page links at the app's routes. Builders return HTML strings; the marketing pages render them on the server.
// Copy for all three experiments, verbatim from "GenED-Website-Homepage v5-Nov '26".
// CTA hrefs: known targets are real; the rest are '#' and carry todo:true (rendered as data-todo).

// The How Zoovi Works page isn't built yet: its links stay '#' with data-todo, like the other unbuilt targets.
const HOW = '#';
const HOME = '/';
const MAIL = 'mailto:info@gened.ai';
const PARENTS = '/for-parents';
const EDUCATORS = '/for-educators';

export const content = {
  hero: {
    eyebrow: 'Meet Zoovi',
    title: 'Companion for *curious minds*',
    lede: 'Zoovi is an AI-powered, voice-led learning companion that helps children explore ideas and understand concepts in an interactive and engaging way, while giving parents a better window into their child’s learning journey.',
    ctas: [
      { label: 'See How Zoovi Works', href: HOW, todo: true },
      { label: 'Get an Invite', href: MAIL, ghost: true },
    ],
    visual: 'Hero film',
  },
  parents: {
    title: 'You see the marks. But do you see ~the learning?~',
    lede: 'Zoovi gives you a closer view of your child’s learning journey through the Parent Dashboard.',
    points: [
      'Day-to-day visibility into learning progress',
      'Clarity on concepts understood and areas that need more practice',
      'Insight into your child’s questions, interests and discoveries',
      'Guidance on where your support can make a difference',
    ],
    cta: { label: 'Explore Zoovi for Parents', href: PARENTS },
    visual: 'Parent Dashboard',
  },
  ways: {
    title: 'One learning companion. *A seamless learning experience.*',
    device: {
      title: 'Zoovi Companion',
      body: 'A personalised, AI-enabled learning companion that brings voice-led interaction and visual explanations together in a focused learning environment.',
      cta: { label: 'Explore the Zoovi Device', href: '#', todo: true },
    },
    web: {
      title: 'Zoovi Web',
      body: 'An interactive web-based learning experience with guided lessons, visual explanations and a student dashboard to follow learning activity.',
      cta: { label: 'Explore the Zoovi Web App', href: '#', todo: true },
      visual: 'Zoovi Web App',
    },
  },
  does: {
    title: 'A new way to ask. A ^better^ way to learn.',
    verbs: 'Ask. Understand. Practise. Explore.',
    intro: 'Zoovi turns learning into an engaging conversation. Children can:',
    beats: [
      { verb: 'Ask', title: 'Ask questions', line: 'Clear doubts about school lessons.', face: 'listening', screen: 'ask' },
      { verb: 'Understand', title: 'Understand concepts', line: 'Explore difficult topics through guided explanations and visuals.', face: 'thinking', screen: 'understand' },
      { verb: 'Practise', title: 'Revise and practise', line: 'Reinforce learning and sharpen skills.', face: 'encourage', screen: 'practise' },
      { verb: 'Explore', title: 'Discover more', line: 'Explore topics beyond the curriculum and follow their curiosity.', face: 'happy', screen: 'explore' },
    ],
    outro: 'All within a dedicated learning environment ~designed for children.~',
    ctas: [
      { label: 'See Zoovi in Action', href: '#', todo: true },
    ],
    visual: 'Product demo',
  },
  approach: {
    title: 'Learning that builds *understanding*',
    intro: 'Zoovi brings together the elements that make learning meaningful:',
    pillars: [
      { title: 'Child-first', body: 'An initial assessment helps establish a starting point.' },
      { title: 'Curiosity-led', body: 'Children explore questions and topics of interest in a safe environment.' },
      { title: 'Curriculum-aligned', body: 'Supports NCERT and NEP 2020 learning outcomes.' },
      { title: 'Skill-based', body: 'Helps children build skills through understanding and practice.' },
      { title: 'School-connected', body: 'Schools can bring their own learning materials into the experience.' },
      { title: 'Safe and secure', body: 'A dedicated learning environment that prioritises children’s safety and privacy.' },
    ],
    cta: { label: 'Discover How Zoovi Works', href: HOW, todo: true },
  },
  educators: {
    eyebrow: 'For educators',
    title: 'Give every student ~more opportunities~ to learn',
    lede: 'Zoovi adds another layer of learning support for students, while keeping teachers integral to their learning journey.',
    benefits: [
      { title: 'Track student progress', body: 'Get insights into each student’s progress and understanding through daily reports.' },
      { title: 'Extend classroom learning', body: 'Revisit and explore concepts beyond lessons.' },
      { title: 'Support individual needs', body: 'Encourage questions and practise at each student’s pace.' },
      { title: 'Connect with your curriculum', body: 'Bring school learning materials into Zoovi.' },
      { title: 'Encourage independent learning', body: 'Let students explore while teachers guide their learning.' },
      { title: 'Go beyond prescribed textbooks', body: 'Bring trusted supplementary resources into Zoovi.' },
    ],
    ctas: [
      { label: 'Explore Zoovi for Educators', href: EDUCATORS },
      { label: 'Register for the Educator’s Programme', href: MAIL, ghost: true },
    ],
  },
  closing: {
    title: 'Give every question *room to grow.*',
    lede: 'Discover a more engaging way for your child to learn, understand and explore.',
    ctas: [
      { label: 'Get an Invite', href: MAIL },
      { label: 'Talk to Us', href: MAIL, ghost: true },
    ],
  },
  footer: {
    tagline: 'Companion for curious minds',
    // the link columns beside the brand
    columns: [
      { title: 'Explore', links: [
        { label: 'Home', href: HOME },
        { label: 'For Parent', href: PARENTS },
        { label: 'For Educators', href: EDUCATORS },
      ] },
      { title: 'Company', links: [
        { label: 'About', href: '#', todo: true },
        { label: 'Contact', href: MAIL },
      ] },
    ],
    note: 'Zoovi is a GenEd product. GenEd is an AI technology company specialising in education products.',
  },
};

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Plain text of a marked-up string (markers removed), for aria-labels and anywhere styling can't go. */
export const plain = (s) => String(s).replace(/[*~^]/g, '');
/**
 * Headline emphasis in logo colours, without changing the words:
 *   *phrase*  lime highlighter swipe     ~phrase~  thick yellow underline     ^phrase^  green chip, paper text
 */
export const rich = (s) => esc(s)
  .replace(/\*([^*]+)\*/g, '<mark class="hl">$1</mark>')
  .replace(/~([^~]+)~/g, '<span class="ul">$1</span>')
  .replace(/\^([^^]+)\^/g, '<span class="chip">$1</span>');

const ARROW = '<svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
/** A CTA pill. Primary pills carry the arrow; ghost pills don't. */
export const link = (c, extra = '') =>
  `<a class="pill${c.ghost ? ' ghost' : ''}${extra ? ' ' + extra : ''}" href="${esc(c.href)}"${c.todo ? ' data-todo' : ''}><span>${esc(c.label)}</span>${c.ghost ? '' : ARROW}</a>`;

/** A question mark whose dot sprouts into a seedling as the FAQ scrolls in (from the Zoovi landing page). Drive it with --p (0..1). */
export const growingQuestion = () => `
  <div class="grow" aria-hidden="true">
    <svg viewBox="0 0 200 300">
      <path class="grow-q" pathLength="1" d="M48 92c0-40 26-62 56-62 33 0 54 22 54 50 0 28-18 40-36 52-14 9-22 20-22 40v16"/>
      <path class="grow-stem" pathLength="1" d="M100 262c0-30 2-52 8-76"/>
      <path class="grow-leaf grow-leaf-l" d="M104 222c-24-2-44-14-50-36 22-2 42 8 50 36z"/>
      <path class="grow-leaf grow-leaf-r" d="M106 200c10-26 32-40 58-38-4 24-26 38-58 38z"/>
      <ellipse class="grow-soil" cx="100" cy="266" rx="34" ry="10"/>
    </svg>
  </div>`;

export const ctas = (list) => `<div class="ctas">${list.map((c) => link(c)).join('')}</div>`;

/** The Zoovi Web visual: a real lesson screen from the web app (GenedUIProject /dev/lesson-fit), cropped round. */
// Zoovi Web on a tablet: the lesson screen's own layout (progress rail, board, chat), drawn in the brand colours,
// with a lesson in progress. Zoovi asks about the digits of 1400, the student answers, the digits roll into 5.
// Loops every 12s; shows the finished state with reduced motion.
export const webTablet = (cls = '') => `
  <figure class="tab ${cls}" role="img" aria-label="Zoovi Web on a tablet: a live maths lesson. Zoovi asks what the digits of 1400 add up to, the student answers 5, and the board shows 1 + 4 + 0 + 0 rolling into 5.">
    <div class="ipad" aria-hidden="true"><i class="ipad-btn top"></i><i class="ipad-btn vol"></i><div class="bezel"><i class="cam"></i>
    <div class="tab-screen">
      <div class="tb-top">
        <span class="tb-crumb">Mathematics <i>›</i> <b>Number Play</b></span>
        <span class="tb-live"><i></i>Live lesson</span>
        <span class="tb-step">Step 2 of 5</span>
      </div>
      <div class="tb-side">
        <span class="tb-h">Lesson progress</span>
        <ol class="tb-steps">
          <li class="done"><i></i>Counting digits</li>
          <li class="now"><i></i>Adding digits</li>
          <li><i></i>Digit puzzles</li>
          <li><i></i>Quick check</li>
        </ol>
        <span class="tb-bar"><i></i></span>
      </div>
      <div class="tb-board">
        <span class="tb-title">Playing with digits</span>
        <span class="tb-sum">
          ${['1', '4', '0', '0'].map((d, i) => `<b class="tb-d" style="--x:${[-13.5, -4.5, 4.5, 13.5][i]}cqw;--i:${i}">${d}</b>`).join('')}
          ${[-9, 0, 9].map((x) => `<i class="tb-plus" style="--x:${x}cqw">+</i>`).join('')}
          <b class="tb-ans">5</b>
          <em class="tb-note">1 + 4 + 0 + 0 = 5</em>
        </span>
        <span class="tb-voice"><span class="tb-av"><i></i><i></i></span><span class="tb-wave">${'<i></i>'.repeat(14)}</span><span class="tb-say">Zoovi is explaining…</span></span>
      </div>
      <div class="tb-chat">
        <span class="tb-msg z m1">What do you get when you add up the digits of 1400?</span>
        <span class="tb-typing"><i></i><i></i><i></i></span>
        <span class="tb-msg s m2">1 + 4 + 0 + 0… it’s 5!</span>
        <span class="tb-msg z m3">Exactly! Zeros add nothing. Try it for 2025?</span>
        <span class="tb-input">Ask Zoovi anything…<i></i></span>
      </div>
    </div>
    <i class="glass"></i></div></div>
  </figure>`;

// The Parent Dashboard on the same iPad, designed in the Zoovi palette (not the app's current styling).
// One panel per parent point: this week (visibility), concepts (clarity), curious about (insight), where you can help (guidance).
export const parentTablet = (cls = '') => `
  <figure class="tab ${cls}" role="img" aria-label="The Zoovi Parent Dashboard on a tablet: five learning days this week, 72% overall progress, 38 questions asked, concepts marked understood, practising or needing practice, the topics the child is curious about, and a tip on where a parent can help.">
    <div class="ipad" aria-hidden="true"><i class="ipad-btn top"></i><i class="ipad-btn vol"></i><div class="bezel"><i class="cam"></i>
    <div class="tab-screen pd">
      <div class="tb-top">
        <span class="pd-brand">Parent Dashboard</span>
        <span class="pd-kid"><i>A</i>Aarav · Grade 5</span>
        <span class="tb-step">This week</span>
      </div>
      <div class="pd-card pd-week">
        <span class="pd-h">Learning days</span>
        <span class="pd-days">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => `<span class="pd-day${[0, 1, 2, 4, 5].includes(i) ? ' on' : ''}" style="--i:${i}"><i></i>${d}</span>`).join('')}</span>
        <span class="pd-sub">5 days · 2 h 10 min</span>
      </div>
      <div class="pd-card pd-prog">
        <span class="pd-ring" style="--v:72"><b>72%</b></span>
        <span><span class="pd-h">Overall progress</span><span class="pd-sub">+8% since last week</span></span>
      </div>
      <div class="pd-card pd-qs">
        <span class="pd-h">Questions asked</span>
        <span class="pd-big">38</span>
        <span class="pd-spark">${[30, 45, 38, 62, 80].map((h, i) => `<i style="--h:${h}%;--i:${i}"></i>`).join('')}</span>
      </div>
      <div class="pd-card pd-concepts">
        <span class="pd-h">Concepts</span>
        ${[['Fractions', 92, 'green', 'Understood'], ['Place value', 84, 'green', 'Understood'], ['Decimals', 64, 'lime', 'Practising'], ['Patterns', 52, 'lime', 'Practising'], ['Measurement', 34, 'yellow', 'Needs practice']].map(([n, v, c, t], i) => `
        <span class="pd-row"><span class="pd-name">${n}</span><span class="pd-bar"><i style="--v:${v}%;--c:var(--${c});--i:${i}"></i></span><span class="pd-tag" style="--c:var(--${c})">${t}</span></span>`).join('')}
      </div>
      <div class="pd-side">
        <div class="pd-card pd-curious">
          <span class="pd-h">Curious about</span>
          <span class="pd-chips"><i>Volcanoes</i><i>Why is the sky blue?</i><i>Planets</i></span>
        </div>
        <div class="pd-card pd-help">
          <span class="pd-h">Where you can help</span>
          <span>Try 10 minutes of decimals together this weekend.</span>
        </div>
      </div>
    </div>
    <i class="glass"></i></div></div>
  </figure>`;


// The educator view on the same iPad: one screen per benefit, switched by the list beside it.
export const IPAD = (inner, label, cls = '', screen = 'tc') => `
  <figure class="tab ${cls}" role="img" aria-label="${esc(label)}">
    <div class="ipad" aria-hidden="true"><i class="ipad-btn top"></i><i class="ipad-btn vol"></i><div class="bezel"><i class="cam"></i>
    <div class="tab-screen ${screen}">${inner}</div>
    <i class="glass"></i></div></div>
  </figure>`;
const bar = (v, c = 'green') => `<span class="tc-bar"><i style="--v:${v}%;--c:var(--${c})"></i></span>`;
const av = (n, c = 'yellow') => `<i class="tc-av" style="--c:var(--${c})">${n}</i>`;
const tag = (t, c) => `<i class="tc-tag" style="--c:var(--${c})">${t}</i>`;
// raw status pills, as the lab screens print them (SCHEDULED, ACTIVE, COMPLETED, ...)
const pill = (t, c = 'paper') => `<i class="tc-pill" style="--c:var(--${c})">${t}</i>`;
const ICON = {
  cls: '<path d="M4 19c.5-3 2.6-4.8 5-4.8s4.5 1.8 5 4.8"/><circle cx="9" cy="8.5" r="2.8"/><path d="M15.5 6.2a2.6 2.6 0 0 1 0 5M17 14.6c1.6.5 2.7 2 3 4.4"/>',
  lab: '<rect x="3.5" y="5" width="11" height="8" rx="1.5"/><path d="M7 17h4M9 13v4"/><rect x="16.5" y="8" width="4.5" height="9" rx="1.2"/>',
  an: '<path d="M5 19V11M10 19V6M15 19v-5M20 19V9"/>',
  sub: '<path d="M5 5.5h5.5a2 2 0 0 1 1.5.7 2 2 0 0 1 1.5-.7H19v12.5h-5.5a2 2 0 0 0-1.5.7 2 2 0 0 0-1.5-.7H5z"/>',
  out: '<path d="M14 7V5H5v14h9v-2M10 12h10M17 9l3 3-3 3"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  up: '<path d="M12 16V5M7 10l5-5 5 5M5 19h14"/>',
};
const ico = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;
const back = (t) => `<span class="tc-back">${ico('back')}${t}</span>`;

/*
 * The Teacher Portal, drawn only from screens that exist in GenedUIProject (src/features/teacher, src/features/lab,
 * src/components/report-card, src/features/partner), with their real labels. Laid out after the Figma
 * "Lab mode – teacher demo", redrawn in the Zoovi palette. Figma-only extras (At a glance, per-skill bars,
 * Suggested next steps, GenEd's note) are left out until the product has them.
 * Sample class: Grade 7A Mathematics, teacher Priya Sharma, student names from the Figma.
 * nav: which sidebar item is lit (teacher: 'cls' My Class, 'lab' Lab Mode; partner: 'an' Analytics, 'sub' Subjects).
 */
const KIDS = [['AP', 'Aarav Patil'], ['DK', 'Diya Kulkarni'], ['IJ', 'Ishaan Joshi'], ['KD', 'Kavya Deshmukh'], ['SK', 'Sara Khan'], ['VR', 'Vihaan Rao'],
  ['AI', 'Ananya Iyer'], ['KS', 'Kabir Singh'], ['MN', 'Meera Nair'], ['AR', 'Arjun Reddy'], ['ZS', 'Zoya Sheikh'], ['NB', 'Neel Bhatt']];
const DESK = (n) => `LAB_11${String(n).padStart(2, '0')}`;
const periodHead = (st, c, btn) => `<span class="tc-head">${back('Back to schedule')}</span>
   <span class="tc-head"><b><em>Grade 7A · Mathematics</em>Fractions and decimals</b>${pill(st, c)}${btn}</span>`;

export const TEACHER_PANELS = {
  // S2 · Lab Mode: Today's Periods (features/lab/components/SlotScheduler.tsx)
  periods: { nav: 'lab', portal: 'teacher', html: `
   <span class="tc-head"><b><em>School Lab Mode</em>Today’s Periods</b><i class="tc-select">Thu, 14 Nov</i><i class="tc-btn ghost">Create class</i><i class="tc-btn">Schedule period</i></span>
   <span class="tc-periods">${[
     ['08:40', '09:20', 'Grade 6A · Mathematics', 'Chapter Practice', 'Fractions', 'COMPLETED', 'green', ['View report']],
     ['10:00', '10:40', 'Grade 7A · Mathematics', 'Chapter Practice', 'Fractions and decimals', 'COMPLETED', 'green', ['View report']],
     ['11:20', '12:00', 'Grade 7B · Mathematics', 'Chapter Practice', 'Integers', 'ACTIVE', 'lime', ['Run period']],
     ['13:00', '13:40', 'Grade 8A · Mathematics', 'Chapter Practice', 'Linear equations', 'CANCELLED', 'paper', []],
     ['14:20', '15:00', 'Grade 7A · Mathematics', 'Gap Recovery', 'Fractions and decimals', 'SCHEDULED', 'yellow', ['Cancel', 'Run period'], 1],
   ].map(([a, b, cl, mode, ch, st, c, acts, fresh], n) =>
     `<span class="tc-period${st === 'CANCELLED' ? ' off' : ''}${fresh ? ' fresh' : ''}" style="--i:${n + 1}"><span class="tc-time"><b>${a}</b><em>${b}</em></span><span><b>${cl}</b><em>${a}–${b} · ${mode} · ${ch}</em></span>${pill(st, c)}<span class="tc-acts">${acts.map((t) => `<i class="tc-btn${t === 'Run period' ? '' : ' ghost'}">${t}</i>`).join('')}</span></span>`).join('')}</span>` },

  // S3 · Run period, before activation: seating (RunPeriod.tsx + PreActivationSeating.tsx)
  seating: { nav: 'lab', portal: 'teacher', html: `
   ${periodHead('SCHEDULED', 'yellow', '<i class="tc-btn">Activate period</i>')}
   <span class="tc-banner" style="--i:0"><b>11 of 12 desks online · ready to reserve</b></span>
   <span class="tc-head"><b class="tc-h3">Seat students before activation</b><i class="tc-toggle on">Automatic allocation</i></span>
   <span class="tc-sub">Drag students onto online devices. Anyone left unassigned is seated automatically in roll-number order.</span>
   <span class="tc-split seat">
     <span class="tc-list">${KIDS.slice(8).map(([i, n], k) => `<span class="tc-li${k === 0 ? ' sel' : ''}" style="--i:${k + 1}">${av(i, 'lime')}<span><b>${n}</b></span></span>`).join('')}</span>
     <span class="tc-desks">${Array.from({ length: 12 }, (_, n) => {
       const who = n < 8 ? KIDS[n][1] : '', st = n === 5 ? 'Offline' : n === 11 ? 'Reserved spare' : '';
       return `<span class="tc-seat${st ? ' dim' : ''}${who ? ' set' : ''}" style="--i:${n + 5}"><b>${DESK(n + 1)}</b>${who ? `<em>${who}</em>` : `<em>${st || 'Drop a student here'}</em>`}</span>`;
     }).join('')}</span>
   </span>` },

  // S4 · Run period, active: the live room (LiveBoard.tsx)
  live: { nav: 'lab', portal: 'teacher', html: `
   ${periodHead('ACTIVE', 'lime', '<i class="tc-btn">End period</i>')}
   <span class="tc-split room">
     <span class="tc-card"><span class="tc-head"><b class="tc-h3">Room layout</b><i class="tc-btn ghost">Refresh</i></span>
       <span class="tc-desks">${Array.from({ length: 12 }, (_, n) => {
         const k = n < 11 ? KIDS[n] : null;
         const st = n === 11 ? '' : ['ACTIVE', 'ACTIVE', 'CONFIRMED', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'COMPLETED', 'ACTIVE', 'ASSIGNED', 'ACTIVE', 'ACTIVE'][n];
         const c = { ACTIVE: 'lime', CONFIRMED: 'green', ASSIGNED: 'yellow', COMPLETED: 'paper' }[st];
         return `<span class="tc-desk2" style="--i:${n}"><em><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/></svg>${DESK(n + 1)}${n === 11 ? ' <i class="tc-spare">Spare</i>' : ''}</em>${k ? `<b>${k[1]}</b>${pill(st, c)}` : '<b class="free">Free desk</b>'}</span>`;
       }).join('')}</span>
     </span>
     <span class="tc-card"><b class="tc-h3">Roster</b>
       ${[[3, 'confirm'], [9, 'confirm'], [1, 'reassign'], [11, 'absent']].map(([k, a], m) => `<span class="tc-rr" style="--i:${m + 12}"><span><b>#${k} ${KIDS[k - 1][1]}</b><em>${k === 11 ? 'No device' : DESK(k)}</em></span>${a === 'confirm' ? '<i class="tc-btn">Confirm</i>' : a === 'reassign' ? '<i class="tc-btn ghost">Reassign</i>' : '<i class="tc-btn ghost">Absent</i>'}</span>`).join('')}
     </span>
   </span>` },

  // S5 · Run period, completed: the class report (ClassReport.tsx)
  report: { nav: 'lab', portal: 'teacher', html: `
   ${periodHead('COMPLETED', 'green', '')}
   <span class="tc-stats five">${[['Total', 12, 'ink'], ['Attended', 11, 'lime'], ['Completed', 8, 'green'], ['Incomplete', 3, 'yellow'], ['Absent / Not served', 1, 'paper']].map(([l, v, c], n) =>
     `<span class="tc-stat" style="--i:${n + 1};--c:var(--${c})"><b>${v}</b><em>${l}</em></span>`).join('')}</span>
   <span class="tc-split rep">
     <span class="tc-card"><b class="tc-h3">Class roster</b>
       <span class="tc-rt th"><em>Student</em><em>Status</em><em>Device</em></span>
       ${[[0, 'Completed', 'green'], [1, 'Completed', 'green'], [3, 'Incomplete', 'yellow', 1], [8, 'Incomplete', 'yellow'], [10, 'Absent', 'paper']].map(([k, st, c, open], m) =>
         `<span class="tc-rt${open ? ' open' : ''}" style="--i:${m + 6}"><b>${av(KIDS[k][0], 'lime')}${KIDS[k][1]}</b>${tag(st, c)}<em>${st === 'Absent' ? '—' : DESK(k + 1)}</em>${open ? `<span class="tc-lr"><i class="tc-link">Hide learning report</i><span>Mastery 49%</span><span>Chapter covered 62%</span></span>` : ''}</span>`).join('')}
     </span>
     <span class="tc-col">
       <span class="tc-card" style="--i:12"><b class="tc-h3">Follow-up list</b>${[[3, 'Incomplete'], [8, 'Incomplete'], [7, 'Incomplete']].map(([k, st]) => `<span class="tc-fu">${av(KIDS[k][0], 'yellow')}<span><b>${KIDS[k][1]}</b><em>${st}</em></span></span>`).join('')}</span>
       <span class="tc-card" style="--i:13"><b class="tc-h3">Common gaps</b>${[['Converting fractions to decimals', 54, 4], ['Multiplying fractions', 66, 2]].map(([t, v, s]) => `<span class="tc-gap"><b>${t}</b><em>Avg mastery ${v}% · ${s} students</em></span>`).join('')}</span>
     </span>
   </span>` },

  // S6 · One student's report (components/report-card, role="teacher")
  student: { nav: 'cls', portal: 'teacher', html: `
   <span class="tc-head">${back('Back to class')}<i class="tc-btn ghost">Download PDF</i></span>
   <span class="tc-head">${av('AP', 'yellow')}<b><em>Grade 7A · Mathematics</em>Aarav Patil</b></span>
   <span class="tc-sum">
     <span class="tc-ringstat" style="--i:0"><span class="pd-ring" style="--v:72"><b>72%</b></span><em>Overall Progress</em></span>
     ${[['77%', 'Average Mastery', 'lime'], ['4', 'Chapters Completed', 'green'], ['186', 'Right Answers', 'yellow'], ['6', 'Tests', 'ink']].map(([v, l, c], n) =>
       `<span class="tc-stat" style="--i:${n + 1};--c:var(--${c})"><b>${v}</b><em>${l}</em></span>`).join('')}
   </span>
   <span class="tc-card"><span class="tc-head"><b class="tc-h3">Subjects &amp; Chapters</b><span class="tc-tabs">${['Chapters', 'Skills', 'Tests', 'Insights'].map((t, n) => `<i class="${n ? '' : 'on'}">${t}</i>`).join('')}</span></span>
     ${[['Integers', 89, 'Completed', 'green'], ['Fractions and decimals', 77, 'Completed', 'green'], ['Data handling', 83, 'Completed', 'green'], ['Simple equations', 73, 'In progress', 'lime'], ['Lines and angles', 61, 'In progress', 'lime'], ['Triangles', 0, 'Not started', 'paper']].map(([n, v, t, c], m) =>
       `<span class="tc-cr" style="--i:${m + 5}"><b>${m + 1} · ${n}</b>${bar(v, c === 'paper' ? 'lime' : c)}<em>${v ? `Mastery ${v}%` : '—'}</em>${tag(t, c)}</span>`).join('')}
   </span>` },

  // S8 · School admin (Partner Portal): Subjects (features/partner/components/SubjectRegistry.tsx)
  subjects: { nav: 'sub', portal: 'partner', html: `
   <span class="tc-head"><b><em>Partner Portal</em>Subjects</b><i class="tc-btn ghost">Filters</i><i class="tc-btn">${ico('up')}Upload Curriculum</i></span>
   <span class="tc-chapters">${[
     ['Ganita Prakash · Ch 1 · Grade 7', 'Mathematics', 'Ready for review or live', 'green', -1],
     ['Ganita Prakash · Ch 2 · Grade 7', 'Mathematics', 'Processing', 'lime', 1],
     ['Ganita Prakash · Ch 3 · Grade 7', 'Mathematics', 'Confirm concepts', 'yellow', -1],
     ['Curiosity · Ch 1 · Grade 7', 'Science', 'Waiting to start', 'paper', -1],
   ].map(([n, sub, st, c, ph], m) =>
     `<span class="tc-ch" style="--i:${m + 1}"><i class="tc-doc">PDF</i><b>${n}<em>${sub}${ph >= 0 ? ' · Reading pages · 12 of 18' : ''}</em></b>${ph >= 0 ? `<span class="tc-phases">${['Read', 'Understand', 'Build', 'Deliver'].map((p, k) => `<i class="${k < ph ? 'done' : k === ph ? 'now' : ''}">${p}</i>`).join('')}</span>` : '<span></span>'}${tag(st, c)}</span>`).join('')}</span>` },

  // S9 · School admin: upload a chapter (features/partner/components/CurriculumIngestion.tsx), a supplementary book
  upload: { nav: 'sub', portal: 'partner', html: `
   <span class="tc-head"><b><em>Registry Ingestion</em>Curriculum Upload</b></span>
   <span class="tc-drop" style="--i:0">${ico('up')}<b>Drag and Drop Curriculum</b><em>Supported formats: PDF only.</em></span>
   <span class="tc-form">${[['Grade', 'Grade 7'], ['Education board', 'CBSE'], ['Subject', 'Mathematics'], ['Publisher', 'NCERT'], ['Edition', 'Reprint 2025-26'], ['Book Title', 'Exemplar Problems'], ['Chapter No.', '2'], ['Chapter Title', 'Fractions and Decimals']].map(([l, v], n) =>
     `<span class="tc-field" style="--i:${n + 1}"><em>${l}</em><b>${v}</b></span>`).join('')}</span>
   <span class="tc-head"><i class="tc-btn ghost">Cancel</i><i class="tc-btn">Upload &amp; Start</i></span>` },
};

/** Home's six educator benefits, each on a real screen. */
export const HOME_TEACHER_SCREENS = ['report', 'periods', 'student', 'subjects', 'live', 'upload'];

const SIDES = {
  teacher: { cap: 'Teacher Portal', nav: [['cls', 'My Class'], ['lab', 'Lab Mode']], me: ['PS', 'Priya Sharma', 'Maths teacher'] },
  partner: { cap: 'Partner Portal', nav: [['an', 'Analytics'], ['sub', 'Subjects']], me: null },   // the partner sidebar has no identity card
};
const side = (k) => { const s = SIDES[k]; return `
      <aside class="tc-side" data-portal="${k}">
        <span class="tc-brand"><b>Zoovi</b><em>${s.cap}</em></span>
        ${s.me ? `<span class="tc-me top">${av(s.me[0], 'lime')}<span><b>${s.me[1]}</b><em>${s.me[2]}</em></span></span>` : ''}
        <span class="tc-nav">${s.nav.map(([id, l]) => `<span class="tc-navi" data-nav="${id}">${ico(id)}${l}</span>`).join('')}</span>
        <span class="tc-navi out">${ico('out')}${k === 'teacher' ? 'Sign out' : 'Logout'}</span>
      </aside>`; };

/**
 * The Teacher Portal on the iPad: one panel per key (TEACHER_PANELS), the first shown. The sidebar follows the panel
 * shown (teacher or partner portal, the lit nav item); setTeacherPanel() switches it.
 */
export const teacherTablet = (keys = HOME_TEACHER_SCREENS, cls = 'edu-tab', label = 'The Zoovi Teacher Portal on a tablet. Its screen changes with the point selected beside it.') => {
  const first = TEACHER_PANELS[keys[0]];
  return IPAD(`
      <div class="tc-sides" data-portal="${first.portal}" data-nav="${first.nav}">${side('teacher')}${side('partner')}</div>
      <div class="tc-stage">${keys.map((k, n) => { const p = TEACHER_PANELS[k]; return `<div class="tc-panel${n === 0 ? ' on' : ''}" data-i="${n}" data-key="${k}" data-nav="${p.nav}" data-portal="${p.portal}">${p.html}</div>`; }).join('')}</div>`,
    label, cls);
};
/** Show panel i of a teacherTablet() inside root; the sidebar follows. */
export function setTeacherPanel(root, i) {
  const panels = [...root.querySelectorAll('.tc-panel')];
  panels.forEach((p, k) => p.classList.toggle('on', k === i));
  const p = panels[i], sides = root.querySelector('.tc-sides');
  if (p && sides) { sides.dataset.portal = p.dataset.portal; sides.dataset.nav = p.dataset.nav; }
}

// Small line icons for the six approach pillars (24px grid, drawn with currentColor).
const PILLAR_ICONS = [
  '<circle cx="12" cy="7" r="3.2"/><path d="M5.5 20c.6-3.8 3.2-6 6.5-6s5.9 2.2 6.5 6"/>',                       // child-first
  '<path d="M9.2 9.2a2.9 2.9 0 1 1 4.3 2.5c-.9.5-1.5 1.2-1.5 2.3"/><circle cx="12" cy="17.6" r=".6"/><circle cx="12" cy="12" r="9"/>', // curiosity-led
  '<path d="M4.5 5.5h6a2 2 0 0 1 1.5.7 2 2 0 0 1 1.5-.7h6v13h-6a2 2 0 0 0-1.5.7 2 2 0 0 0-1.5-.7h-6z"/><path d="M12 6.2v13"/>',  // curriculum-aligned
  '<path d="M12 3.8l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z"/>',                          // skill-based
  '<path d="M3.5 20.5h17M5.5 20.5v-9l6.5-5 6.5 5v9"/><path d="M10 20.5v-5h4v5"/>',                                 // school-connected
  '<path d="M12 3.5l7 2.8v5.4c0 4.4-2.9 7.6-7 8.8-4.1-1.2-7-4.4-7-8.8V6.3z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/>', // safe and secure
];
export const pillarIcon = (i) => `<svg class="pi" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${PILLAR_ICONS[i]}</svg>`;

// A puffy cloud speech bubble (520 × 330 box): overlapping circles drawn three times — lime offset shadow,
// a thick ink outline (stroke only), then a paper fill on top that hides the inner overlaps, leaving one cloud outline.
const CLOUD_SHAPES = `<ellipse cx="262" cy="140" rx="200" ry="98"/>
  <circle cx="112" cy="128" r="72"/><circle cx="178" cy="74" r="70"/><circle cx="268" cy="56" r="76"/><circle cx="360" cy="72" r="70"/>
  <circle cx="430" cy="128" r="68"/><circle cx="418" cy="196" r="62"/><circle cx="330" cy="222" r="66"/><circle cx="234" cy="226" r="66"/><circle cx="146" cy="202" r="66"/>
  <path d="M150 232 C 128 268, 96 300, 52 322 C 116 312, 168 290, 214 252 Z"/>`;
const CLOUD = `<svg class="sb-cloud" viewBox="-10 -10 540 345" aria-hidden="true">
  <g class="sh" transform="translate(9 9)">${CLOUD_SHAPES}</g><g class="ol">${CLOUD_SHAPES}</g><g class="fi">${CLOUD_SHAPES}</g></svg>`;

/** The approach: a ring of light circles (one in focus shows its line), or, with ?pillars=speech, comic speech bubbles from the device. */
export const pillarRing = (pillars) => `
  <ol class="ring pillars" aria-label="The Zoovi learning approach">
    ${pillars.map((p, i) => `<li data-i="${i}">${pillarIcon(i)}<h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></li>`).join('')}
  </ol>
  <div class="speech" aria-hidden="true">
    ${pillars.map((p, i) => `<div class="sb" data-i="${i}">${CLOUD}
      <span class="sb-body"><span class="sb-ic">${pillarIcon(i)}</span><b>${esc(p.title)}</b><span>${esc(p.body)}</span></span>
    </div>`).join('')}
    <div class="sb-steps">${pillars.map((p, i) => `<i data-i="${i}">${pillarIcon(i)}</i>`).join('')}</div>
  </div>`;
/** Device shell colours (logo tokens), shown as round swatches; see bodyColours() in deskbot.js. */
export const swatches = () => `<span class="swatches" role="group" aria-label="Device colours">${[['paper', 'Paper'], ['lime', 'Lime'], ['yellow', 'Sunshine'], ['green', 'Leaf']].map(([c, l], i) =>
  `<button type="button" class="swatch" data-c="${c}" aria-pressed="${i === 0}" style="--c:var(--${c})"><i></i><span>${l}</span></button>`).join('')}</span>`;

/** Round placeholder for a v5 [VISUAL] slot. Circles only. */
export const lens = (label, cls = '') => `<div class="lens ${cls}" role="img" aria-label="${esc(label)} (placeholder)"><span>${esc(label)}</span></div>`;

// Home's calm tail: educators, closing, footer. Rendered into <div class="tail">. (The prototype's FAQ section is
// left out of the home page on request.)
export function tailHtml() {
  const { educators, closing } = content;
  return `
    <section aria-labelledby="edu-h">
      <p class="eyebrow">${esc(educators.eyebrow)}</p>
      <h2 id="edu-h" style="margin-top:16px">${rich(educators.title)}</h2>
      <p class="lede">${esc(educators.lede)}</p>
      <div class="edu-grid">
        <ol class="edu-points">
          ${educators.benefits.map((b, i) => `
            <li class="${i === 0 ? 'on' : ''}" data-i="${i}"><button type="button" aria-pressed="${i === 0}"><span class="dot" aria-hidden="true">${i + 1}</span>
              <span><h3>${esc(b.title)}</h3><p>${esc(b.body)}</p></span></button></li>`).join('')}
        </ol>
        <div class="edu-device">${teacherTablet()}</div>
      </div>
      ${ctas(educators.ctas)}
    </section>
    ${closingAndFooter(closing)}`;
}

/** Closing call + footer (the end of the home tail). */
export const closingAndFooter = (closing = content.closing, visual = '') => {
  const { footer } = content;
  // visual: optional HTML set beside the closing text (the parent pages' stepping stones); home passes none and stays centred.
  // closing: null leaves the closing section out and renders the footer alone.
  const text = closing && `
      <h2 id="close-h">${rich(closing.title)}</h2>
      <p class="lede">${esc(closing.lede)}</p>
      ${ctas(closing.ctas)}`;
  return `${closing ? `
    <section class="closing${visual ? ' with-visual' : ''}" aria-labelledby="close-h">
      ${visual ? `${visual}<div class="closing-text">${text}</div>` : text}
    </section>` : ''}
    <footer class="foot">
      <div class="foot-brand">
        <img src="/zoovi/zoovi-logo.png" alt="Zoovi">
        <span class="eyebrow">${esc(footer.tagline)}</span>
      </div>
      ${footer.columns.map((c) => `<nav class="foot-col" aria-label="${esc(c.title)}"><p class="foot-h">${esc(c.title)}</p>
        ${c.links.map((n) => `<a href="${esc(n.href)}"${n.todo ? ' data-todo' : ''}>${esc(n.label)}</a>`).join('')}</nav>`).join('')}
      <p class="foot-note">${esc(footer.note)}</p>
    </footer>`;
};
