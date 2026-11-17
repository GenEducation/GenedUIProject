"use client";

import { useState, type CSSProperties } from "react";
import {
  Baby, BookOpen, ChartLine, Compass, GraduationCap, Library, Lightbulb, MessageCircleQuestion,
  Puzzle, Repeat, School, ShieldCheck, Sparkles, Target, Telescope, Users,
} from "lucide-react";
import { CONTACT_HREF, home } from "./content/home";
import { MarketingShell } from "./components/MarketingShell";
import { CtaButton } from "./components/CtaButton";
import { VisualPlaceholder } from "./components/VisualPlaceholder";
import { Faq } from "./components/Faq";
import { FloatingQuestions, GrowingQuestion, QuestionGlyph, Scribble } from "./components/Doodles";
import { LogoLetters } from "./components/LogoLetters";

const vars = (o: Record<string, string | number>) => o as CSSProperties;

/* ── 1. Hero ───────────────────────────────────────────────────────────── */
function Hero() {
  const h = home.hero;
  return (
    <section className="zv-hero">
      <div className="zv-wrap zv-hero__grid">
        <div className="zv-hero__copy">
          <h1 className="zv-hero__title">
            <span className="zv-sr">{h.eyebrow}. {h.title}.</span>
            <span className="zv-hero__meet zv-load" style={vars({ "--d": "0.05s" })} aria-hidden="true">
              <span className="zv-hero__meet-word">Meet</span>
              <span className="zv-hero__zoovi"><LogoLetters /></span>
            </span>
            <span className="zv-hero__sub zv-load" style={vars({ "--d": "0.25s" })} aria-hidden="true">
              Companion for <em>curious</em> minds
            </span>
          </h1>
          <p className="zv-hero__body zv-load" style={vars({ "--d": "0.4s" })}>{h.body}</p>
          <div className="zv-ctas zv-load" style={vars({ "--d": "0.55s" })}>
            <CtaButton href="/how-zoovi-works" arrow>{h.ctaPrimary}</CtaButton>
            <CtaButton variant="ghost">{h.ctaSecondary}</CtaButton>
          </div>
        </div>
        <div className="zv-hero__stage zv-load" style={vars({ "--d": "0.3s" })}>
          <FloatingQuestions />
          <div className="zv-hero__paper zv-hero__paper--a" aria-hidden="true" />
          <div className="zv-hero__paper zv-hero__paper--b" aria-hidden="true" />
          <VisualPlaceholder className="zv-hero__film" note={h.visual} kind="video" ratio="4 / 5" />
        </div>
      </div>
      <div className="zv-hero__fold" aria-hidden="true" />
    </section>
  );
}

/* ── 2. Marks vs learning ──────────────────────────────────────────────── */
function ReportCard() {
  return (
    <div className="zv-report" aria-hidden="true">
      <div className="zv-report__head">
        <span className="zv-report__line w60" />
        <span className="zv-report__line w30" />
      </div>
      {[78, 64, 88, 52, 71].map((w, i) => (
        <div className="zv-report__row" key={i}>
          <span className="zv-report__line" style={{ width: `${30 + (i % 3) * 8}%` }} />
          <span className="zv-report__score" style={{ width: `${w * 0.35}%` }} />
        </div>
      ))}
      <div className="zv-report__grade">B+</div>
    </div>
  );
}

function Visibility() {
  const v = home.visibility;
  const [wipe, setWipe] = useState(38);
  return (
    <section id="parents" className="zv-sec zv-vis">
      <div className="zv-wrap">
        <div className="zv-vis__head zv-reveal">
          <h2 className="zv-h2">
            You see the marks.
            <br />But do you see the <span className="zv-mark">learning?</span>
          </h2>
          <p className="zv-lede">{v.intro}</p>
        </div>

        <div className="zv-vis__stage zv-reveal">
          <div className="zv-wipe" style={vars({ "--w": `${wipe}%` })}>
            <div className="zv-wipe__under">
              <VisualPlaceholder note={v.visual} ratio="16 / 10" />
            </div>
            <div className="zv-wipe__over">
              <ReportCard />
            </div>
            <div className="zv-wipe__handle" aria-hidden="true"><span /></div>
            <input
              className="zv-wipe__range"
              type="range"
              min={0}
              max={100}
              value={wipe}
              onChange={(e) => setWipe(Number(e.target.value))}
              aria-label="Slide to compare the report card with the Parent Dashboard"
            />
          </div>

          <ul className="zv-callouts">
            {v.points.map((p, i) => (
              <li key={p} className="zv-callout zv-reveal" style={vars({ "--d": `${0.1 + i * 0.12}s` })}>
                <span className="zv-callout__pin">{i + 1}</span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="zv-center zv-reveal">
          <CtaButton arrow>{v.cta}</CtaButton>
        </div>
      </div>
    </section>
  );
}

/* ── 3. Ways to experience ─────────────────────────────────────────────── */
function Ways() {
  const w = home.ways;
  return (
    <section className="zv-sec zv-ways">
      <div className="zv-wrap">
        <h2 className="zv-h2 zv-h2--center zv-reveal">
          One learning companion.<br /><span className="zv-mark zv-mark--lime">A seamless learning experience.</span>
        </h2>
        <div className="zv-desk">
          <svg className="zv-desk__thread" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">
            <path d="M10 40 C 60 0, 140 70, 190 20" />
          </svg>
          {w.items.map((it, i) => (
            <article key={it.name} className={`zv-object zv-object--${i === 0 ? "device" : "web"} zv-reveal`} style={vars({ "--d": `${i * 0.15}s` })}>
              <div className="zv-object__tilt">
                <VisualPlaceholder note={it.visual} ratio={i === 0 ? "1 / 1" : "16 / 10"} className="zv-object__visual" />
                <div className="zv-object__body">
                  <span className="zv-object__tag">{i === 0 ? "01" : "02"}</span>
                  <h3 className="zv-h3">{it.name}</h3>
                  <p>{it.body}</p>
                  <CtaButton variant="ghost" arrow>{it.cta}</CtaButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 4. What Zoovi does — a conversation ───────────────────────────────── */
const DOES_ICONS = [MessageCircleQuestion, Lightbulb, Repeat, Telescope];

function Does() {
  const d = home.does;
  return (
    <section className="zv-sec zv-does">
      <div className="zv-wrap">
        <h2 className="zv-h2 zv-reveal">{d.title}</h2>
        <p className="zv-verbs zv-reveal" aria-label={d.verbs.join(" ")}>
          {d.verbs.map((v, i) => (
            <span key={v} className={`zv-verb zv-verb--${i}`} style={vars({ "--d": `${i * 0.12}s` })} aria-hidden="true">{v}</span>
          ))}
        </p>

        <div className="zv-does__grid">
          <div className="zv-tablet zv-reveal">
            <div className="zv-tablet__screen">
              <VisualPlaceholder note={d.visual} kind="video" ratio="4 / 3" />
            </div>
          </div>

          <div className="zv-chat zv-reveal">
            <p className="zv-chat__intro">{d.intro}</p>
            <ol className="zv-chat__thread">
              {d.items.map((it, i) => {
                const Icon = DOES_ICONS[i];
                return (
                  <li key={it.title} className="zv-chat__pair" style={vars({ "--d": `${0.2 + i * 0.35}s` })}>
                    <span className="zv-bubble zv-bubble--child">
                      <Icon aria-hidden="true" />
                      <strong>{it.title}</strong>
                    </span>
                    <span className="zv-bubble zv-bubble--zoovi">
                      <span className="zv-typing" aria-hidden="true"><i /><i /><i /></span>
                      <span className="zv-bubble__text">{it.body}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="zv-chat__outro">{d.outro}</p>
          </div>
        </div>

        <div className="zv-ctas zv-center zv-reveal">
          <CtaButton arrow>{d.ctaPrimary}</CtaButton>
          <CtaButton href="/how-zoovi-works" variant="ghost">{d.ctaSecondary}</CtaButton>
        </div>
      </div>
    </section>
  );
}

/* ── 5. Learning approach — honeycomb ──────────────────────────────────── */
const APPROACH_ICONS = [Baby, Sparkles, BookOpen, Puzzle, School, ShieldCheck];

function Approach() {
  const a = home.approach;
  return (
    <section className="zv-sec zv-approach">
      <div className="zv-wrap zv-approach__grid">
        <div className="zv-approach__copy zv-reveal">
          <h2 className="zv-h2">{a.title}</h2>
          <p className="zv-lede">{a.intro}</p>
          <CtaButton href="/how-zoovi-works" arrow>{a.cta}</CtaButton>
        </div>
        <ul className="zv-hive">
          {a.items.map((it, i) => {
            const Icon = APPROACH_ICONS[i];
            return (
              <li key={it.title} className="zv-hex zv-reveal" style={vars({ "--d": `${i * 0.1}s`, "--i": i })}>
                <div className="zv-hex__shape">
                  <Icon aria-hidden="true" />
                  <h3>{it.title}</h3>
                  <p>{it.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ── 6. Educators — the chalkboard ─────────────────────────────────────── */
const EDU_ICONS = [ChartLine, Compass, Target, Library, Users, GraduationCap];

function Educators() {
  const e = home.educators;
  return (
    <section id="educators" className="zv-sec zv-board">
      <div className="zv-board__dust" aria-hidden="true" />
      <div className="zv-wrap">
        <div className="zv-board__head zv-reveal">
          <span className="zv-eyebrow zv-eyebrow--chalk">{e.eyebrow}</span>
          <h2 className="zv-h2 zv-h2--chalk">
            Give every student <span className="zv-chalk-underline">more opportunities<Scribble /></span> to learn
          </h2>
          <p className="zv-lede zv-lede--chalk">{e.intro}</p>
        </div>
        <ul className="zv-board__grid">
          {e.items.map((it, i) => {
            const Icon = EDU_ICONS[i];
            return (
              <li key={it.title} className="zv-chalkcard zv-reveal" style={vars({ "--d": `${i * 0.08}s`, "--r": `${(i % 2 ? 1 : -1) * (0.6 + (i % 3) * 0.4)}deg` })}>
                <Icon aria-hidden="true" />
                <h3>{it.title}</h3>
                <p>{it.body}</p>
              </li>
            );
          })}
        </ul>
        <div className="zv-ctas zv-reveal">
          <CtaButton variant="sun" arrow>{e.ctaPrimary}</CtaButton>
          <CtaButton variant="light">{e.ctaSecondary}</CtaButton>
        </div>
      </div>
    </section>
  );
}

/* ── 7. FAQs ───────────────────────────────────────────────────────────── */
function Faqs() {
  const f = home.faqs;
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
  const c = home.closing;
  return (
    <section className="zv-sec zv-closing">
      <div className="zv-wrap zv-closing__grid">
        <div className="zv-closing__copy zv-reveal">
          <GrowingQuestion />
          <h2 className="zv-h2 zv-h2--xl">{c.title}</h2>
          <p className="zv-lede">{c.body}</p>
          <div className="zv-ctas">
            <CtaButton variant="sun" arrow>{c.ctaPrimary}</CtaButton>
            <CtaButton href={CONTACT_HREF} variant="light">{c.ctaSecondary}</CtaButton>
          </div>
        </div>
        <VisualPlaceholder className="zv-closing__visual zv-reveal" note={c.visual} ratio="4 / 5" />
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    <MarketingShell>
      <Hero />
      <Visibility />
      <Ways />
      <Does />
      <Approach />
      <Educators />
      <Faqs />
      <Closing />
    </MarketingShell>
  );
}
