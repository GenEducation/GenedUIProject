"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Award, ArrowRight, BookOpen, MessageSquareText } from "lucide-react";
import { SubmitTestResponse, CreateChapterTestResponse, ZPDVerdict } from "../../types/test";

interface TestResultsViewProps {
  test: CreateChapterTestResponse;
  result: SubmitTestResponse;
  onClose: () => void;
}

const VERDICT_CONFIG: Record<ZPDVerdict, { bg: string; text: string; icon: typeof Award; label: string }> = {
  // ABOVE is earned, so it gets the citron badge (ink on citron); AT sits on
  // the calm soft surface; BELOW stays on the warning hue, never red.
  ABOVE: { bg: "bg-[var(--accent)]", text: "text-[var(--accent-ink)]", icon: Award, label: "Above Expectations" },
  AT: { bg: "bg-[var(--soft-surface)]", text: "text-[var(--primary)]", icon: CheckCircle2, label: "At Expectations" },
  BELOW: { bg: "bg-[var(--warning-bg)]", text: "text-[var(--warning-ink)]", icon: XCircle, label: "Below Expectations" },
};

export function TestResultsView({ test, result, onClose }: TestResultsViewProps) {
  const verdict = VERDICT_CONFIG[result.overall_verdict];
  const VerdictIcon = verdict.icon;

  const totalMarks = Object.values(result.section_results).reduce(
    (sum, s) => sum + (s.total_marks ?? 0),
    0
  );
  const obtainedMarks = Object.values(result.section_results).reduce(
    (sum, s) => sum + (s.marks_obtained ?? 0),
    0
  );
  const hasMarksData = totalMarks > 0;

  return (
    <div className="space-y-8 py-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${verdict.bg} ${verdict.text} font-bold text-sm tracking-wider uppercase`}
        >
          <VerdictIcon size={18} />
          {verdict.label}
        </div>

        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[var(--ink)]">
          Overall Score: <span className="citron-mark">{Math.round(result.overall_score * 100)}%</span>
        </h2>

        {hasMarksData && (
          <p className="text-lg font-bold text-[var(--primary)]">
            {obtainedMarks} / {totalMarks} marks
          </p>
        )}

        <p className="text-[var(--text-muted)] max-w-md mx-auto">
          Great effort on the {test.document_title} test! Here&apos;s a breakdown of your
          performance by section.
        </p>
      </motion.div>

      <div className="grid gap-4">
        {Object.entries(result.section_results).map(([sectionTitle, data], idx) => (
          <motion.div
            key={sectionTitle}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-3 sm:p-5 bg-white rounded-2xl border border-[var(--surface-border)] shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[var(--soft-surface)] flex items-center justify-center text-[var(--primary)] flex-shrink-0">
                  <BookOpen size={20} className="sm:hidden" />
                  <BookOpen size={24} className="hidden sm:block" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--primary-ink)] text-[14px] sm:text-[16px]">{sectionTitle}</h4>
                  <p className="text-[11px] sm:text-[12px] text-[var(--primary-ink)]/50 uppercase tracking-widest font-bold">
                    Verdict: {data.verdict}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg sm:text-xl font-black text-[var(--primary-ink)]">
                  {Math.round(data.actual_score * 100)}%
                </div>
                {data.total_marks != null && (
                  <div className="text-[13px] font-bold text-[var(--primary-ink)]/60">
                    {data.marks_obtained} / {data.total_marks}
                  </div>
                )}
                <div className="text-[11px] text-[var(--primary-ink)]/40">
                  Target: {Math.round(data.expected_score * 100)}%
                </div>
              </div>
            </div>

            {data.total_marks != null && (
              <div className="mt-3 h-2 bg-[var(--canvas)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(data.marks_obtained / data.total_marks) * 100}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                  className={`h-full rounded-full ${
                    data.verdict === "ABOVE"
                      ? "bg-[var(--accent-deep)]"
                      : data.verdict === "AT"
                      ? "bg-[var(--primary)]"
                      : "bg-[var(--warning)]"
                  }`}
                />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="citron-eyebrow font-bold text-[var(--ink)] text-lg">
          <MessageSquareText size={18} strokeWidth={2.2} aria-hidden />
          Detailed Feedback
        </h3>

        <div className="space-y-3">
          {result.graded_questions.map((graded, idx) => {
            const question = test?.sections
              ?.flatMap((s) => s.questions)
              .find((q) => q.question_id === graded.question_id);
            if (!question) return null;

            const hasGradedMarks = graded.marks != null && graded.marks > 0;

            return (
              <div
                key={idx}
                className="p-3 sm:p-4 rounded-xl bg-[var(--canvas)] border border-[var(--primary-ink)]/5 space-y-2"
              >
                <div className="flex justify-between items-start gap-2 sm:gap-4">
                  <p className="text-[14px] font-medium text-[var(--primary-ink)]/80 flex-1">
                    {question.prompt}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {hasGradedMarks && (
                      <span className="text-[12px] font-bold text-[var(--primary-ink)]/50">
                        {graded.marks_awarded} / {graded.marks}
                      </span>
                    )}
                    <div
                      className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                        graded.score_0_1 === 1
                          ? "bg-[var(--soft-surface)] text-[var(--primary)]"
                          : graded.score_0_1 > 0
                          ? "bg-[var(--warning-bg)] text-[var(--warning-ink)]"
                          : "bg-[var(--danger-bg)] text-[var(--danger-ink)]"
                      }`}
                    >
                      {Math.round(graded.score_0_1 * 100)}%
                    </div>
                  </div>
                </div>
                <p className="text-[13px] text-[var(--primary-ink)]/60 italic bg-white/50 p-2 rounded-lg border border-dashed border-[var(--primary-ink)]/10">
                  AI Review: {graded.rationale}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full py-4 bg-[var(--primary)] text-white rounded-2xl font-bold text-[16px] shadow-lg shadow-[var(--primary)]/20 flex items-center justify-center gap-2 hover:bg-[var(--primary-hover)] transition-all"
      >
        Continue Learning
        <ArrowRight size={20} />
      </button>
    </div>
  );
}
