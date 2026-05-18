"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Award, ArrowRight, BookOpen } from "lucide-react";
import { SubmitTestResponse, CreateChapterTestResponse, ZPDVerdict } from "../../types/test";

interface TestResultsViewProps {
  test: CreateChapterTestResponse;
  result: SubmitTestResponse;
  onClose: () => void;
}

const VERDICT_CONFIG: Record<ZPDVerdict, { bg: string; text: string; icon: typeof Award; label: string }> = {
  ABOVE: { bg: "bg-emerald-50", text: "text-emerald-600", icon: Award, label: "Above Expectations" },
  AT: { bg: "bg-blue-50", text: "text-blue-600", icon: CheckCircle2, label: "At Expectations" },
  BELOW: { bg: "bg-orange-50", text: "text-orange-600", icon: XCircle, label: "Below Expectations" },
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

        <h2 className="text-3xl font-extrabold text-[#042E5C]">
          Overall Score: {Math.round(result.overall_score * 100)}%
        </h2>

        {hasMarksData && (
          <p className="text-lg font-bold text-[#042E5C]/70">
            {obtainedMarks} / {totalMarks} marks
          </p>
        )}

        <p className="text-[#042E5C]/60 max-w-md mx-auto">
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
            className="p-5 bg-white rounded-2xl border border-[#042E5C]/10 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#042E5C]/5 flex items-center justify-center text-[#042E5C]">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-[#042E5C]">{sectionTitle}</h4>
                  <p className="text-[12px] text-[#042E5C]/50 uppercase tracking-widest font-bold">
                    Verdict: {data.verdict}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-[#042E5C]">
                  {Math.round(data.actual_score * 100)}%
                </div>
                {data.total_marks != null && (
                  <div className="text-[13px] font-bold text-[#042E5C]/60">
                    {data.marks_obtained} / {data.total_marks}
                  </div>
                )}
                <div className="text-[11px] text-[#042E5C]/40">
                  Target: {Math.round(data.expected_score * 100)}%
                </div>
              </div>
            </div>

            {data.total_marks != null && (
              <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(data.marks_obtained / data.total_marks) * 100}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                  className={`h-full rounded-full ${
                    data.verdict === "ABOVE"
                      ? "bg-emerald-400"
                      : data.verdict === "AT"
                      ? "bg-blue-400"
                      : "bg-orange-400"
                  }`}
                />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-[#042E5C] text-lg flex items-center gap-2">
          Detailed Feedback
        </h3>

        <div className="space-y-3">
          {result.graded_questions.map((graded, idx) => {
            const question = test.sections
              .flatMap((s) => s.questions)
              .find((q) => q.question_id === graded.question_id);
            if (!question) return null;

            const hasGradedMarks = graded.marks != null && graded.marks > 0;

            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#F8F9FA] border border-[#042E5C]/5 space-y-2"
              >
                <div className="flex justify-between items-start gap-4">
                  <p className="text-[14px] font-medium text-[#042E5C]/80 flex-1">
                    {question.prompt}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {hasGradedMarks && (
                      <span className="text-[12px] font-bold text-[#042E5C]/50">
                        {graded.marks_awarded} / {graded.marks}
                      </span>
                    )}
                    <div
                      className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                        graded.score_0_1 === 1
                          ? "bg-emerald-100 text-emerald-700"
                          : graded.score_0_1 > 0
                          ? "bg-orange-100 text-orange-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {Math.round(graded.score_0_1 * 100)}%
                    </div>
                  </div>
                </div>
                <p className="text-[13px] text-[#042E5C]/60 italic bg-white/50 p-2 rounded-lg border border-dashed border-[#042E5C]/10">
                  AI Review: {graded.rationale}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full py-4 bg-[#042E5C] text-white rounded-2xl font-bold text-[16px] shadow-lg shadow-[#042E5C]/20 flex items-center justify-center gap-2 hover:bg-[#064282] transition-all"
      >
        Continue Learning
        <ArrowRight size={20} />
      </button>
    </div>
  );
}
