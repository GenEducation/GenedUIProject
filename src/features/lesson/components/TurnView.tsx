"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertCircle, CheckCircle2, ChevronDown, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MarkdownRenderer } from "@/features/student/components/MarkdownRenderer";
import type { EarlierPart, TranscriptTurn } from "../store/useLessonStore";
import type { PresentationManifest, TeacherPayload } from "../types/lesson";
import { findFigureGroup } from "../store/figures";
import { normalizeHeading } from "../display";
import { FigureBlock } from "./FigureBlock";

/** What happened, in the learner's terms. `connection_lost` is this client; every other reason is the server's. */
const FAILURE_COPY: Record<string, string> = {
  first_token_timeout: "Your tutor took too long to answer.",
  stream_interrupted: "Your tutor's reply was cut off.",
  model_error: "Your tutor couldn't finish that reply.",
  policy_refused: "Your tutor couldn't answer that one.",
  safety_refused: "Your tutor couldn't answer that one.",
  safety_unavailable: "Your tutor is unavailable for a moment.",
  prepare_failed: "Your tutor couldn't get ready to answer.",
  record_failed: "That couldn't be saved.",
  context_drift: "The lesson moved on before the reply finished.",
  connection_lost: "Lost the connection to your tutor.",
};

export function Avatar({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex-shrink-0 overflow-hidden rounded-full bg-white"
      style={{ width: size, height: size, border: "1px solid #E2E8F0" }}
    >
      <Image src="/Favicon1.jpg" alt="" width={size} height={size} className="h-full w-full object-cover" />
    </div>
  );
}

function AnswerBadge({ answer }: { answer: NonNullable<TranscriptTurn["answer"]> }) {
  if (answer.outcome === "unscorable") {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-[#B7791F]">
        <AlertCircle size={13} /> Couldn&apos;t read this answer
      </span>
    );
  }
  if (answer.correct === true) {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-[var(--primary)]">
        <CheckCircle2 size={13} /> Correct
      </span>
    );
  }
  if (answer.correct === false) {
    return (
      <span className="flex items-center gap-1 text-xs font-bold text-[#E8635A]">
        <XCircle size={13} /> Not quite
      </span>
    );
  }
  return <span className="text-xs font-semibold text-[#94A3B8]">Answer saved</span>;
}

interface TurnViewProps {
  turn: TranscriptTurn;
  onRegenerate?: () => void;
  /** Needed to resolve `turn.figureGroupId` to its crops and their signed URLs. Omitted, no figure renders. */
  payload?: TeacherPayload;
  manifest?: PresentationManifest | null;
  onExpiredManifest?: () => void;
}

export function TurnView({ turn, onRegenerate, payload, manifest, onExpiredManifest }: TurnViewProps) {
  const figureGroup = turn.figureGroupId && payload ? findFigureGroup(payload, turn.figureGroupId) : null;
  return (
    <div className="mb-6">
      {turn.learnerText && (
        <div className="mb-3 flex flex-col items-end gap-1">
          <div
            className="min-w-[44px] max-w-[80%] px-4 py-2.5 text-center text-[14px] text-white"
            style={{
              borderRadius: "1.25rem",
              borderTopRightRadius: 6,
              background: "var(--tutor)",
              boxShadow: "0 2px 10px rgba(91,77,199,0.18)",
            }}
          >
            {turn.learnerText}
          </div>
          {turn.answer && <AnswerBadge answer={turn.answer} />}
        </div>
      )}
      {turn.answer?.outcome === "unscorable" && (
        <div className="ml-10 rounded-xl px-4 py-3 text-[13.5px] text-[#7C4A11]" style={{ background: "#FFF8EC", border: "1px solid #F3D9AE" }}>
          I couldn&apos;t read that as an answer. Write it with digits, like <b>2</b>, <b>1/2</b> or <b>1 1/2</b>, and try the
          question again.
        </div>
      )}
      {(turn.teacherText || turn.status === "streaming") && (
        <div className="flex items-start gap-3">
          <Avatar />
          <div className="min-w-0 flex-1 pt-0.5 text-[14.5px] leading-relaxed text-[#1A202C]">
            {figureGroup && (
              <FigureBlock group={figureGroup} manifest={manifest ?? null} onExpired={onExpiredManifest ?? (() => {})} />
            )}
            {turn.teacherText ? (
              <MarkdownRenderer content={turn.teacherText} />
            ) : (
              <span className="animate-pulse font-medium text-[#94A3B8]">Thinking…</span>
            )}
          </div>
        </div>
      )}
      {turn.status === "interrupted" && <p className="ml-10 mt-1 text-xs text-[#94A3B8]">You stopped this reply.</p>}
      {turn.status === "failed" && (
        <div className="ml-10 mt-2 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#FDF2F1" }}>
          <p className="text-[13px] font-medium text-[#B83F37]">
            {FAILURE_COPY[turn.failedReason ?? ""] ?? "That reply didn't come through."}
          </p>
          {turn.retryable && onRegenerate && (
            <Button size="sm" onClick={onRegenerate} leadingIcon={<RotateCcw size={13} />}>
              Try again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function PartDivider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-[#E2E8F0]" />
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">{label}</span>
      <div className="h-px flex-1 bg-[#E2E8F0]" />
    </div>
  );
}

/** A finished part: one line, full contrast, opened on demand, so the current part is what the learner sees. */
export function EarlierPartSummary({ part }: { part: EarlierPart }) {
  const [open, setOpen] = useState(false);
  const messages = part.turns.filter((t) => t.learnerText || t.teacherText).length;
  return (
    <div className="mb-2">
      {/* A disclosure toggle, not a design-system action button. */}
      {/* eslint-disable-next-line no-restricted-syntax */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-xl border border-[rgba(4,46,92,0.06)] bg-white px-4 py-2.5 text-left"
        aria-expanded={open}
      >
        <CheckCircle2 size={15} className="flex-shrink-0 text-[var(--primary)]" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--primary-ink)]">
          {normalizeHeading(part.title)}
        </span>
        <span className="text-xs text-[#94A3B8]">{messages} messages</span>
        <ChevronDown size={15} className={`text-[#94A3B8] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="pt-4">
          {part.turns.map((turn) => (
            <TurnView key={turn.turnId} turn={turn} />
          ))}
        </div>
      )}
    </div>
  );
}
