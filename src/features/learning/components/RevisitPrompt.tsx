"use client";

import Image from "next/image";
import { Target } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useLessonLaunch } from "@/features/student/learner/useLessonLaunch";
import { useLessonStore } from "../useLessonStore";
import { RevisitChoices } from "./RevisitChoices";

/** Two citron strokes beside the eyebrow, like a doodle in the margin. */
function Spark() {
  return (
    <svg aria-hidden viewBox="0 0 24 20" className="h-4 w-5 text-[var(--ls-accent)]" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <path d="M6 9 L9 2" />
      <path d="M11 13 L20 10" />
    </svg>
  );
}

/**
 * "Welcome back": shown once when the learner opens a chapter in progress that has weak sections (see
 * `useLessonLaunch.offerRevisit`), and again once the sections they chose to review are done while others are still
 * weak. Closing it carries on where they were.
 */
export function RevisitPrompt() {
  const open = useLessonStore((s) => s.revisitPromptOpen && s.instance?.state === "active");
  const options = useLessonStore((s) => s.revisitOptions);
  const close = useLessonStore((s) => s.closeRevisitPrompt);
  const instanceId = useLessonStore((s) => s.instanceId);
  const chapterTitle = useLessonLaunch((s) => (s.instanceId === instanceId ? s.chapter?.title ?? null : null));

  if (!options) return null;
  const resume = options.resume;
  const percent = resume && resume.nodes_total > 0 ? Math.round((resume.nodes_done / resume.nodes_total) * 100) : null;

  return (
    // The dialog is portalled to <body>, outside the lesson screen's `.lesson-theme`, so it carries the theme itself.
    // Capped at the viewport: the body scrolls under the pinned buttons (a 16-step chapter lists every section).
    // Not dismissible: no Escape, no backdrop click. The learner says what they want, and "Continue" is how they carry on.
    <Modal
      open={open}
      size="lg"
      title="Welcome back"
      titleVisible={false}
      className="lesson-theme"
      panelStyle={{ background: "var(--ls-card-warm)", maxHeight: "calc(100dvh - 2rem)" }}
    >
      <header className="relative isolate overflow-hidden bg-[var(--ls-primary)] text-white">
        {/* A sage hill for the illustration to sit on, and a citron glow behind it. */}
        <div
          aria-hidden
          className="absolute -bottom-28 -right-20 -z-10 hidden h-72 w-[420px] sm:block"
          style={{ background: "radial-gradient(closest-side, rgb(206 232 204 / 0.95), rgb(176 214 182 / 0.75) 62%, transparent)" }}
        />
        <div aria-hidden className="absolute -right-6 -top-16 -z-10 h-48 w-48 rounded-full bg-[var(--ls-accent)] opacity-25 blur-3xl" />
        <Image
          src="/illustrations/welcome-back-student.webp"
          alt=""
          width={880}
          height={407}
          priority
          className="pointer-events-none absolute bottom-0 right-0 hidden h-auto w-[300px] select-none sm:block"
        />
        <div className="relative px-6 py-6 sm:py-8 sm:pl-8 sm:pr-0">
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--ls-accent)]">
            Welcome back! <Spark />
          </p>
          <h2 className="lesson-hand mt-1.5 text-[30px] font-bold leading-[1.1] sm:whitespace-nowrap sm:text-[34px]">Ready to learn it again?</h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-white/85 sm:max-w-[52%]">
            Pick up where you left off, revisit any section, or start the chapter fresh. You&apos;ve got this!
          </p>
        </div>
      </header>

      <div className="relative p-5 sm:p-6">
        {resume && (
          <section
            aria-label="Chapter progress"
            className="relative mb-5 flex items-center gap-4 rounded-[20px] border border-[var(--ls-border)] bg-[var(--ls-primary-soft)] p-4 sm:p-5"
          >
            <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--ls-soft)] text-[var(--ls-primary)] sm:h-16 sm:w-16">
              <Target size={28} strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ls-ink-mid)]">Chapter progress</p>
              <p className="mt-0.5 truncate text-[16px] font-bold text-[var(--ls-primary)]">{chapterTitle ?? resume.title}</p>
              <p className="text-[13px] text-[var(--ls-ink-mid)]">
                Up next: step {resume.step} · {resume.title}
              </p>
              {percent !== null && (
                <div className="mt-2.5 flex items-center gap-3">
                  <span
                    role="progressbar"
                    aria-label="Chapter progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--ls-border)]"
                  >
                    <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--ls-accent-deep)]" style={{ width: `${percent}%` }} />
                  </span>
                  <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-[var(--ls-ink-mid)]">{percent}% complete</span>
                </div>
              )}
            </div>
          </section>
        )}

        <RevisitChoices options={options} onContinue={close} inDialog />
      </div>
    </Modal>
  );
}
