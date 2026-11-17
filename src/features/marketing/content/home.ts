/**
 * Homepage copy — "GenED-Website-Homepage v5-Nov '26". Kept verbatim from the
 * doc; edit copy here, not in the JSX. `visual` strings are the doc's notes for
 * images still to come, shown on their placeholders.
 */

export interface Point {
  title: string;
  body: string;
}

export const home = {
  hero: {
    eyebrow: "Meet Zoovi",
    title: "Companion for curious minds",
    body:
      "Zoovi is an AI-powered, voice-led learning companion that helps children explore ideas and understand concepts in an interactive and engaging way, while giving parents a better window into their child's learning journey.",
    ctaPrimary: "See How Zoovi Works",
    ctaSecondary: "Get an Invite",
    visual: "Hero film showing a child interacting with Zoovi, with glimpses of both the device and web app.",
  },

  visibility: {
    title: "You see the marks. But do you see the learning?",
    intro: "Zoovi gives you a closer view of your child's learning journey through the Parent Dashboard.",
    points: [
      "Day-to-day visibility into learning progress",
      "Clarity on concepts understood and areas that need more practice",
      "Insight into your child's questions, interests and discoveries",
      "Guidance on where your support can make a difference",
    ],
    cta: "Explore Zoovi for Parents",
    visual: "Parent Dashboard preview with progress and learning activity.",
  },

  ways: {
    title: "One learning companion. A seamless learning experience.",
    items: [
      {
        name: "Zoovi Companion",
        body:
          "A personalised, AI-enabled learning companion that brings voice-led interaction and visual explanations together in a focused learning environment.",
        cta: "Explore the Zoovi Device",
        visual: "Zoovi Device",
      },
      {
        name: "Zoovi Web",
        body:
          "An interactive web-based learning experience with guided lessons, visual explanations and a student dashboard to follow learning activity.",
        cta: "Explore the Zoovi Web App",
        visual: "Zoovi Web App",
      },
    ],
  },

  does: {
    title: "A new way to ask. A better way to learn.",
    verbs: ["Ask.", "Understand.", "Practise.", "Explore."],
    intro: "Zoovi turns learning into an engaging conversation. Children can:",
    items: [
      { title: "Ask questions", body: "Clear doubts about school lessons." },
      { title: "Understand concepts", body: "Explore difficult topics through guided explanations and visuals." },
      { title: "Revise and practise", body: "Reinforce learning and sharpen skills." },
      { title: "Discover more", body: "Explore topics beyond the curriculum and follow their curiosity." },
    ] satisfies Point[],
    outro: "All within a dedicated learning environment designed for children.",
    ctaPrimary: "See Zoovi in Action",
    ctaSecondary: "See How Zoovi Works",
    visual:
      "Short product demonstration video. Show an actual interaction from the child's question to Zoovi's explanation.",
  },

  approach: {
    title: "Learning that builds understanding",
    intro: "Zoovi brings together the elements that make learning meaningful:",
    items: [
      { title: "Child-first", body: "An initial assessment helps establish a starting point." },
      { title: "Curiosity-led", body: "Children explore questions and topics of interest in a safe environment." },
      { title: "Curriculum-aligned", body: "Supports NCERT and NEP 2020 learning outcomes." },
      { title: "Skill-based", body: "Helps children build skills through understanding and practice." },
      { title: "School-connected", body: "Schools can bring their own learning materials into the experience." },
      { title: "Safe and secure", body: "A dedicated learning environment that prioritises children's safety and privacy." },
    ] satisfies Point[],
    cta: "Discover How Zoovi Works",
  },

  educators: {
    eyebrow: "For Educators",
    title: "Give every student more opportunities to learn",
    intro:
      "Zoovi adds another layer of learning support for students, while keeping teachers integral to their learning journey.",
    items: [
      { title: "Track student progress", body: "Get insights into each student's progress and understanding through daily reports." },
      { title: "Extend classroom learning", body: "Revisit and explore concepts beyond lessons." },
      { title: "Support individual needs", body: "Encourage questions and practise at each student's pace." },
      { title: "Connect with your curriculum", body: "Bring school learning materials into Zoovi." },
      { title: "Encourage independent learning", body: "Let students explore while teachers guide their learning." },
      { title: "Go beyond prescribed textbooks", body: "Bring trusted supplementary resources into Zoovi." },
    ] satisfies Point[],
    ctaPrimary: "Explore Zoovi for Educators",
    ctaSecondary: "Register for the Educator's Programme",
  },

  faqs: {
    title: "Frequently asked questions",
    items: [
      {
        q: "What age groups is Zoovi designed for?",
        a: "Zoovi is currently designed for school-going children across Grades 3–9, with learning experiences tailored to different age groups and stages of learning. More grades will be added in the future.",
      },
      {
        q: "Does Zoovi follow the school curriculum?",
        a: "Zoovi supports curriculum-aligned learning based on NCERT and NEP 2020 learning outcomes. Schools can also upload their own learning materials. Support for more education boards will be added soon.",
      },
      {
        q: "Can parents follow their child's progress?",
        a: "Yes. The Parent Dashboard provides access to learning activity, progress, session history, and relevant safety alerts.",
      },
      {
        q: "Is Zoovi safe for children to use?",
        a: "Zoovi offers a dedicated learning environment without open browsing, unrestricted apps, or social media. Its voice interaction is activation-based, and audio recordings are not stored.",
      },
      {
        q: "Does Zoovi replace teachers?",
        a: "No. Zoovi complements classroom teaching and gives children additional opportunities to ask questions, practise and explore.",
      },
    ],
    cta: "Have More Questions? Talk to Us",
  },

  closing: {
    title: "Give every question room to grow.",
    body: "Discover a more engaging way for your child to learn, understand and explore.",
    ctaPrimary: "Get an Invite",
    ctaSecondary: "Talk to Us",
    visual: "Warm, expressive image of a child interacting with Zoovi.",
  },
} as const;

/**
 * Where "Contact" and every "Talk to Us" go. Set by NEXT_PUBLIC_CONTACT_EMAIL (.env.local, and the host's env for
 * deployed builds; Next inlines it at build time), with GenEd's inbox as the fallback so a build without it still works.
 */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "info@gened.ai";
/** Opens a new email to CONTACT_EMAIL in the visitor's own mail app. */
export const CONTACT_HREF = `mailto:${CONTACT_EMAIL}`;

export const footer = {
  name: "Zoovi",
  tagline: "A companion for curious minds",
  attribution: "Zoovi is a GenEd product. GenEd is an AI technology company specialising in education products.",
} as const;
