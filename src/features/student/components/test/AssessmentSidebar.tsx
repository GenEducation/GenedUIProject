"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Lock, Sparkles } from "lucide-react";
import { CreateChapterTestResponse, PaperSection } from "../../types/test";
import { useState, useMemo } from "react";

interface AssessmentSidebarProps {
  currentTest: CreateChapterTestResponse;
  answers: Record<string, string>;
  matchSelections: Record<string, Record<number, string>>;
  currentSectionIdx: number;
  onNavigateToQuestion: (sectionIdx: number, questionId: string) => void;
}

const SECTION_LABELS: Record<PaperSection, string> = {
  A: "Objective",
  B: "Short Answer",
  C: "Long Answer",
};

export function AssessmentSidebar({
  currentTest,
  answers,
  matchSelections,
  currentSectionIdx,
  onNavigateToQuestion,
}: AssessmentSidebarProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const hasPaperSections = currentTest.paper_meta?.sections && currentTest.paper_meta.sections.length > 0;

  const sidebarSections = useMemo(() => {
    if (hasPaperSections) {
      const allQuestions = currentTest.sections.flatMap((s) => s.questions);
      return currentTest.paper_meta!.sections.map((meta) => {
        const questions = allQuestions.filter((q) => q.paper_section === meta.label);
        return { label: meta.label, title: meta.title, questions, meta };
      });
    }
    return currentTest.sections.map((s, i) => ({
      label: String.fromCharCode(65 + i) as PaperSection,
      title: s.main_heading,
      questions: s.questions,
      meta: null,
    }));
  }, [currentTest, hasPaperSections]);

  function isQuestionAnswered(questionId: string): boolean {
    return !!answers[questionId] || !!matchSelections[questionId];
  }

  return (
    <aside className="w-[450px] hidden xl:flex flex-col sticky top-24 h-[calc(100vh-120px)] bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-0 w-full h-full opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(#042E5C 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-slate-200 rounded-tl-2xl" />
        <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-slate-200 rounded-tr-2xl" />
        <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-slate-200 rounded-bl-2xl" />
        <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-slate-200 rounded-br-2xl" />
      </div>

      <div className="relative flex-1 overflow-y-auto custom-scrollbar p-12 space-y-24 pt-20">
        {sidebarSections.map((section, sIdx) => {
          const isCurrent = sIdx === currentSectionIdx;
          const isCompleted = section.questions.every((q) => isQuestionAnswered(q.question_id));
          const isLocked = sIdx > currentSectionIdx && !isCompleted;
          const isStaggeredRight = sIdx % 2 !== 0;

          const answeredCount = section.questions.filter((q) =>
            isQuestionAnswered(q.question_id)
          ).length;
          const totalCount = section.questions.length;

          return (
            <div key={sIdx} className="relative flex flex-col items-center">
              {sIdx < sidebarSections.length - 1 && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 w-48 h-32 z-0 pointer-events-none">
                  <svg
                    width="192"
                    height="128"
                    viewBox="0 0 192 128"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path
                      d={
                        isStaggeredRight
                          ? "M 136 0 L 136 64 L 56 64 L 56 128"
                          : "M 56 0 L 56 64 L 136 64 L 136 128"
                      }
                      stroke={isCompleted ? "#10B981" : "#00F2FF"}
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className="opacity-20"
                    />
                    <motion.path
                      d={
                        isStaggeredRight
                          ? "M 136 0 L 136 64 L 56 64 L 56 128"
                          : "M 56 0 L 56 64 L 136 64 L 136 128"
                      }
                      stroke={isCompleted ? "#10B981" : "#00F2FF"}
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: isCompleted ? 1 : 0.5 }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                    <motion.circle
                      r="4"
                      fill="#00F2FF"
                      animate={{ offsetDistance: ["0%", "100%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      style={{
                        offsetPath: `path('${
                          isStaggeredRight
                            ? "M 136 0 L 136 64 L 56 64 L 56 128"
                            : "M 56 0 L 56 64 L 136 64 L 136 128"
                        }')`,
                      }}
                    />
                  </svg>
                </div>
              )}

              <motion.div
                onHoverStart={() => setHoveredIdx(sIdx)}
                onHoverEnd={() => setHoveredIdx(null)}
                animate={{ x: isStaggeredRight ? 40 : -40 }}
                className="relative z-10 cursor-help group"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-6 border border-dashed border-cyan-400/20 rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-4 border-2 border-purple-400/20 rounded-full border-t-transparent border-b-transparent"
                />

                <div
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center relative transition-all duration-500
                    ${
                      isCompleted
                        ? "bg-emerald-50 text-emerald-500 border-2 border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                        : isCurrent
                        ? "bg-white text-cyan-500 border-2 border-cyan-400 shadow-[0_0_30px_rgba(0,242,255,0.3)]"
                        : "bg-white border border-slate-200 text-slate-300"
                    }
                    group-hover:scale-110
                  `}
                >
                  <span className="text-xl font-black tracking-tighter">{section.label}</span>

                  <div
                    className={`absolute -right-1 -bottom-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${
                      isCompleted
                        ? "bg-emerald-500"
                        : isLocked
                        ? "bg-slate-300"
                        : "bg-cyan-400 shadow-[0_0_10px_rgba(0,242,255,0.5)]"
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={12} className="text-white" strokeWidth={4} />
                    ) : isLocked ? (
                      <Lock size={12} className="text-white" />
                    ) : (
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {(isCurrent || hoveredIdx === sIdx) && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        x: isStaggeredRight ? -40 : 40,
                        scale: 0.9,
                      }}
                      animate={{
                        opacity: 1,
                        x: isStaggeredRight ? -240 : 80,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        x: isStaggeredRight ? -40 : 40,
                        scale: 0.9,
                      }}
                      className={`
                        absolute top-1/2 -translate-y-1/2 w-56 p-5 rounded-2xl border backdrop-blur-xl transition-all z-30 pointer-events-none
                        ${
                          isCurrent
                            ? "border-cyan-200 bg-white shadow-2xl shadow-cyan-100/50"
                            : "border-slate-100 bg-white/90 shadow-xl shadow-slate-100/50"
                        }
                      `}
                      style={{
                        clipPath:
                          "polygon(0 0, 90% 0, 100% 15%, 100% 100%, 10% 100%, 0 85%)",
                      }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[9px] font-black uppercase tracking-[0.2em] ${
                              isCurrent ? "text-cyan-500" : "text-slate-400"
                            }`}
                          >
                            {hasPaperSections
                              ? SECTION_LABELS[section.label] ?? section.label
                              : section.title}
                          </span>
                          <Sparkles
                            size={10}
                            className={
                              isCurrent ? "text-cyan-400 animate-pulse" : "text-slate-200"
                            }
                          />
                        </div>
                        <h4
                          className={`text-[13px] font-black uppercase truncate ${
                            isCurrent ? "text-slate-800" : "text-slate-400"
                          }`}
                        >
                          {section.title}
                        </h4>
                        <div className="pt-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {answeredCount}/{totalCount} Completed
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-1 p-[1px]">
                            {section.questions.map((q, qIdx) => (
                              <div
                                key={qIdx}
                                className={`flex-1 rounded-full transition-all duration-500 ${
                                  isQuestionAnswered(q.question_id)
                                    ? "bg-cyan-400 shadow-[0_0_5px_rgba(0,242,255,0.5)]"
                                    : "bg-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
