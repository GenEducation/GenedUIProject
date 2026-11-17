/**
 * How Zoovi Works copy — "GenED-Website-How Zoovi Works Page v1-Nov '26".
 * Kept verbatim from the doc; edit copy here, not in the JSX.
 */

import type { Point } from "./home";

/** The doc offers two hero headlines; swap `title` for `titleAlt` to use the other. */
const HERO_TITLE = "From questions to understanding, see Zoovi in action";
const HERO_TITLE_ALT = "A new way for children to ask, learn and explore";

export const howItWorks = {
  hero: {
    eyebrow: "How Zoovi Works",
    title: HERO_TITLE,
    titleAlt: HERO_TITLE_ALT,
    body:
      "From clearing doubts about a school lesson to exploring a topic that sparks their curiosity, children can talk to Zoovi, get clear explanations, ask follow-up questions, and learn at their own pace.",
    ctaPrimary: "See How Zoovi Works",
    ctaSecondary: "Get an Invite",
    visual: "Short product film showing a child interacting with Zoovi, with glimpses of the device and web app.",
  },

  freeToAsk: {
    title: "Learning begins when children feel free to ask",
    lead:
      "Some children hesitate to ask questions in class, worried about getting an answer wrong or being laughed at. Others simply need more time to understand.",
    body: "Zoovi gives them the space to ask, revisit concepts, and explore ideas at their own pace, without fear of judgement.",
    scenarios: [
      {
        title: "When a lesson feels difficult",
        body: "Clear doubts and understand concepts they may not have grasped in class.",
        visual: "A child clearing a lesson doubt",
      },
      {
        title: "When it's time to revise",
        body: "Revisit topics and practise what they have learnt to strengthen understanding.",
        visual: "A child revising a concept",
      },
      {
        title: "When curiosity takes over",
        body: "Explore questions and discover subjects beyond their classroom lessons.",
        visual: "A child exploring a question",
      },
    ],
  },

  demo: {
    title: "From a question to a clearer understanding.",
    steps: [
      { title: "Ask", body: "The child asks Zoovi a question about a topic, just as they would in a conversation." },
      { title: "Understand", body: "Zoovi responds with an explanation designed to make the concept easier to follow." },
      { title: "Explore further", body: "The child can ask follow-up questions and explore related ideas." },
      { title: "Reinforce", body: "They can revisit the concept and practise to strengthen their understanding." },
    ] satisfies Point[],
    visual:
      "A real product demonstration showing one continuous interaction, from the child's initial question through explanation and follow-up. Use actual product screens and responses.",
  },

  explained: {
    title: "A space where every question is welcome",
    body:
      "A good explanation does more than provide an answer. Zoovi helps a child understand why something happens and how different ideas connect.",
    items: [
      { title: "Clear explanations", body: "Breaks down concepts into simple, easy-to-follow language." },
      { title: "Visual learning", body: "Uses visual examples to make abstract ideas easier to grasp." },
      { title: "Interactive conversations", body: "Encourages follow-up questions when kids need more clarity." },
    ] satisfies Point[],
    stickers: ["Ask Freely", "Take Your Time", "Keep Exploring"],
    visual: "A child speaking naturally to Zoovi, followed by the device's response. Show the voice-led interaction clearly.",
  },

  methodology: {
    title: "A thoughtful approach to how children learn",
    intro: "Zoovi brings together curiosity, curriculum, and practice to support meaningful learning.",
    items: [
      { title: "Child-first", body: "An initial assessment establishes a starting point for the learning experience." },
      { title: "Curiosity-led exploration", body: "Children can explore questions and topics that interest them, beyond prescribed lessons." },
      { title: "Curriculum-aligned", body: "Learning supports NCERT and NEP 2020 learning outcomes." },
      { title: "Skill-based revision", body: "Practice and revision help children strengthen understanding and build skills step by step." },
      { title: "School-connected", body: "Schools can bring their own learning materials into the Zoovi experience." },
      { title: "Safe and secure", body: "A dedicated learning environment that prioritises children's safety and privacy." },
    ] satisfies Point[],
    visual: "A simple graphic illustrating the learning approach, supported by actual product screens",
  },

  parents: {
    title: "Parents, stay connected to your child's learning",
    body:
      "The Zoovi Parent Dashboard offers a closer view of your child's learning journey, helping you follow their progress, understand what they are learning, and see where they may need support.",
    points: [
      "Track progress across subjects and chapters.",
      "See what they understand and where more practice may help.",
      "Follow learning activity through session and activity insights.",
      "Discover their interests through the questions they ask and topics they explore.",
    ],
    cta: "Explore Zoovi for Parents",
    visual: "Parent Dashboard showing actual progress, learning activity and areas for practice.",
  },

  faqs: {
    title: "Frequently asked questions",
    items: [
      {
        q: "How does a child interact with Zoovi?",
        a: "Children interact with Zoovi through voice-led conversations on the Zoovi Device. The Zoovi Web App offers an interactive, web-based learning experience.",
      },
      {
        q: "What can children learn with Zoovi?",
        a: "Children can use Zoovi to understand concepts, clear doubts, revise and practise what they have learnt, and explore topics beyond their classroom lessons.",
      },
      {
        q: "Is Zoovi aligned with the school curriculum?",
        a: "Zoovi supports NCERT and NEP 2020 learning outcomes, helping connect exploration and practice with what children learn at school. Schools can also bring their own learning materials into the experience.",
      },
      {
        q: "How does Zoovi help children who hesitate to ask questions?",
        a: "Children can ask questions in their own words, take their time, and seek further explanations without the fear of being judged or getting something wrong.",
      },
      {
        q: "Can my child use Zoovi independently?",
        a: "Zoovi is designed to let children ask questions, explore concepts, and practise through interaction. Parents can stay connected to their learning through the Parent Dashboard.",
      },
      {
        q: "Is Zoovi safe for children?",
        a: "Zoovi provides a dedicated learning environment without open browsing, unrestricted apps, or social media. Voice interaction is activation-based, and audio recordings are not stored.",
      },
      {
        q: "Can parents follow their child's learning progress?",
        a: "Yes. The Parent Dashboard gives parents visibility into learning progress, activity, session history, and relevant safety alerts.",
      },
      {
        q: "Does Zoovi replace classroom teaching?",
        a: "No. Zoovi complements classroom learning by giving children additional opportunities to ask questions, revisit concepts, practise and explore.",
      },
    ],
    cta: "Have More Questions? Talk to Us",
  },

  closing: {
    title: "Give every question room to grow.",
    body: "Help your child discover the confidence to ask, the freedom to explore, and the joy of understanding.",
    ctaPrimary: "Get an Invite",
    ctaSecondary: "Talk to Us",
    visual: "Warm, expressive image of a child interacting with Zoovi.",
  },
} as const;
