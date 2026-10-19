"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpenText, Check, History, ListChecks, Sparkles, TriangleAlert, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useVisualDetail } from "../../hooks/useVisualDetail";
import { REASON_LABELS, type CandidateState, type VisualDecisionOut, type VisualDetail } from "../../types/visuals";
import { DecisionPanel, isTypingTarget } from "./DecisionPanel";
import { RegenerationStatus } from "./RegenerationStatus";
import { VisualImage } from "./VisualImage";
import { Skeleton } from "../Skeleton";

interface VisualDetailPaneProps {
  id: string;
  onBack: () => void;
  onOpen: (id: string) => void;
  onDecided: (id: string, result: VisualDecisionOut) => void;
  /** Next pending visual, when there is one. */
  onNext: (() => void) | null;
}

// Render keyed by `id` (see VisualsModal): each visual gets fresh zoom and form state.

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
};

const STATE_STYLE: Record<CandidateState, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-[#D1E6D9]/60 text-[#1A3D2C] border-[#1A3D2C]/10",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

const STATE_LABEL: Record<CandidateState, string> = {
  pending: "To review",
  accepted: "Accepted",
  rejected: "Rejected",
};

export function StateChip({ state }: { state: CandidateState }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${STATE_STYLE[state]}`}>
      {STATE_LABEL[state]}
    </span>
  );
}

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h5 className="flex items-center gap-2 text-[10px] font-black text-[#1A3D2C]/50 uppercase tracking-widest mb-2">
      {icon}
      {children}
    </h5>
  );
}

function Passages({ detail }: { detail: VisualDetail }) {
  const refs = new Set(detail.spec.source_refs);
  const used = refs.size ? detail.concept.passages.filter((p) => refs.has(p.ref)) : detail.concept.passages;
  const others = refs.size ? detail.concept.passages.filter((p) => !refs.has(p.ref)) : [];

  if (!detail.concept.passages.length) return null;

  return (
    <section>
      <SectionLabel icon={<BookOpenText size={12} />}>From the textbook</SectionLabel>
      <div className="flex flex-col gap-2">
        {used.map((p) => (
          <blockquote
            key={p.ref}
            className="relative rounded-xl bg-[#FBFAF5] border border-[#1A3D2C]/5 pl-4 pr-3 py-3 before:absolute before:left-0 before:top-3 before:bottom-3 before:w-[3px] before:rounded-r-full before:bg-[#1A3D2C]/60"
          >
            <p className="text-[13px] leading-relaxed text-[#1A3D2C]/85 whitespace-pre-line">{p.text}</p>
            <cite className="block mt-1.5 not-italic text-[9px] font-black uppercase tracking-widest text-[#1A3D2C]/35">
              {p.ref}
            </cite>
          </blockquote>
        ))}
      </div>
      {others.length > 0 && (
        <details className="mt-2 group">
          <summary className="cursor-pointer text-[11px] font-bold text-[#1A3D2C]/50 hover:text-[#1A3D2C] select-none">
            Other passages from this concept ({others.length})
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {others.map((p) => (
              <blockquote key={p.ref} className="rounded-xl bg-[#F8F9F8] px-3 py-2.5">
                <p className="text-xs leading-relaxed text-[#1A3D2C]/60 whitespace-pre-line">{p.text}</p>
                <cite className="block mt-1 not-italic text-[9px] font-black uppercase tracking-widest text-[#1A3D2C]/30">
                  {p.ref}
                </cite>
              </blockquote>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function FamilyTimeline({ detail, onOpen }: { detail: VisualDetail; onOpen: (id: string) => void }) {
  if (detail.family.length < 2) return null;
  return (
    <section>
      <SectionLabel icon={<History size={12} />}>History</SectionLabel>
      <ol className="flex flex-col gap-1">
        {detail.family.map((member, i) => {
          const current = member.id === detail.id;
          return (
            <li key={member.id}>
              {/* eslint-disable-next-line no-restricted-syntax -- timeline row, not a sized action button */}
              <button
                type="button"
                disabled={current}
                aria-current={current ? "true" : undefined}
                onClick={() => onOpen(member.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                  current ? "bg-[#1A3D2C]/5 cursor-default" : "hover:bg-[#1A3D2C]/5"
                }`}
              >
                <span className="text-xs font-black text-[#1A3D2C] w-16 shrink-0">Version {i + 1}</span>
                <StateChip state={member.state} />
                <span className="ml-auto text-[11px] font-bold text-[#1A3D2C]/40">{formatDate(member.created_at)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function VisualDetailPane({ id, onBack, onOpen, onDecided, onNext }: VisualDetailPaneProps) {
  const { detail, loading, error, reload } = useVisualDetail(id);
  const [zoomed, setZoomed] = useState(false);

  // → moves to the next pending visual.
  useEffect(() => {
    if (!onNext) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      e.preventDefault();
      onNext();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onNext]);

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 flex items-center gap-2 px-5 md:px-7 py-3 bg-white/90 backdrop-blur border-b border-[#1A3D2C]/5">
        <Button variant="tertiary" size="sm" leadingIcon={<ArrowLeft size={14} />} onClick={onBack}>
          All visuals
        </Button>
        {detail && <StateChip state={detail.state} />}
        <div className="ml-auto">
          {onNext && (
            <Button variant="tertiary" size="sm" trailingIcon={<ArrowRight size={14} />} onClick={onNext}>
              Next <kbd className="ml-1 text-[10px] opacity-50">→</kbd>
            </Button>
          )}
        </div>
      </div>

      {loading && !detail && (
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-6 p-5 md:p-7">
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      )}

      {error && !detail && (
        <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
          <p className="text-sm font-bold text-[#1A3D2C]">{error}</p>
          <Button variant="outline" onClick={() => void reload()}>
            Try again
          </Button>
        </div>
      )}

      {detail && (
        <motion.div
          key={detail.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="grid lg:grid-cols-[1.15fr_1fr] gap-6 lg:gap-8 p-5 md:p-7"
        >
          {/* Left: the picture */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-[68px] self-start w-full">
            <div className="relative rounded-2xl border border-[#1A3D2C]/10 overflow-hidden bg-white">
              <div className={zoomed ? "overflow-auto max-h-[70vh]" : ""} data-testid="visual-zoom-frame">
                <VisualImage
                  imageUrl={detail.image_url}
                  alt={detail.title}
                  onExpired={() => void reload()}
                  className={zoomed ? "!w-[200%] max-w-none" : ""}
                />
              </div>
              {detail.image_url && (
                <Button
                  iconOnly
                  size="sm"
                  variant="outline"
                  aria-label={zoomed ? "Zoom out" : "Zoom in"}
                  aria-pressed={zoomed}
                  onClick={() => setZoomed((z) => !z)}
                  className="!absolute bottom-2 right-2 bg-white/90"
                >
                  {zoomed ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
                </Button>
              )}
            </div>
            <FamilyTimeline detail={detail} onOpen={onOpen} />
          </div>

          {/* Right: what to check it against, then the decision */}
          <div className="flex flex-col gap-6 min-w-0">
            <header>
              {detail.concept.section_title && (
                <p className="text-[10px] font-black uppercase tracking-widest text-[#1A3D2C]/40 mb-1">
                  {detail.concept.section_title}
                </p>
              )}
              <h3 className="text-xl md:text-2xl font-black text-[#1A3D2C] tracking-tight leading-tight">
                {detail.concept.title}
              </h3>
              {detail.concept.definition && (
                <p className="mt-2 text-sm leading-relaxed text-[#1A3D2C]/70">{detail.concept.definition}</p>
              )}
            </header>

            {detail.concept.feedback && (
              <div className="rounded-xl bg-[#D1E6D9]/40 border border-[#1A3D2C]/10 px-4 py-3 flex items-start gap-2.5">
                <Sparkles size={14} className="text-[#1A3D2C] mt-0.5 shrink-0" aria-hidden />
                <p className="text-xs text-[#1A3D2C]/80">
                  <span className="font-black">Made again after: </span>
                  {detail.concept.feedback.reason_codes.map((c) => REASON_LABELS[c] ?? c).join(", ")}
                  {detail.concept.feedback.note && <> — <q>{detail.concept.feedback.note}</q></>}
                </p>
              </div>
            )}

            <Passages detail={detail} />

            {detail.spec.checklist.length > 0 && (
              <section>
                <SectionLabel icon={<ListChecks size={12} />}>The picture should show</SectionLabel>
                <ul className="flex flex-col gap-1.5">
                  {detail.spec.checklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] text-[#1A3D2C]/85">
                      <span className="mt-0.5 h-4 w-4 shrink-0 rounded-[5px] border-[1.5px] border-[#1A3D2C]/25 flex items-center justify-center">
                        <Check size={10} className="text-[#1A3D2C]/30" aria-hidden />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {detail.critique?.passes === false && detail.critique.problems.length > 0 && (
              <section className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
                <h5 className="flex items-center gap-2 text-xs font-black text-amber-800 mb-1.5">
                  <TriangleAlert size={13} aria-hidden /> The AI reviewer flagged:
                </h5>
                <ul className="list-disc pl-5 flex flex-col gap-1 text-xs text-amber-900/80">
                  {detail.critique.problems.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </section>
            )}

            {detail.decision && (
              <p className="text-xs text-[#1A3D2C]/60">
                <span className="font-black text-[#1A3D2C]">
                  {detail.decision.decision === "accept" ? "Accepted" : "Rejected"}
                </span>{" "}
                on {formatDate(detail.decision.decided_at)}
                {detail.decision.reason_codes.length > 0 && (
                  <> · {detail.decision.reason_codes.map((c) => REASON_LABELS[c] ?? c).join(", ")}</>
                )}
                {detail.decision.note && <> — <q>{detail.decision.note}</q></>}
              </p>
            )}

            {detail.state === "pending" && (
              <DecisionPanel
                detail={detail}
                onDecided={(result) => onDecided(detail.id, result)}
                onConflict={() => void reload()}
              />
            )}

            <RegenerationStatus detail={detail} onOpen={onOpen} onChanged={() => void reload()} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
