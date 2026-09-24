"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ChapterReport, OutcomeRollup } from "../types/lesson";
import type { EarlierPart, TranscriptTurn } from "../store/useLessonStore";

/** What each outcome status means, in the learner's words (`gened_learning` chapter report). */
function outcomeLine(o: OutcomeRollup): { badge: string; tone: "good" | "neutral"; explain: string } {
  if (o.mastered) return { badge: "Mastered", tone: "good", explain: "Your answers show you've got this." };
  switch (o.status) {
    case "measured":
      return { badge: "Keep practising", tone: "neutral", explain: "Your answers show this still needs some practice." };
    case "not_fully_measurable":
      return {
        badge: "Partly checked",
        tone: "neutral",
        explain: "This chapter's questions only cover part of this skill, so it can't be fully measured yet.",
      };
    default:
      return { badge: "Not checked", tone: "neutral", explain: "No question in this chapter checked this skill yet." };
  }
}

interface ChapterReportViewProps {
  report: ChapterReport;
  chapterTitle: string | null;
  /** This visit's conversation, used for a count of the questions answered in it. */
  earlier: EarlierPart[];
  transcript: TranscriptTurn[];
}

export function ChapterReportView({ report, chapterTitle, earlier, transcript }: ChapterReportViewProps) {
  const router = useRouter();
  const answered = [...earlier.flatMap((p) => p.turns), ...transcript].filter(
    (t) => t.answer && t.answer.outcome !== "unscorable",
  );
  const correct = answered.filter((t) => t.answer?.correct === true).length;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-6 sm:p-10">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--tutor)]">
          {chapterTitle ? `${chapterTitle} · complete` : "Chapter complete"}
        </p>
        <h2 className="mt-1 text-2xl font-black text-[var(--primary-ink)]">You finished the chapter 🎉</h2>
        <p className="mt-1 text-sm text-[#64748B]">
          All {report.nodes_total} parts done.
          {answered.length > 0 && ` In this session you got ${correct} of ${answered.length} questions right.`}
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">What this chapter checked</p>
        <div className="flex flex-col gap-2">
          {report.outcomes.map((o) => {
            const line = outcomeLine(o);
            return (
              <div
                key={o.lo_id}
                className="rounded-2xl border border-[rgba(4,46,92,0.06)] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(4,46,92,0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--primary-ink)]">{o.title}</p>
                  <span
                    className="flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
                    style={
                      line.tone === "good"
                        ? { background: "rgba(5,159,109,0.1)", color: "var(--primary)" }
                        : { background: "#F1F5F9", color: "#64748B" }
                    }
                  >
                    {line.badge}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#64748B]">{line.explain}</p>
              </div>
            );
          })}
        </div>
      </div>

      <Button onClick={() => router.push("/student")} trailingIcon={<ArrowRight size={16} />}>
        Back to home
      </Button>
    </div>
  );
}
