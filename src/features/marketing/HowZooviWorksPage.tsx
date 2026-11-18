"use client";

import { useRef, type CSSProperties } from "react";
import {
  Baby, BellRing, BookOpen, ChartLine, Eye as EyeIcon, Lightbulb, MessagesSquare, Puzzle, School, ShieldCheck,
  Sparkles, SquareSigma, Telescope,
} from "lucide-react";
import { howItWorks } from "./content/howItWorks";
import { CONTACT_HREF } from "./content/home";
import { MarketingShell } from "./components/MarketingShell";
import { CtaButton } from "./components/CtaButton";
import { VisualPlaceholder } from "./components/VisualPlaceholder";
import { Faq } from "./components/Faq";
import { FloatingQuestions, GrowingQuestion, QuestionGlyph, Waveform } from "./components/Doodles";
import { ZooviLogo } from "./components/ZooviLogo";
import { useActiveStep, useScrollProgress } from "./hooks";

const vars = (o: Record<string, string | number>) => o as CSSProperties;

/** `text` with `word` (if present) swiped with a marker highlight. */
function HighlightWord({ text, word }: { text: string; word: string }) {
  const at = text.toLowerCase().indexOf(word.toLowerCase());
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="zv-highlight">{text.slice(at, at + word.length)}</span>
      {text.slice(at + word.length)}
    </>
  );
}

/* ── 1. Hero ───────────────────────────────────────────────────────────── */
function Hero() {
  const h = howItWorks.hero;
  return (
    <section className="zv-hero zv-hero--hzw">
      <div className="zv-wrap zv-hero__grid">
        <div className="zv-hero__copy">
          <span className="zv-eyebrow zv-load" style={vars({ "--d": "0s" })}>{h.eyebrow}</span>
          <h1 className="zv-hzw-title zv-load" style={vars({ "--d": "0.12s" })}>
            <HighlightWord text={h.title} word="understanding," />
          </h1>
          <p className="zv-hero__body zv-load" style={vars({ "--d": "0.3s" })}>{h.body}</p>
          <div className="zv-ctas zv-load" style={vars({ "--d": "0.45s" })}>
            <CtaButton href="#demo" arrow>{h.ctaPrimary}</CtaButton>
            <CtaButton variant="ghost">{h.ctaSecondary}</CtaButton>
          </div>
        </div>
        <div className="zv-hero__stage zv-load" style={vars({ "--d": "0.25s" })}>
          <FloatingQuestions />
          <div className="zv-taped">
            <span className="zv-tape zv-tape--tl" aria-hidden="true" />
            <span className="zv-tape zv-tape--br" aria-hidden="true" />
            <VisualPlaceholder note={h.visual} kind="video" ratio="16 / 11" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 2. Free to ask — a day's arc ──────────────────────────────────────── */
const SCENE_TIME = ["zv-scene--morning", "zv-scene--afternoon", "zv-scene--evening"];

function FreeToAsk() {
  const f = howItWorks.freeToAsk;
  const ref = useRef<HTMLElement>(null);
  useScrollProgress(ref);
  return (
    <section ref={ref} className="zv-sec zv-day">
      <div className="zv-day__sky" aria-hidden="true">
        <svg className="zv-day__arc" viewBox="0 0 1000 300" preserveAspectRatio="none">
          <path d="M0 290 Q 500 -120 1000 290" />
        </svg>
        <span className="zv-day__sun" />
      </div>
      <div className="zv-wrap">
        <div className="zv-day__head zv-reveal">
          <h2 className="zv-h2">{f.title}</h2>
          <p className="zv-lede zv-lede--quiet">{f.lead}</p>
          <p className="zv-lede">{f.body}</p>
        </div>
        <ol className="zv-day__scenes">
          {f.scenarios.map((s, i) => (
            <li key={s.title} className={`zv-scene ${SCENE_TIME[i]} zv-reveal`} style={vars({ "--d": `${i * 0.15}s` })}>
              <VisualPlaceholder note={s.visual} ratio="5 / 4" />
              <div className="zv-scene__body">
                <h3 className="zv-h3">{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── 3. Demo — sticky scrollytelling ───────────────────────────────────── */
function Demo() {
  const d = howItWorks.demo;
  const ref = useRef<HTMLElement>(null);
  const active = useActiveStep(ref, d.steps.length);
  return (
    <section id="demo" ref={ref} className="zv-sec zv-demo">
      <div className="zv-wrap">
        <h2 className="zv-h2 zv-h2--center zv-reveal">{d.title}</h2>
        <div className="zv-demo__grid">
          <div className="zv-demo__sticky">
            <div className="zv-demo__frame">
              <div className="zv-demo__dots" aria-hidden="true">
                {d.steps.map((s, i) => (
                  <span key={s.title} className={i <= active ? "is-on" : undefined} />
                ))}
              </div>
              <VisualPlaceholder note={`${d.visual} — Step ${active + 1}: ${d.steps[active].title}`} ratio="4 / 3" />
              <span className="zv-demo__badge" aria-hidden="true">
                <b>{active + 1}</b>/{d.steps.length}
              </span>
            </div>
          </div>
          <ol className="zv-demo__steps" style={vars({ "--active": active })}>
            <span className="zv-demo__rail" aria-hidden="true"><span /></span>
            {d.steps.map((s, i) => (
              <li key={s.title} data-step={i} className={`zv-step${i === active ? " is-active" : ""}${i < active ? " is-done" : ""}`}>
                <span className="zv-step__num">{i + 1}</span>
                <div>
                  <h3 className="zv-step__title">{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ── 4. Every question welcome — voice ─────────────────────────────────── */
const EXPLAIN_ICONS = [Lightbulb, SquareSigma, MessagesSquare];

function Explained() {
  const e = howItWorks.explained;
  return (
    <section className="zv-sec zv-voice">
      <div className="zv-wrap zv-voice__grid">
        <div className="zv-voice__media zv-reveal">
          <VisualPlaceholder note={e.visual} kind="video" ratio="1 / 1" />
          <Waveform />
          <ul className="zv-stickers" aria-label="Ask Freely. Take Your Time. Keep Exploring.">
            {e.stickers.map((s, i) => (
              <li key={s} className={`zv-sticker zv-sticker--${i}`} aria-hidden="true">{s}</li>
            ))}
          </ul>
        </div>
        <div className="zv-voice__copy">
          <h2 className="zv-h2 zv-reveal">{e.title}</h2>
          <p className="zv-lede zv-reveal">{e.body}</p>
          <ul className="zv-stack">
            {e.items.map((it, i) => {
              const Icon = EXPLAIN_ICONS[i];
              return (
                <li key={it.title} className="zv-stack__card zv-reveal" style={vars({ "--d": `${i * 0.12}s`, "--i": i })}>
                  <Icon aria-hidden="true" />
                  <div>
                    <h3>{it.title}</h3>
                    <p>{it.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ── 5. Methodology — orbit ────────────────────────────────────────────── */
const METHOD_ICONS = [Baby, Telescope, BookOpen, Puzzle, School, ShieldCheck];

function Methodology() {
  const m = howItWorks.methodology;
  return (
    <section className="zv-sec zv-method">
      <div className="zv-wrap">
        <div className="zv-method__head zv-reveal">
          <h2 className="zv-h2 zv-h2--center">{m.title}</h2>
          <p className="zv-lede zv-center">{m.intro}</p>
        </div>
        <div className="zv-orbit zv-reveal">
          <div className="zv-orbit__rings" aria-hidden="true"><span /><span /></div>
          <div className="zv-orbit__core">
            <ZooviLogo height={40} />
            <Sparkles aria-hidden="true" className="zv-orbit__spark" />
          </div>
          <ul className="zv-orbit__ring">
            {m.items.map((it, i) => {
              const Icon = METHOD_ICONS[i];
              return (
                <li key={it.title} className="zv-planet" style={vars({ "--i": i, "--n": m.items.length })}>
                  <div className="zv-planet__body">
                    <span className="zv-planet__icon"><Icon aria-hidden="true" /></span>
                    <h3>{it.title}</h3>
                    <p>{it.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <VisualPlaceholder className="zv-method__visual zv-reveal" note={m.visual} ratio="21 / 8" />
      </div>
    </section>
  );
}

/* ── 6. Parents — laptop + toasts ──────────────────────────────────────── */
const TOAST_ICONS = [ChartLine, Lightbulb, BellRing, EyeIcon];

function Parents() {
  const p = howItWorks.parents;
  return (
    <section className="zv-sec zv-parents">
      <div className="zv-wrap zv-parents__grid">
        <div className="zv-parents__copy zv-reveal">
          <h2 className="zv-h2">{p.title}</h2>
          <p className="zv-lede">{p.body}</p>
          <CtaButton href="/#parents" arrow>{p.cta}</CtaButton>
        </div>
        <div className="zv-laptop zv-reveal">
          <div className="zv-laptop__screen">
            <VisualPlaceholder note={p.visual} ratio="16 / 10" />
          </div>
          <div className="zv-laptop__base" aria-hidden="true" />
          <ul className="zv-toasts">
            {p.points.map((pt, i) => {
              const Icon = TOAST_ICONS[i];
              return (
                <li key={pt} className="zv-toast" style={vars({ "--d": `${0.4 + i * 0.45}s`, "--i": i })}>
                  <span className="zv-toast__icon"><Icon aria-hidden="true" /></span>
                  {pt}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ── 7. FAQs ───────────────────────────────────────────────────────────── */
function Faqs() {
  const f = howItWorks.faqs;
  return (
    <section id="faqs" className="zv-sec zv-faqsec">
      <div className="zv-wrap zv-faqsec__grid">
        <div className="zv-faqsec__side zv-reveal">
          <QuestionGlyph className="zv-faqsec__glyph" />
          <h2 className="zv-h2">{f.title}</h2>
          <CtaButton href={CONTACT_HREF} variant="ghost">{f.cta}</CtaButton>
        </div>
        <div className="zv-reveal">
          <Faq items={f.items} />
        </div>
      </div>
    </section>
  );
}

/* ── 8. Closing ────────────────────────────────────────────────────────── */
function Closing() {
  const c = howItWorks.closing;
  return (
    <section className="zv-sec zv-closing zv-closing--sun">
      <div className="zv-wrap zv-closing__grid">
        <div className="zv-closing__copy zv-reveal">
          <GrowingQuestion tone="sun" />
          <h2 className="zv-h2 zv-h2--xl">{c.title}</h2>
          <p className="zv-lede">{c.body}</p>
          <div className="zv-ctas">
            <CtaButton arrow>{c.ctaPrimary}</CtaButton>
            <CtaButton href={CONTACT_HREF} variant="ghost">{c.ctaSecondary}</CtaButton>
          </div>
        </div>
        <VisualPlaceholder className="zv-closing__visual zv-reveal" note={c.visual} ratio="4 / 5" />
      </div>
    </section>
  );
}

export function HowZooviWorksPage() {
  return (
    <MarketingShell>
      <Hero />
      <FreeToAsk />
      <Demo />
      <Explained />
      <Methodology />
      <Parents />
      <Faqs />
      <Closing />
    </MarketingShell>
  );
}
