// Copy for the FAQ page. The questions come from "GenED-Website-Contact Page v1-Nov '26" (§3, all ten, in its four
// groups), joined by six of the For Parents page's FAQs (content-parents.js, not shown on that page). Two of the parent
// ones are left out because the doc already answers them: "What is Zoovi, and how does it help my child?" (doc 2 and 3)
// and "What can I see on the Parent Dashboard?" (doc 6).
// The Contact page has no enquiry form, so the doc answers that pointed at "this page" or "the contact form" (5, 9, 10)
// point at Get an Invite and the email address instead; 7 and 8 keep their words and gain links.
// In answers, [text](href) becomes a link.
import { esc, rich, closingAndFooter } from './content.js';

export const FAQ_EMAIL = 'info@gened.ai';
const MAIL = `mailto:${FAQ_EMAIL}`;
const INVITE = '/get-an-invite';
const EDUCATOR_INVITE = '/get-an-invite/educators';

export const faq = {
  hero: {
    title: 'Have a question? *We’re here to help.*',
    lede: 'Find answers to questions about GenEd, Zoovi and ways to engage with us.',
  },
  groups: [
    {
      id: 'about-zoovi', title: 'About GenEd & Zoovi',
      items: [
        { q: 'What is GenEd?', a: 'GenEd is an education technology company using AI to make learning more engaging, accessible and responsive to children’s needs.' },
        { q: 'What is Zoovi?', a: 'Zoovi is an AI-powered, voice-led Knowledge Companion for children. It encourages curiosity, helps children understand concepts, revise what they learn, and discover topics beyond the classroom.' },
        { q: 'How does Zoovi support children’s learning?', a: 'Zoovi allows children to ask questions, explore topics, revisit concepts, and receive explanations and guidance suited to their learning needs. It encourages independent thinking and active participation, creating a space where children feel comfortable asking questions and exploring ideas without fear of judgement.' },
        { q: 'Is Zoovi aligned with school curricula?', a: 'Zoovi supports curriculum-linked learning, including alignment with NCERT and NEP 2020 learning outcomes. Schools can also explore connecting their own curriculum materials.' },
        { q: 'Is Zoovi safe for children?', a: 'Zoovi offers a dedicated learning environment without open browsing, unrestricted apps, or social media. Voice interaction is activation-based, and audio recordings are not stored.' },
        { q: 'Does Zoovi replace classroom teaching?', a: 'No. Zoovi complements classroom learning by giving children more opportunities to ask questions, revisit concepts, practise and explore.' },
      ],
    },
    {
      id: 'parents', title: 'For parents',
      items: [
        { q: 'How can I get Zoovi for my child?', a: `Parents can register their interest through [Get an Invite](${INVITE}). Our team will share further information as it becomes available.` },
        { q: 'Which age groups can use Zoovi?', a: 'Zoovi is designed for school-going children, offering an engaging learning experience through the Zoovi Device and Web App.' },
        { q: 'Can Zoovi help with school lessons and homework?', a: 'Yes. Children can revisit classroom concepts, clear doubts, and work through questions step by step.' },
        { q: 'How can I stay informed about my child’s learning progress?', a: 'Zoovi includes a Parent Dashboard that provides insights into a child’s learning activity, progress, and areas where additional practice or support may help.' },
        { q: 'How often will I receive updates about my child’s learning?', a: 'The Zoovi Parent Dashboard provides daily learning updates, helping you follow your child’s activity and progress more regularly.' },
        { q: 'Can I share my child’s progress with the teachers?', a: 'Yes. Shareable progress reports can support more informed discussions between parents and teachers.' },
      ],
    },
    {
      id: 'schools', title: 'For teachers & schools',
      items: [
        { q: 'How can teachers get involved with Zoovi?', a: `Teachers can [register for the Zoovi Educator Programme](${EDUCATOR_INVITE}) to learn more about the platform and opportunities to engage with it.` },
        { q: 'Can schools explore Zoovi for classroom use?', a: `Yes. Schools interested in exploring Zoovi can request a product demonstration or [contact our team](${MAIL}) to discuss a potential partnership.` },
      ],
    },
    {
      id: 'partners', title: 'For partners & general enquiries',
      items: [
        { q: 'How can publishers and other organisations partner with GenEd?', a: `We welcome conversations with publishers and organisations interested in collaborating with GenEd. Write to us at [${FAQ_EMAIL}](${MAIL}) to connect with our team.` },
        { q: 'How can I contact GenEd for other enquiries?', a: `For questions, feedback, or other enquiries, write to us at [${FAQ_EMAIL}](${MAIL}). Our team will get back to you.` },
      ],
    },
  ],
  still: {
    title: 'Still have *questions?*',
    lede: 'Get in touch with our team.',
    cta: 'Contact Us',
  },
  closing: {
    title: 'Every great learning journey starts with a *question.*',
    lede: 'Let’s explore what we can make possible together.',
    ctas: [{ label: 'Explore Zoovi', href: '/' }],
  },
};

/** An answer: escaped text, with [text](href) turned into links (internal ones stay in the tab, mail opens the mail app). */
export const answer = (s) => esc(s).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => `<a href="${href}">${text}</a>`);

/** Every question and its plain-text answer, for the page's FAQPage structured data. */
export const faqEntries = () => faq.groups.flatMap((g) => g.items.map((x) => ({ q: x.q, a: x.a.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') })));

const COPY = '<svg viewBox="0 0 24 24" aria-hidden="true" class="fq-copy-i"><rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
const ARROW = '<svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
// one line icon per group: a speech bubble with a question, a home, an open book, a handshake-ish pair of links
const GROUP_ICONS = [
  '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M10.2 9.2a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.3"/><circle cx="12" cy="14.6" r=".5" fill="currentColor"/>',
  '<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  '<path d="M3 6c3-1.5 6-1.5 9 0v13c-3-1.5-6-1.5-9 0z"/><path d="M21 6c-3-1.5-6-1.5-9 0v13c3-1.5 6-1.5 9 0z"/>',
  '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
];
const groupIcon = (i) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GROUP_ICONS[i]}</svg>`;

export function faqHtml() {
  const { hero, groups, still, closing } = faq;
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return `
  <section class="fq-hero" aria-labelledby="hero-h">
    <div class="fq-hero-text">
      <h1 id="hero-h">${rich(hero.title)}</h1>
      <p class="lede">${esc(hero.lede)}</p>
    </div>
    <div class="fq-hero-art" aria-hidden="true">
      <div class="grow fq-grow"><svg viewBox="0 0 200 300">
        <path class="grow-q" pathLength="1" d="M48 92c0-40 26-62 56-62 33 0 54 22 54 50 0 28-18 40-36 52-14 9-22 20-22 40v16"/>
        <path class="grow-stem" pathLength="1" d="M100 262c0-30 2-52 8-76"/>
        <path class="grow-leaf grow-leaf-l" d="M104 222c-24-2-44-14-50-36 22-2 42 8 50 36z"/>
        <path class="grow-leaf grow-leaf-r" d="M106 200c10-26 32-40 58-38-4 24-26 38-58 38z"/>
        <ellipse class="grow-soil" cx="100" cy="266" rx="34" ry="10"/>
      </svg></div>
      <span class="fq-count"><b>${total}</b> answers</span>
    </div>
  </section>

  <div id="tail" class="tail">
    <section class="fq-body" aria-label="Questions">
      <nav class="fq-nav" aria-label="Question groups">
        <ul>${groups.map((g, i) => `
          <li><a href="#${g.id}" data-g="${g.id}"><span class="fq-nav-i" aria-hidden="true">${groupIcon(i)}</span><span class="fq-nav-t">${esc(g.title)}</span><span class="fq-nav-n">${g.items.length}</span></a></li>`).join('')}
        </ul>
      </nav>
      <div class="fq-groups">${groups.map((g) => `
        <section class="fq-group" id="${g.id}" aria-labelledby="${g.id}-h">
          <h2 id="${g.id}-h">${esc(g.title)}</h2>
          <div class="faqs">${g.items.map((x) => `<details><summary>${esc(x.q)}</summary><p>${answer(x.a)}</p></details>`).join('')}</div>
        </section>`).join('')}
      </div>
    </section>

    <section class="fq-still" aria-labelledby="still-h">
      <div class="fq-still-card">
        <div>
          <h2 id="still-h">${rich(still.title)}</h2>
          <p class="lede">${esc(still.lede)}</p>
        </div>
        <div class="fq-mail">
          <span class="fq-addr">${esc(FAQ_EMAIL)}</span>
          <div class="fq-mail-actions">
            <a class="pill" href="${MAIL}"><span>${esc(still.cta)}</span>${ARROW}</a>
            <button type="button" class="pill ghost fq-copy" data-copy="${esc(FAQ_EMAIL)}">${COPY}<span>Copy address</span></button>
          </div>
        </div>
      </div>
    </section>
    ${closingAndFooter(closing)}
  </div>`;
}
