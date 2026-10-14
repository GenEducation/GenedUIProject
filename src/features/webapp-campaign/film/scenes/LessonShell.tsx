"use client";

// The lesson screen, recreated from LessonScreen / LessonHeader / LessonRail /
// LessonProgressRail / BoardPanel / ChatPanel: progress rail · whiteboard ·
// tutor chat. The ask and speak scenes both sit inside it, so the film reads
// like one continuous lesson.

import type { ReactNode } from "react";
import {
  BookOpen,
  Check,
  ChevronRight,
  Flag,
  Lightbulb,
  MessageSquareText,
  Mic,
  NotebookPen,
  SendHorizontal,
  Target,
  Timer,
  X,
} from "lucide-react";
import { motion, useTransform } from "framer-motion";
import { BrowserFrame, Count, useRange, type CameraKey, type Progress, type Range } from "../primitives";
import { CHAPTER } from "../filmScript";

export const AVATAR = "/avatars/students/boy_01_green_hoodie.png";
export const COVER = "/film/cover-comparing-quantities.webp";

/** The chapter's steps (5 nodes). The rail only ever names done, current and the next one. */
const NODES = [
  { title: "Ratios and percentages", kind: "Learn" },
  { title: "Percent as a fraction", kind: "Learn" },
  { title: "Finding totals", kind: "Practice" },
  { title: "Discounts", kind: "Learn" },
  { title: "Profit and loss", kind: "Check" },
];
const TOTAL = NODES.length;

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

interface LessonShellProps {
  p: Progress;
  /** Steps done (the current step is NODES[done]). */
  done: number;
  /** When given, the current step completes over this range. */
  advanceAt?: Range;
  /** Switch the board's mode from Chat to Voice over this range. */
  voiceAt?: Range;
  /** Session timer, seconds at the scene's start and end. */
  clock: [number, number];
  board: ReactNode;
  chat: ReactNode;
  footer: ReactNode;
  /** Push-ins on the action (see Camera). */
  camera?: CameraKey[];
}

export function LessonShell({ p, done, advanceAt, voiceAt, clock, board, chat, footer, camera }: LessonShellProps) {
  const seconds = useTransform(p, [0, 1], clock);
  const clockText = useTransform(seconds, fmt);
  const adv = useRange(p, advanceAt ?? [2, 3]);
  const before = useTransform(adv, [0, 1], [1, 0]);
  return (
    <BrowserFrame url={`gened.ai/student/lesson/${CHAPTER.title.toLowerCase().replace(/\s+/g, "-")}`} p={p} camera={camera}>
      {/* eslint-disable @next/next/no-img-element -- static mock art */}
      <div className="gc-app gc-lesson">
        <header className="gc-l-head">
          <img src="/brand/gened-logo.png" alt="" className="gc-l-logo" />
          <nav className="gc-l-crumb">
            <span>{CHAPTER.subject}</span>
            <ChevronRight size="1.05em" aria-hidden />
            <b>{CHAPTER.title}</b>
          </nav>
          <span className="gc-l-chip">
            <Timer className="gc-l-chip-timer" size="1.2em" strokeWidth={2.2} aria-hidden />
            <span>
              <motion.b>{clockText}</motion.b>
              <small>Session time</small>
            </span>
          </span>
          <span className="gc-l-chip">
            <i className="gc-l-chip-flag">
              <Flag size="0.75em" strokeWidth={2.4} aria-hidden />
            </i>
            <span>
              <b>
                {advanceAt ? <Count p={p} at={advanceAt} from={done} to={done + 1} /> : done}/{TOTAL}
              </b>
              <small>Steps done</small>
            </span>
          </span>
          <img src={AVATAR} alt="" className="gc-l-avatar" />
          <span className="gc-l-close">
            <X size="0.85em" aria-hidden />
          </span>
        </header>

        <div className="gc-l-cols">
          {/* ── Rail: the chapter and its steps ── */}
          <aside className="gc-l-rail">
            <div className="gc-l-cover">
              <img src={COVER} alt="" />
              {/* The cover art leaves its left third clear for the chapter's number and title. */}
              <div className="gc-l-cover-title">
                <small>Chapter {CHAPTER.number}</small>
                <b>{CHAPTER.title}</b>
              </div>
            </div>
            <p className="gc-l-rail-h">Lesson Progress</p>
            <div className="gc-l-steps-stack">
              <motion.div style={{ opacity: before }}>
                <RailSteps done={done} />
              </motion.div>
              {advanceAt && (
                <motion.div className="gc-l-steps-next" style={{ opacity: adv }}>
                  <RailSteps done={done + 1} />
                </motion.div>
              )}
            </div>
          </aside>

          {/* ── Whiteboard ── */}
          <section className="gc-l-board">
            <div className="gc-l-board-top">
              <ModeSwitch p={p} voiceAt={voiceAt} />
              <span className="gc-l-kind">{NODES[done].kind}</span>
            </div>
            <div className="gc-l-paper">
              {board}
              <div className="gc-l-zoom">
                <span>−</span>
                <b>100%</b>
                <span>+</span>
              </div>
            </div>
            <div className="gc-l-quick">
              <span>
                <Lightbulb size="1.05em" strokeWidth={2.2} aria-hidden /> Concepts
              </span>
              <span>
                <BookOpen size="1.05em" strokeWidth={2.2} aria-hidden /> Examples
              </span>
              <span>
                <Target size="1.05em" strokeWidth={2.2} aria-hidden /> Practice
              </span>
              <span>
                <NotebookPen size="1.05em" strokeWidth={2.2} aria-hidden /> Notes
              </span>
            </div>
          </section>

          {/* ── Tutor chat ── */}
          <section className="gc-l-chat">
            <div className="gc-l-turns">{chat}</div>
            {footer}
          </section>
        </div>
      </div>
      {/* eslint-enable @next/next/no-img-element */}
    </BrowserFrame>
  );
}

/** Done steps, the current one with its kind, the next one, then "N more steps"; and the progress bar. */
function RailSteps({ done }: { done: number }) {
  const rows: { label: string; state: "done" | "current" | "todo"; quiet?: boolean; kind?: string }[] = [];
  NODES.slice(0, done).forEach((n) => rows.push({ label: n.title, state: "done" }));
  rows.push({ label: NODES[done].title, state: "current", kind: NODES[done].kind });
  if (NODES[done + 1]) rows.push({ label: NODES[done + 1].title, state: "todo" });
  const more = TOTAL - done - 2;
  if (more > 0) rows.push({ label: `${more} more ${more === 1 ? "step" : "steps"}`, state: "todo", quiet: true });
  const pct = Math.round((done / TOTAL) * 100);
  return (
    <>
      <ol className="gc-l-steps">
        {rows.map((r, i) => (
          <li key={r.label} className={`gc-l-step gc-l-step-${r.state}`}>
            {i < rows.length - 1 && <span className={r.state === "done" ? "gc-l-step-line gc-l-step-line-done" : "gc-l-step-line"} />}
            <span className="gc-l-dot">{r.state === "done" && <Check size="0.62em" strokeWidth={3.2} aria-hidden />}</span>
            <span className="gc-l-step-text">
              <span className={r.quiet ? "gc-l-step-quiet" : undefined}>{r.label}</span>
              {r.kind && <small>{r.kind}</small>}
            </span>
          </li>
        ))}
      </ol>
      <div className="gc-l-progress">
        <div className="gc-l-progress-track">
          <span style={{ width: `${pct}%` }} />
        </div>
        <small>
          <span>
            {done} of {TOTAL} steps done
          </span>
          <span>{pct}%</span>
        </small>
      </div>
    </>
  );
}

function ModeSwitch({ p, voiceAt }: { p: Progress; voiceAt?: Range }) {
  const on = useRange(p, voiceAt ?? [2, 3]);
  const x = useTransform(on, (t) => `${t * 100}%`);
  const chatColor = useTransform(on, [0, 1], ["#FFFFFF", "rgba(18,45,48,0.66)"]);
  const voiceColor = useTransform(on, [0, 1], ["rgba(18,45,48,0.66)", "#FFFFFF"]);
  const chatDisc = useTransform(on, [0, 1], ["#D9F279", "#FFFFFF"]);
  const voiceDisc = useTransform(on, [0, 1], ["#FFFFFF", "#D9F279"]);
  return (
    <div className="gc-l-mode">
      <motion.span className="gc-l-mode-hl" style={{ x }} />
      <motion.span className="gc-l-mode-seg" style={{ color: chatColor }}>
        <motion.i style={{ backgroundColor: chatDisc }}>
          <MessageSquareText size="1em" strokeWidth={2.2} aria-hidden />
        </motion.i>
        Chat
      </motion.span>
      <motion.span className="gc-l-mode-seg" style={{ color: voiceColor }}>
        <motion.i style={{ backgroundColor: voiceDisc }}>
          <Mic size="1em" strokeWidth={2.2} aria-hidden />
        </motion.i>
        Voice
      </motion.span>
    </div>
  );
}

/**
 * The message box: a two-row field (text, then mic left / send right).
 * `text` overrides the placeholder; `sendPress` scales the send button.
 */
export function Composer({ text, active, sendStyle }: { text?: ReactNode; active?: boolean; sendStyle?: object }) {
  return (
    <div className="gc-l-composer-wrap">
      <div className={active ? "gc-l-composer gc-l-composer-on" : "gc-l-composer"}>
        <div className="gc-l-composer-text">{text ?? <span className="gc-l-composer-ph">Type a message…</span>}</div>
        <div className="gc-l-composer-row">
          <i className="gc-l-mic">
            <Mic size="1em" strokeWidth={2.2} aria-hidden />
          </i>
          <motion.i className={active ? "gc-l-send gc-l-send-on" : "gc-l-send"} style={sendStyle}>
            <SendHorizontal size="1em" strokeWidth={2.2} aria-hidden />
          </motion.i>
        </div>
      </div>
    </div>
  );
}

/** The learner's turn: a mint bubble, the time under it, their avatar beside it. */
export function LearnerTurn({ children, time }: { children: ReactNode; time: string }) {
  return (
    <div className="gc-l-turn gc-l-turn-me">
      <div className="gc-l-me-col">
        <p className="gc-l-bubble">{children}</p>
        <small className="gc-l-time">{time}</small>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- static mock art */}
      <img src={AVATAR} alt="" className="gc-l-me" />
    </div>
  );
}

/** One tutor turn: the mortarboard mark and a tutor bubble. */
export function Turn({ children }: { children: ReactNode }) {
  return <div className="gc-l-turn">{children}</div>;
}
