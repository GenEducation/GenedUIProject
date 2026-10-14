"use client";
/* eslint-disable @next/next/no-img-element -- static mock art, rendered into the film */

// Parent Home, recreated from ParentHomeView: four metric cards, the activity
// trend beside Recent Alerts & Updates, then Subject Overview. Overall Learning
// Score and Skill Index show their real "coming soon" states.

import { Info, TrendingUp } from "lucide-react";
import { motion, useTransform } from "framer-motion";
import { Count, Draw, Reveal, useRange, easeInOut, type Progress, type CameraKey } from "../primitives";
import { CHILD } from "../filmScript";
import { BANDS, MaskIcon, ParentShell, type Band } from "./ParentShell";

// Sessions and study time as they tick over; out for the scroll; then in on
// Mathematics as its mastery rises.
const CAMERA: CameraKey[] = [
  { at: 0.12, s: 1, x: 0.5, y: 0.5 },
  { at: 0.2, s: 1.55, x: 0.72, y: 0.24 },
  { at: 0.4, s: 1.55, x: 0.72, y: 0.24 },
  { at: 0.46, s: 1, x: 0.5, y: 0.5 },
  { at: 0.62, s: 1, x: 0.5, y: 0.5 },
  { at: 0.7, s: 1.55, x: 0.3, y: 0.62 },
  { at: 0.92, s: 1.55, x: 0.3, y: 0.62 },
  { at: 1, s: 1.3, x: 0.4, y: 0.55 },
];

const ICON = (name: string) => `/parent-portal/${name}.png`;

const SUBJECTS: { name: string; icon: string; band: Band; mastery: number; before: number; sessions: number; time: string; chapters: string }[] = [
  { name: "Mathematics", icon: "mathematics", band: "Advanced", mastery: 82, before: 78, sessions: 14, time: "3h 10m", chapters: "4/8" },
  { name: "English", icon: "english", band: "Proficient", mastery: 66, before: 66, sessions: 4, time: "55m", chapters: "2/7" },
  { name: "Science", icon: "science", band: "Approaching", mastery: 54, before: 54, sessions: 6, time: "1h 25m", chapters: "2/9" },
  { name: "Social Science", icon: "social-science", band: "Approaching", mastery: 47, before: 47, sessions: 3, time: "40m", chapters: "1/10" },
];

// Daily study minutes, last 30 days: a steady climb with gentle ups and
// downs; the last point is today's lesson.
const POINTS = [14, 16, 15, 18, 20, 19, 22, 23, 22, 25, 27, 26, 28, 30, 29, 31, 33, 32, 35, 36, 35, 38, 39, 38, 41, 42, 44, 43, 46, 48];
const W = 380;
const H = 100;
const MAX = 60;
const xy = (i: number) => [(i / (POINTS.length - 1)) * W, H - (POINTS[i] / MAX) * H] as const;
// A smooth curve through the points (Catmull-Rom as cubic Béziers).
const LINE = POINTS.map((_, i) => {
  const [x, y] = xy(i);
  if (i === 0) return `M${x} ${y}`;
  const [x0, y0] = xy(Math.max(0, i - 2));
  const [x1, y1] = xy(i - 1);
  const [x3, y3] = xy(Math.min(POINTS.length - 1, i + 1));
  const c1 = [x1 + (x - x0) / 6, y1 + (y - y0) / 6];
  const c2 = [x - (x3 - x1) / 6, y - (y3 - y1) / 6];
  return `C${c1.join(" ")} ${c2.join(" ")} ${x} ${y}`;
}).join(" ");
// How far along the line (0..1) each point sits, so dots appear as the stroke reaches them.
const ALONG = (() => {
  const seg = POINTS.map((_, i) => (i ? Math.hypot(xy(i)[0] - xy(i - 1)[0], xy(i)[1] - xy(i - 1)[1]) : 0));
  const total = seg.reduce((a, b) => a + b, 0);
  let acc = 0;
  return seg.map((d) => (acc += d) / total);
})();

// Sample alerts, in the portal's own severity colours and icons.
const ALERTS = [
  { text: "Aarav finished “Percent as a fraction” — 9 of 10 answers right.", bar: "#075E63", tint: "#DDF4E9", icon: "alert_science_badge" },
  { text: "Mathematics mastery is up 4% this week.", bar: "#075E63", tint: "#DDF4E9", icon: "alert_science_badge" },
  { text: "Science: 2 chapters started — one short session would finish one.", bar: "#F5A50B", tint: "#FDF0CF", icon: "alert_hindi_clock" },
];

// The lesson the child just finished lands: sessions tick over and the trend
// reaches today; then the page scrolls to Subject Overview, where Mathematics
// mastery moves up.
const LAND: [number, number] = [0.22, 0.38];
const SCROLL: [number, number] = [0.44, 0.62];
const MASTERY: [number, number] = [0.64, 0.82];

export function SceneParentHome({ p }: { p: Progress }) {
  const scroll = useRange(p, SCROLL, easeInOut);
  const y = useTransform(scroll, (v) => `${v * -14}em`);
  return (
    <ParentShell p={p} active="Home" url={`gened.ai/parent/${CHILD.name.toLowerCase()}`}
      camera={CAMERA}>
      <motion.div className="gc-ph" style={{ y }}>
        <div className="gc-ph-metrics">
          <Reveal p={p} at={[0.02, 0.09]} y={0.8} className="gc-glass gc-ph-card">
            <CardHead icon={<img src={ICON("metric_overall_score_star")} alt="" />} label="Overall Learning Score" />
            <div className="gc-ph-score">
              <div>
                <b className="gc-ph-big">
                  —<span>/100</span>
                </b>
                <small className="gc-ph-soon">
                  <Info size="1em" aria-hidden /> Available soon
                </small>
              </div>
              <span className="gc-ph-ring">—</span>
            </div>
          </Reveal>
          <Reveal p={p} at={[0.04, 0.11]} y={0.8} className="gc-glass gc-ph-card">
            <CardHead icon={<img src={ICON("metric_skill_index")} alt="" />} label="Skill Index" />
            <div className="gc-ph-skill">
              <b className="gc-ph-big">—</b>
              <span className="gc-ph-chip">Coming soon</span>
            </div>
            <div className="gc-ph-scale">
              <i />
              <span>
                <em>Below Grade</em>
                <em>Grade Level</em>
                <em>Above Grade</em>
              </span>
            </div>
          </Reveal>
          <Reveal p={p} at={[0.06, 0.13]} y={0.8} className="gc-glass gc-ph-card">
            <CardHead icon={<img src={ICON("metric_completed_sessions_calendar")} alt="" />} label="Completed Sessions" />
            <b className="gc-ph-big">
              <Count p={p} at={LAND} from={23} to={24} />
            </b>
            <small className="gc-ph-trendpct">
              <TrendingUp size="1.1em" strokeWidth={2.4} aria-hidden /> +18% this month
            </small>
          </Reveal>
          <Reveal p={p} at={[0.08, 0.15]} y={0.8} className="gc-glass gc-ph-card">
            <CardHead icon={<ClockIcon />} label="Study Time" />
            <b className="gc-ph-big">
              <Count p={p} at={LAND} from={5.1} to={5.5} decimals={1} suffix="h" />
            </b>
            <span className="gc-ph-select">Last 30 Days ▾</span>
          </Reveal>
        </div>

        <div className="gc-ph-row">
          <Reveal p={p} at={[0.1, 0.17]} y={0.8} className="gc-glass gc-ph-panel">
            <header className="gc-ph-panel-head">
              <span className="gc-ph-ico">
                <img src={ICON("learning_activity_icon")} alt="" />
              </span>
              <b>Learning Activity Trend</b>
              <small>Daily study minutes — last 30 days</small>
            </header>
            <div className="gc-ph-chart">
              <div className="gc-ph-yaxis">
                {[60, 45, 30, 15, 0].map((v) => (
                  <span key={v}>{v}</span>
                ))}
              </div>
              <div className="gc-ph-plot">
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
                  <defs>
                    <linearGradient id="gc-ph-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#075E63" stopOpacity="0.28" />
                      <stop offset="1" stopColor="#075E63" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {[0, 25, 50, 75].map((y) => (
                    <line key={y} x1="0" x2={W} y1={y} y2={y} className="gc-ph-grid" />
                  ))}
                  <AreaFill p={p} />
                  <Draw p={p} at={[0.1, 0.36]} d={LINE} fill="none" className="gc-ph-line" />
                </svg>
                {POINTS.map((_, i) => (
                  <ChartDot key={i} p={p} i={i} />
                ))}
                <TodayDot p={p} />
              </div>
              <div className="gc-ph-xaxis">
                {["1 Sept", "6 Sept", "11 Sept", "16 Sept", "21 Sept", "26 Sept"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal p={p} at={[0.12, 0.19]} y={0.8} className="gc-glass gc-ph-panel">
            <header className="gc-ph-panel-head">
              <span className="gc-ph-ico">
                <img src={ICON("alerts_icon")} alt="" />
              </span>
              <b>Recent Alerts &amp; Updates</b>
            </header>
            <ul className="gc-ph-alerts">
              {ALERTS.map((a, i) => (
                <Reveal key={a.text} p={p} at={[0.16 + i * 0.05, 0.26 + i * 0.05]} x={1.2} y={0} className="gc-ph-alert" style={{ borderLeftColor: a.bar }}>
                  <span className="gc-ph-ico" style={{ background: a.tint }}>
                    <img src={ICON(a.icon)} alt="" />
                  </span>
                  <p>{a.text}</p>
                  <span className="gc-ph-view">View Details ›</span>
                </Reveal>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal p={p} at={[0.16, 0.24]} y={0.8} className="gc-glass gc-ph-subjects">
          <header className="gc-ph-panel-head">
            <span className="gc-ph-ico">
              <img src={ICON("subject_overview_icon")} alt="" />
            </span>
            <div>
              <b>Subject Overview</b>
              <small className="gc-ph-sub">Click any subject to explore detailed chapter-level progress</small>
            </div>
          </header>
          <div className="gc-ph-grid4">
            {SUBJECTS.map((s, i) => (
              <SubjectCard key={s.name} p={p} i={i} {...s} />
            ))}
          </div>
        </Reveal>
      </motion.div>
    </ParentShell>
  );
}

function CardHead({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="gc-ph-cardhead">
      <span className="gc-ph-ico">{icon}</span>
      <b>{label}</b>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#075E63" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function TodayDot({ p }: { p: Progress }) {
  const t = useRange(p, [0.34, 0.4]);
  const scale = useTransform(t, [0, 1], [0, 1]);
  const [x, y] = xy(POINTS.length - 1);
  return (
    <motion.span className="gc-ph-today" style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, scale, opacity: t }}>
      <em>Today · 48 min</em>
    </motion.span>
  );
}

function SubjectCard({
  p,
  i,
  name,
  icon,
  band,
  mastery,
  before,
  sessions,
  time,
  chapters,
}: (typeof SUBJECTS)[number] & { p: Progress; i: number }) {
  const tone = BANDS[band];
  const t = useRange(p, MASTERY);
  const width = useTransform(t, (v) => `${before + (mastery - before) * v}%`);
  return (
    <Reveal
      p={p}
      at={[0.2 + i * 0.03, 0.28 + i * 0.03]}
      y={0.8}
      className="gc-ph-subj"
      style={{ background: `linear-gradient(180deg, ${tone.wash[0]}D9, ${tone.wash[1]}B3)`, borderColor: tone.edge }}
    >
      <div className="gc-ph-subj-top">
        <span className="gc-ph-subj-glyph" style={{ background: tone.tint }}>
          <MaskIcon src={`/report-card/icons/subjects/${icon}.png`} color={tone.accent} size="1.05em" />
        </span>
        <div>
          <b>{name}</b>
          <span className="gc-ph-band" style={{ background: tone.tint, color: tone.ink }}>
            {band}
          </span>
        </div>
      </div>
      <div className="gc-ph-mastery">
        <small>Mastery</small>
        <b style={{ color: tone.ink }}>
          <Count p={p} at={MASTERY} from={before} to={mastery} suffix="%" />
        </b>
      </div>
      <div className="gc-ph-bar">
        <motion.i style={{ width, background: tone.accent }} />
      </div>
      <dl className="gc-ph-stats">
        <div>
          <dt>Sessions</dt>
          <dd>{sessions}</dd>
        </div>
        <div>
          <dt>Study time</dt>
          <dd>{time}</dd>
        </div>
        <div>
          <dt>Chapters</dt>
          <dd>{chapters}</dd>
        </div>
      </dl>
    </Reveal>
  );
}

function AreaFill({ p }: { p: Progress }) {
  const opacity = useRange(p, [0.2, 0.4]);
  return <motion.path d={`${LINE} L${W} ${H} L0 ${H} Z`} fill="url(#gc-ph-fill)" style={{ opacity }} />;
}

/** Recharts-style point markers, appearing as the line reaches them. */
function ChartDot({ p, i }: { p: Progress; i: number }) {
  // Matches the line Draw over [0.1, 0.36] (eased in-out, so invert roughly via the same curve).
  const at = 0.1 + 0.26 * easeInOutInverse(ALONG[i]);
  const opacity = useTransform(p, [at, at + 0.01], [0, 1]);
  const [x, y] = xy(i);
  return <motion.i className="gc-ph-pt" style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, opacity }} />;
}

/** Inverse of the in-out cubic used by Draw, so a dot's time matches the stroke reaching it. */
function easeInOutInverse(y: number): number {
  return y < 0.5 ? Math.cbrt(y / 4) : 1 - Math.cbrt((1 - y) / 4);
}
