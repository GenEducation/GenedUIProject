"use client";
/* eslint-disable @next/next/no-img-element -- static mock art, rendered into the film */

// The parent's Report Card, recreated from ReportCardScreen: SummaryHeader
// (identity, citron progress ring, stat stack, strongest / needs-attention
// callouts), then Subjects & Chapters beside Key Insights. The page scrolls
// down to the AI Learning Insight, the way a parent would.

import { motion, useTransform } from "framer-motion";
import { Count, Draw, Reveal, Stream, useRange, easeInOut, type Progress, type CameraKey } from "../primitives";
import { CHILD } from "../filmScript";
import { BANDS, MaskIcon, ParentShell, type Band } from "./ParentShell";

// The overall-progress ring as it fills; out for the scroll; then in on the
// AI Learning Insight as it writes itself.
const CAMERA: CameraKey[] = [
  { at: 0.06, s: 1, x: 0.5, y: 0.5 },
  { at: 0.14, s: 1.45, x: 0.52, y: 0.3 },
  { at: 0.36, s: 1.45, x: 0.52, y: 0.3 },
  { at: 0.46, s: 1, x: 0.5, y: 0.5 },
  { at: 0.66, s: 1, x: 0.5, y: 0.5 },
  { at: 0.74, s: 1.55, x: 0.82, y: 0.62 },
  { at: 1, s: 1.55, x: 0.82, y: 0.62 },
];

const RC = "/report-card/icons";
const RING = (r: number) => `M50 ${50 - r} a${r} ${r} 0 1 1 0 ${2 * r} a${r} ${r} 0 1 1 0 ${-2 * r}`;

const SUBJECTS: { name: string; icon: string; band: Band; mastery: number; coverage: number; chapters: number; sessions: number }[] = [
  { name: "Mathematics", icon: "mathematics", band: "Advanced", mastery: 82, coverage: 62, chapters: 8, sessions: 14 },
  { name: "English", icon: "english", band: "Proficient", mastery: 66, coverage: 48, chapters: 7, sessions: 4 },
  { name: "Science", icon: "science", band: "Approaching", mastery: 54, coverage: 30, chapters: 9, sessions: 6 },
  { name: "Social Science", icon: "social-science", band: "Approaching", mastery: 47, coverage: 22, chapters: 10, sessions: 3 },
];

const SCROLL: [number, number] = [0.5, 0.72];

export function SceneReport({ p }: { p: Progress }) {
  const scroll = useRange(p, SCROLL, easeInOut);
  const y = useTransform(scroll, (v) => `${v * -13.5}em`);
  const pdf = useTransform(p, [0.34, 0.37, 0.42], [1, 0.92, 1]);
  const pdfRing = useTransform(p, [0.33, 0.37, 0.48], [0, 1, 0]);
  return (
    <ParentShell p={p} active="Report Card" url={`gened.ai/parent/${CHILD.name.toLowerCase()}/report`} bare
      camera={CAMERA}>
      <div className="gc-rc-box">
        <motion.div className="gc-rc" style={{ y }}>
          {/* Summary header */}
          <Reveal p={p} at={[0.02, 0.1]} y={0.6} className="gc-rc-card gc-rc-summary">
            <div className="gc-rc-id">
              <b>{CHILD.fullName}</b>
              <small>
                {CHILD.grade} • {CHILD.board} Board
              </small>
              <div className="gc-rc-pills">
                <span className="gc-rc-month">
                  <img src={`${RC}/filters/date-filter.png`} alt="" /> October 2026
                </span>
                <motion.span className="gc-rc-pdf" style={{ scale: pdf }}>
                  <motion.i className="gc-rc-pdf-ring" style={{ opacity: pdfRing }} />
                  <img src={`${RC}/misc/download.png`} alt="" /> Download PDF
                </motion.span>
              </div>
            </div>
            <div className="gc-rc-ringcol">
              <div className="gc-rc-ring">
                <svg viewBox="0 0 100 100" aria-hidden>
                  <circle cx="50" cy="50" r="44.9" className="gc-rc-track" strokeWidth="10.2" />
                  <Draw p={p} at={[0.08, 0.34]} to={0.68} d={RING(44.9)} fill="none" stroke="#B8D63F" strokeWidth={10.2} strokeLinecap="round" />
                </svg>
                <span>
                  <b>
                    <Count p={p} at={[0.08, 0.34]} to={68} suffix="%" />
                  </b>
                  <small>
                    Overall
                    <br />
                    Progress
                  </small>
                </span>
              </div>
            </div>
            <div className="gc-rc-stats">
              <Stat icon="metrics/average-mastery" value={<span style={{ color: BANDS.Proficient.ink }}>66%</span>} label="Average Mastery" />
              <Stat
                icon="metrics/chapters-completed"
                value={
                  <>
                    8 <span className="gc-rc-soft">/ 24</span>
                  </>
                }
                label="Chapters Completed"
              />
              <Stat icon="metrics/tests" value="3" label="Tests" />
            </div>
            <div className="gc-rc-callouts">
              <Callout kind="strong" subject="Mathematics" mastery={82} band="Advanced" />
              <Callout kind="attention" subject="Science" mastery={54} band="Approaching" />
            </div>
          </Reveal>

          <div className="gc-rc-grid">
            {/* Subjects & Chapters */}
            <Reveal p={p} at={[0.12, 0.2]} y={0.8} className="gc-rc-card gc-rc-list">
              <header className="gc-rc-head">
                <span className="gc-rc-headico">
                  <img src={`${RC}/metrics/chapters-completed.png`} alt="" />
                </span>
                <div>
                  <b>Subjects &amp; Chapters</b>
                  <small>Tap a subject to preview its chapters and mastery</small>
                </div>
              </header>
              {SUBJECTS.map((s, i) => (
                <SubjectRow key={s.name} p={p} i={i} {...s} />
              ))}
            </Reveal>

            {/* Key Insights */}
            <Reveal p={p} at={[0.16, 0.24]} y={0.8} className="gc-rc-card gc-rc-ins-card">
              <header className="gc-rc-ins-head">
                <b>
                  <img src={`${RC}/insights/key-insight.png`} alt="" /> Key Insights
                </b>
                <span>View all</span>
              </header>
              <Insight tone={BANDS.Advanced} icon="positive-insight" title="What's working well">
                <ul>
                  <li>Mathematics is moving fast — 82% mastery after 14 sessions.</li>
                  <li>Steady, regular study through the month.</li>
                </ul>
              </Insight>
              <Insight tone={BANDS.Approaching} icon="needs-attention" title="Needs attention">
                <ul>
                  <li>Science chapters started but not finished.</li>
                  <li>Revisit Social Science maps and timelines.</li>
                </ul>
              </Insight>
              <div className="gc-rc-ins gc-rc-ins-ai">
                <div className="gc-rc-ins-top">
                  <span className="gc-rc-ins-dot" style={{ background: "#122D30" }}>
                    <MaskIcon src={`${RC}/insights/ai-insight.png`} color="#A9CCC7" size="0.7em" />
                  </span>
                  <b>AI Learning Insight</b>
                  <em>Powered by GenEd AI</em>
                </div>
                <div className="gc-rc-ins-body">
                  <p className="gc-rc-ai-head">Strong reasoning in Mathematics; Science needs steadier practice.</p>
                  <p className="gc-rc-ai-text">
                    <Stream
                      p={p}
                      at={[0.7, 0.92]}
                      text={`${CHILD.name} learns fastest when ideas are drawn out step by step. A few short sessions on Science chapters would close the gap.`}
                    />
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </motion.div>
      </div>
    </ParentShell>
  );
}

function Stat({ icon, value, label }: { icon: string; value: React.ReactNode; label: string }) {
  return (
    <div className="gc-rc-stat">
      <img src={`${RC}/${icon}.png`} alt="" />
      <div>
        <b>{value}</b>
        <small>{label}</small>
      </div>
    </div>
  );
}

function Callout({ kind, subject, mastery, band }: { kind: "strong" | "attention"; subject: string; mastery: number; band: Band }) {
  const tone = BANDS[band];
  return (
    <div className="gc-rc-callout" style={{ background: `linear-gradient(135deg, ${tone.wash[0]}, ${tone.wash[1]})`, borderColor: tone.edge }}>
      <span className="gc-rc-callout-ico" style={{ background: kind === "strong" ? "#DCEBE7" : tone.accent }}>
        <MaskIcon
          src={`${RC}/insights/${kind === "strong" ? "positive-insight" : "needs-attention"}.png`}
          color={kind === "strong" ? "#075E63" : "#fff"}
          size="0.7em"
        />
      </span>
      <span className="gc-rc-callout-text">
        <small>{kind === "strong" ? "Strongest Subject" : "Needs Attention"}</small>
        <b>
          {subject} <span style={{ color: tone.ink }}>({mastery}%)</span>
        </b>
      </span>
      <MaskIcon src={`${RC}/actions/right-arrow.png`} color="#5E7477" size="0.6em" />
    </div>
  );
}

function Insight({ tone, icon, title, children }: { tone: (typeof BANDS)[Band]; icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="gc-rc-ins" style={{ background: tone.wash[0], borderColor: tone.edge }}>
      <div className="gc-rc-ins-top">
        <span className="gc-rc-ins-dot" style={{ background: tone.accent }}>
          <MaskIcon src={`/report-card/icons/insights/${icon}.png`} color="#fff" size="0.65em" />
        </span>
        <b>{title}</b>
      </div>
      <div className="gc-rc-ins-body">{children}</div>
    </div>
  );
}

function SubjectRow({
  p,
  i,
  name,
  icon,
  band,
  mastery,
  coverage,
  chapters,
  sessions,
}: (typeof SUBJECTS)[number] & { p: Progress; i: number }) {
  const tone = BANDS[band];
  const at: [number, number] = [0.2 + i * 0.04, 0.42 + i * 0.04];
  const t = useRange(p, at);
  const width = useTransform(t, (v) => `${v * mastery}%`);
  return (
    <Reveal
      p={p}
      at={[0.16 + i * 0.03, 0.24 + i * 0.03]}
      y={0.6}
      className="gc-rc-row"
      style={{ background: `linear-gradient(100deg, ${tone.wash[0]}, ${tone.wash[1]} 65%)`, borderColor: tone.edge }}
    >
      <span className="gc-rc-edge" style={{ background: tone.accent }} />
      <span className="gc-rc-glyph" style={{ background: tone.tint }}>
        <MaskIcon src={`${RC}/subjects/${icon}.png`} color={tone.accent} size="1.15em" />
      </span>
      <div className="gc-rc-row-main">
        <div className="gc-rc-row-name">
          <b>{name}</b>
          <span className="gc-rc-band" style={{ background: tone.tint, color: tone.ink }}>
            {band}
          </span>
        </div>
        <small>
          {chapters} Chapters • {sessions} Sessions
        </small>
        <div className="gc-rc-barrow">
          <b style={{ color: tone.ink }}>{mastery}%</b>
          <div className="gc-rc-bar">
            <motion.i style={{ width, background: tone.accent }} />
          </div>
        </div>
      </div>
      <MiniRing p={p} at={at} value={mastery} color={tone.accent} label="Mastery" />
      <MiniRing p={p} at={at} value={coverage} color="#6A9295" label="Coverage" />
      <MaskIcon src={`${RC}/actions/right-arrow.png`} color="#5E7477" size="0.65em" />
    </Reveal>
  );
}

function MiniRing({ p, at, value, color, label }: { p: Progress; at: [number, number]; value: number; color: string; label: string }) {
  return (
    <div className="gc-rc-mini">
      <div className="gc-rc-mini-ring">
        <svg viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="44.4" className="gc-rc-track" strokeWidth="11" />
          <Draw p={p} at={at} to={value / 100} d={RING(44.4)} fill="none" stroke={color} strokeWidth={11} strokeLinecap="round" />
        </svg>
        <b>
          <Count p={p} at={at} to={value} suffix="%" />
        </b>
      </div>
      <small>{label}</small>
    </div>
  );
}
