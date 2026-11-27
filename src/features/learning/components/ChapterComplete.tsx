"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, BookOpenText, Check, ChevronLeft, ChevronRight, Ear, HandHelping, Mic, PencilLine, Sparkles } from "lucide-react";
import type { LessonActivity } from "@/features/student/learner/types";
import { ActivityCard } from "./ActivityCard";
import { MomentArt } from "@/components/shared/MomentArt";
import { Button } from "@/components/ui/Button";
import { CHAPTER_COMPLETE_ART } from "@/features/student/theme/momentArt";
import { useLessonLaunch } from "@/features/student/learner/useLessonLaunch";
import { useLessonStore } from "../useLessonStore";
import type { ChapterReport as LessonReport, RevisitOptions } from "../types";
import { RevisitChoices } from "./RevisitChoices";

/**
 * The finished chapter, in two stages.
 *
 * 1. Celebrate: the jigsaw's last piece drops in, a headline that matches how it went, three figures. "See how you did"
 *    leads, "Back to chapters" sits under it. Nothing to scroll.
 * 2. Review ("See how you did"): the details as short cards, one at a time: what you learned, what to keep practising,
 *    which sections to go over again. Cards with nothing in them are left out.
 *
 * Every figure is the backend report's (`LessonReport`) and the revisit options'; nothing is computed beyond the
 * headline's choice of words.
 */
export function ChapterComplete() {
  const report = useLessonStore((s) => s.report);
  const options = useLessonStore((s) => (s.revisitOptions?.instance_id === s.instanceId ? s.revisitOptions : null));
  const instanceId = useLessonStore((s) => s.instanceId);
  const launch = useLessonLaunch((s) => (s.instanceId === instanceId ? s : null));
  const exitHref = launch?.subject ? `/student/subjects/${encodeURIComponent(launch.subject)}` : "/student";
  const [stage, setStage] = useState<"celebrate" | "review">("celebrate");

  if (!report) {
    return <div aria-busy="true" className="mx-auto h-[420px] w-full max-w-[440px] animate-pulse rounded-[28px] bg-white/70" />;
  }
  return (
    <AnimatePresence mode="wait" initial={false}>
      {stage === "celebrate" ? (
        <motion.div key="celebrate" className="w-full" exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.18 }}>
          <Celebrate report={report} chapterTitle={launch?.chapter?.title ?? null} exitHref={exitHref} onReview={() => setStage("review")} />
        </motion.div>
      ) : (
        <motion.div key="review" className="w-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <Review report={report} options={options} exitHref={exitHref} chapterTitle={launch?.chapter?.title ?? null} onBack={() => setStage("celebrate")} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * The headline, by how the answers went. Always about the effort and what comes next, never a grade: a tough chapter
 * finished is still a chapter finished.
 */
export function mood(report: LessonReport) {
  const { answered, correct } = report.answers;
  if (answered === 0) return { title: "Chapter done!", line: "You made it through every step. Well done for sticking with it." };
  const r = correct / answered;
  if (r >= 0.85) return { title: "Brilliant work!", line: "You got almost everything right. You really know this chapter now." };
  if (r >= 0.6) return { title: "Well done, you did it!", line: "Every step finished. A couple of bits need one more look, then they're all yours." };
  return { title: "You made it to the end!", line: "This one was tricky, and you kept going. Going over a few bits will make it click." };
}

function Celebrate({
  report,
  chapterTitle,
  exitHref,
  onReview,
}: {
  report: LessonReport;
  chapterTitle: string | null;
  exitHref: string;
  onReview: () => void;
}) {
  const m = mood(report);
  const mastered = report.outcomes.filter((o) => o.mastered).length;
  return (
    <section
      aria-labelledby="chapter-complete-heading"
      className="lesson-rise relative mx-auto flex w-full max-w-[480px] flex-col items-center overflow-hidden rounded-[32px] px-7 pb-7 pt-2 text-center shadow-[0_28px_70px_-28px_rgb(29_99_21/0.5)] ring-1 ring-[var(--ls-border)]"
      style={{
        background:
          "radial-gradient(90% 55% at 50% 18%, rgb(166 207 8 / 0.28), transparent 70%), linear-gradient(180deg, var(--ls-soft) 0%, var(--ls-card) 62%)",
      }}
    >
      {/* Paper pieces burst out as the last jigsaw piece lands. */}
      <PaperBurst />
      {/* The last jigsaw piece drops and clicks into place (a rendered move, played once). */}
      <MomentArt art={CHAPTER_COMPLETE_ART} width={290} shadow={false} className="relative -mb-4" />
      <p className="relative text-[11.5px] font-bold uppercase tracking-[0.2em] text-[var(--ls-accent-deep)]">Chapter complete</p>
      {chapterTitle && <p className="relative mt-1 text-[14px] font-semibold text-[var(--ls-ink-mid)]">{chapterTitle}</p>}
      <h2 id="chapter-complete-heading" className="lesson-hand relative mt-1 text-[42px] leading-[1.1] text-[var(--ls-primary)]">
        {m.title}
      </h2>
      <p className="relative mt-2 max-w-[340px] text-[15px] leading-relaxed text-[var(--ls-ink-mid)]">{m.line}</p>

      <ul className="relative mt-5 grid w-full grid-cols-3 gap-2">
        <Figure value={`${report.nodes_done}/${report.nodes_total}`} label="steps" />
        <Figure value={`${report.answers.correct}/${report.answers.answered}`} label="right" />
        <Figure value={`${mastered}/${report.outcomes.length}`} label="goals" />
      </ul>

      <div className="relative mt-6 flex w-full flex-col gap-2">
        {/* See how you did leads: the review is where the chapter's lessons are. */}
        <Button variant="primary" size="lg" fullWidth onClick={onReview} trailingIcon={<ChevronRight size={17} />} className="!rounded-full">
          See how you did
        </Button>
        <Link
          href={exitHref}
          className="rounded-full px-5 py-2.5 text-[14.5px] font-semibold text-[var(--ls-primary)] transition hover:bg-[var(--ls-primary-soft)]"
        >
          Back to chapters
        </Link>
      </div>
    </section>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <li className="rounded-2xl bg-white/85 px-2 py-2.5 ring-1 ring-[var(--ls-border)]">
      <div className="text-[20px] font-extrabold tabular-nums leading-none text-[var(--ls-primary)]">{value}</div>
      <div className="mt-1 text-[11.5px] font-semibold text-[var(--ls-ink-mid)]">{label}</div>
    </li>
  );
}

type Card = { key: string; title: string; hint: string; body: React.ReactNode };

function Review({
  report,
  options,
  exitHref,
  chapterTitle,
  onBack,
}: {
  report: LessonReport;
  options: RevisitOptions | null;
  exitHref: string;
  chapterTitle: string | null;
  onBack: () => void;
}) {
  const completed = useLessonStore((st) => st.instance?.completed_nodes);
  const cards = useMemo<Card[]>(() => {
    const list: Card[] = [];
    if (report.outcomes.length > 0) {
      list.push({
        key: "learned",
        title: "What you learned",
        hint: "The goals of this chapter",
        body: (
          <ul className="flex flex-col gap-2">
            {report.outcomes.map((o) => (
              <li key={o.lo_id} className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3">
                <span
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                    o.mastered ? "bg-[var(--ls-primary)] text-white" : "border-2 border-[var(--ls-border-strong)]"
                  }`}
                >
                  {o.mastered && <Check size={13} strokeWidth={3} aria-hidden />}
                </span>
                <span className="flex-1 text-left text-[14.5px] leading-snug text-[var(--ls-ink)]">{o.title}</span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${
                    o.mastered ? "bg-[var(--ls-primary-soft)] text-[var(--ls-primary)]" : "bg-[var(--ls-warn-soft)] text-[var(--ls-warn)]"
                  }`}
                >
                  {o.mastered ? "Got it" : "Almost"}
                </span>
              </li>
            ))}
          </ul>
        ),
      });
    }
    if (report.keep_practising.length > 0) {
      list.push({
        key: "practise",
        title: "Keep practising",
        hint: "A little more on these will make them stick",
        body: (
          <ul className="flex flex-col gap-2">
            {report.keep_practising.map((k) => (
              <li key={k.component_id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                <Sparkles size={16} className="shrink-0 text-[var(--ls-accent-deep)]" aria-hidden />
                <span className="flex-1 text-left text-[14.5px] text-[var(--ls-ink)]">{k.title}</span>
                {k.needs_adult_support && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--ls-soft)] px-2.5 py-0.5 text-[11.5px] font-semibold text-[var(--ls-ink-mid)]">
                    <HandHelping size={12} aria-hidden /> Ask a grown-up
                  </span>
                )}
              </li>
            ))}
          </ul>
        ),
      });
    }
    const done = completed?.filter((n) => n.activities?.length) ?? [];
    if (done.length > 0) {
      list.push({
        key: "answers",
        title: "Your answers",
        hint: "Everything you tried, step by step. Play any of them again.",
        body: <YourAnswers nodes={done} />,
      });
    }
    if (options && options.sections.length > 0) {
      list.push({
        key: "again",
        title: "Go over it again",
        hint: "Pick the parts you'd like to replay",
        body: <RevisitChoices options={options} exitHref={exitHref} />,
      });
    }
    return list;
  }, [report, options, exitHref, completed]);

  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const go = (to: number) => {
    if (to < 0 || to >= cards.length) return;
    setDir(to > index ? 1 : -1);
    setIndex(to);
  };
  const card = cards[index];
  const last = index === cards.length - 1;

  return (
    <section aria-labelledby="chapter-review-heading" className="mx-auto flex w-full max-w-[560px] flex-col">
      <div className="flex items-center gap-2">
        <Button variant="tertiary" size="sm" onClick={onBack} leadingIcon={<ArrowLeft size={15} />}>
          Back
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <h2 id="chapter-review-heading" className="text-[17px] font-bold text-[var(--ls-ink)]">
            How you did
          </h2>
          {chapterTitle && <p className="truncate text-[12.5px] text-[var(--ls-ink-mid)]">{chapterTitle}</p>}
        </div>
        <span className="w-[68px]" aria-hidden />
      </div>

      {card ? (
        <>
          <div className="relative mt-4 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div
                key={card.key}
                custom={dir}
                initial={{ x: dir * 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: dir * -60, opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60) go(index + 1);
                  else if (info.offset.x > 60) go(index - 1);
                }}
                className="rounded-[24px] bg-[var(--ls-soft)] p-5 sm:p-6"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ls-accent-deep)]">
                  {index + 1} of {cards.length}
                </p>
                <h3 className="mt-1 text-[20px] font-bold text-[var(--ls-ink)]">{card.title}</h3>
                <p className="mb-4 mt-0.5 text-[13px] text-[var(--ls-ink-mid)]">{card.hint}</p>
                <div className="max-h-[46vh] overflow-y-auto pr-1">{card.body}</div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="tertiary" size="sm" onClick={() => go(index - 1)} disabled={index === 0} leadingIcon={<ChevronLeft size={15} />}>
              Previous
            </Button>
            <div className="flex gap-1.5" role="tablist" aria-label="Review cards">
              {cards.map((c, i) => (
                // eslint-disable-next-line no-restricted-syntax -- a progress dot, not a design-system button
                <button
                  key={c.key}
                  role="tab"
                  aria-selected={i === index}
                  aria-label={c.title}
                  onClick={() => go(i)}
                  className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-[var(--ls-primary)]" : "w-2 bg-[var(--ls-border-strong)]"}`}
                />
              ))}
            </div>
            {last && card.key === "again" ? (
              // The revisit picker carries its own way out ("Back to chapters"): no second exit here.
              <span className="w-[68px]" aria-hidden />
            ) : last ? (
              <Link href={exitHref} className="rounded-full bg-[var(--ls-primary)] px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-[var(--ls-primary-hover)]">
                Done
              </Link>
            ) : (
              <Button variant="primary" size="sm" onClick={() => go(index + 1)} trailingIcon={<ChevronRight size={15} />}>
                Next
              </Button>
            )}
          </div>
        </>
      ) : (
        <Link href={exitHref} className="mt-6 self-center rounded-full bg-[var(--ls-primary)] px-5 py-2.5 text-[14px] font-semibold text-white">
          Back to chapters
        </Link>
      )}
    </section>
  );
}

const MODE = {
  write: { icon: PencilLine, label: "Written" },
  speak: { icon: Mic, label: "Spoken" },
  read_aloud: { icon: BookOpenText, label: "Read aloud" },
  listen: { icon: Ear, label: "Listening" },
} as const;

/** Every activity of the chapter, by step: what it asked, how it was answered, and a way to play it again. */
function YourAnswers({ nodes }: { nodes: Array<{ instance_node_id: string; title: string; activities?: LessonActivity[] }> }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4">
      {nodes.map((node) => (
        <div key={node.instance_node_id}>
          <p className="mb-2 text-left text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ls-ink-mid)]">{node.title}</p>
          <ul className="flex flex-col gap-2">
            {node.activities?.map((a) => {
              const mode = MODE[a.mode] ?? MODE.write;
              const Icon = mode.icon;
              const key = `${node.instance_node_id}:${a.item_id}`;
              return (
                <li key={key} className="rounded-2xl bg-white px-4 py-3 text-left">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--ls-soft)] text-[var(--ls-primary)]">
                      <Icon size={14} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[14px] leading-snug text-[var(--ls-ink)]">{a.prompt}</p>
                      <p className="mt-0.5 text-[12px] text-[var(--ls-ink-mid)]">
                        {mode.label} · {a.attempted ? "Done" : "Skipped"}
                      </p>
                    </div>
                    <Button variant="tertiary" size="sm" onClick={() => setOpen(open === key ? null : key)}>
                      {open === key ? "Close" : "Try again"}
                    </Button>
                  </div>
                  {open === key && (
                    <div className="mt-3">
                      <ActivityCard nodeId={node.instance_node_id} activity={a} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * Paper pieces bursting out from behind the jigsaw as its last piece lands, then drifting down and fading: the
 * paper-and-ink palette (lime, paper, ink green), once. Left out under reduced motion.
 */
const BURST = Array.from({ length: 22 }, (_, i) => {
  const a = (i / 22) * Math.PI * 2 + (i % 2 ? 0.2 : -0.15);
  const r = 115 + ((i * 37) % 75);
  return {
    x: Math.cos(a) * r,
    y: Math.sin(a) * r * 0.5 + 10,
    spin: ((i * 53) % 300) - 150,
    shape: i % 3,
    colour: i % 3 === 0 ? "#A6CF08" : i % 3 === 1 ? "#FBFAF4" : "#1D6315",
    size: 11 + ((i * 7) % 7),
  };
});

function PaperBurst() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-[120px] h-0 w-0">
      {BURST.map((p, i) => (
        <motion.span
          key={i}
          className="absolute block"
          style={{
            width: p.size,
            height: p.shape === 2 ? p.size : p.size * 0.6,
            background: p.colour,
            border: p.colour === "#FBFAF4" ? "1px solid #17500F" : undefined,
            borderRadius: p.shape === 2 ? "50%" : 2,
            clipPath: p.shape === 1 ? "polygon(50% 0, 100% 100%, 0 100%)" : undefined,
          }}
          initial={{ x: 0, y: 0, scale: 0.3, opacity: 0, rotate: 0 }}
          animate={{
            x: [0, p.x, p.x * 1.08],
            y: [0, p.y, p.y + 70],
            scale: [0.3, 1, 0.9],
            opacity: [0, 1, 0],
            rotate: [0, p.spin, p.spin * 1.6],
          }}
          transition={{ duration: 1.5, delay: 0.75 + (i % 6) * 0.02, times: [0, 0.35, 1], ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
