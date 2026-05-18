"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Send, Sparkles, Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTestStore } from "@/features/student/store/useTestStore";
import { QuestionRenderer } from "@/features/student/components/test/QuestionRenderer";
import { TestResultsView } from "@/features/student/components/test/TestResultsView";
import { AssessmentSidebar } from "@/features/student/components/test/AssessmentSidebar";
import { PaperHeader } from "@/features/student/components/test/PaperHeader";
import { SectionDivider } from "@/features/student/components/test/SectionDivider";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Question, PaperSection } from "@/features/student/types/test";

interface GroupedSection {
  label: PaperSection;
  questions: Question[];
}

function TestPageContent() {
  const router = useRouter();
  const {
    currentTest,
    answers,
    justifications,
    matchSelections,
    updateAnswer,
    updateJustification,
    updateMatchSelection,
    submitTest,
    isSubmitting,
    isLoading,
    testResult,
    resetTest,
    timerSeconds,
  } = useTestStore();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "analytics";

  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [showSubmitWarning, setShowSubmitWarning] = useState(false);

  const hasPaperSections =
    currentTest?.paper_meta?.sections && currentTest.paper_meta.sections.length > 0;

  const groupedSections: GroupedSection[] = useMemo(() => {
    if (!currentTest) return [];
    const allQuestions = currentTest.sections.flatMap((s) => s.questions);

    if (hasPaperSections) {
      const order: PaperSection[] = ["A", "B", "C"];
      return order
        .map((label) => ({
          label,
          questions: allQuestions.filter((q) => q.paper_section === label),
        }))
        .filter((g) => g.questions.length > 0);
    }

    return currentTest.sections.map((s, i) => ({
      label: String.fromCharCode(65 + i) as PaperSection,
      questions: s.questions,
    }));
  }, [currentTest, hasPaperSections]);

  const currentGroup = groupedSections[currentSectionIdx];
  const isFirstSection = currentSectionIdx === 0;
  const isLastSection = currentSectionIdx === groupedSections.length - 1;

  useEffect(() => {
    if (!currentTest && !isLoading && !testResult) {
      router.push(from === "assessments" ? "/student/assessments" : "/student/analytics");
    }
  }, [currentTest, isLoading, testResult, router, from]);

  const handleNext = () => {
    if (!isLastSection) {
      setCurrentSectionIdx((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (!isFirstSection) {
      setCurrentSectionIdx((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onNavigateToQuestion = (sectionIdx: number, questionId: string) => {
    setCurrentSectionIdx(sectionIdx);
    setTimeout(() => {
      const element = document.getElementById(`question-${questionId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const totalQuestions = useMemo(
    () => groupedSections.reduce((acc, g) => acc + g.questions.length, 0),
    [groupedSections]
  );

  const answeredCount = useMemo(() => {
    const allQIds = groupedSections.flatMap((g) => g.questions.map((q) => q.question_id));
    return allQIds.filter((id) => !!answers[id] || !!matchSelections[id]).length;
  }, [groupedSections, answers, matchSelections]);

  const handleClose = () => {
    resetTest();
    router.push(from === "assessments" ? "/student/assessments" : "/student/analytics");
  };

  const handleTimerExpired = useCallback(() => {
    submitTest();
  }, [submitTest]);

  const unansweredCount = totalQuestions - answeredCount;

  const handleSubmitClick = () => {
    if (unansweredCount > 0) {
      setShowSubmitWarning(true);
    } else {
      submitTest();
    }
  };

  let questionCounter = 0;
  for (let i = 0; i < currentSectionIdx; i++) {
    questionCounter += groupedSections[i]?.questions.length ?? 0;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="relative inline-block">
            <Loader2 size={64} className="text-[#042E5C] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={24} className="text-[#042E5C] animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-[#042E5C]">Preparing Your Assessment</h2>
            <p className="text-[#042E5C]/60 max-w-xs mx-auto">
              Our AI is calibrating questions to your current mastery level...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#042E5C]/5 px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-[#042E5C]/5 text-[#042E5C] flex items-center justify-center hover:bg-[#042E5C]/10 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-black text-[#042E5C] leading-tight">
                {currentTest?.document_title || "Chapter Assessment"}
              </h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-[#042E5C]/40 uppercase tracking-widest">
                  Live Assessment Mode
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-black text-emerald-600 uppercase tracking-tighter">
                Connection Stable
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1400px] mx-auto w-full flex gap-12 p-6 py-12">
        {currentTest && !testResult && (
          <AssessmentSidebar
            currentTest={currentTest}
            answers={answers}
            matchSelections={matchSelections}
            currentSectionIdx={currentSectionIdx}
            onNavigateToQuestion={onNavigateToQuestion}
          />
        )}

        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {testResult ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[40px] p-8 md:p-12 border border-[#042E5C]/5 shadow-xl shadow-[#042E5C]/5"
              >
                <TestResultsView
                  test={currentTest!}
                  result={testResult}
                  onClose={handleClose}
                />
              </motion.div>
            ) : currentTest ? (
              <motion.div
                key={currentSectionIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {currentSectionIdx === 0 && (
                  <PaperHeader
                    title={currentTest.document_title}
                    subject={currentTest.subject ?? ""}
                    grade={currentTest.grade ?? 0}
                    paperMeta={currentTest.paper_meta}
                    timerSeconds={timerSeconds}
                    onTimerExpired={handleTimerExpired}
                  />
                )}

                {currentGroup && hasPaperSections && currentTest.paper_meta?.sections && (
                  <SectionDivider
                    sectionMeta={
                      currentTest.paper_meta.sections.find(
                        (s) => s.label === currentGroup.label
                      ) ?? currentTest.paper_meta.sections[0]
                    }
                  />
                )}

                <div className="space-y-6">
                  {currentGroup?.questions.map((q, idx) => {
                    const qNum = questionCounter + idx + 1;
                    return (
                      <motion.div
                        key={q.question_id}
                        id={`question-${q.question_id}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="scroll-mt-32"
                      >
                        <QuestionRenderer
                          question={q}
                          questionNumber={qNum}
                          answer={answers[q.question_id]}
                          justification={justifications[q.question_id]}
                          matchSelections={matchSelections[q.question_id]}
                          onAnswerChange={updateAnswer}
                          onJustificationChange={updateJustification}
                          onMatchSelectionChange={updateMatchSelection}
                        />
                      </motion.div>
                    );
                  })}
                </div>

                <div className="pt-12 mt-12 border-t border-[#042E5C]/5 flex items-center justify-between">
                  <button
                    onClick={handleBack}
                    disabled={isFirstSection}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-[#042E5C]/40 hover:text-[#042E5C] font-black text-xs uppercase tracking-widest disabled:opacity-0 transition-all"
                  >
                    <ChevronLeft size={16} />
                    Previous Section
                  </button>

                  <div className="flex items-center gap-3">
                    {isLastSection ? (
                      <button
                        onClick={handleSubmitClick}
                        disabled={isSubmitting}
                        className="px-8 py-3 bg-[#042E5C] text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg shadow-[#042E5C]/20 hover:bg-[#064282] disabled:opacity-50 transition-all"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Finalizing...
                          </>
                        ) : (
                          <>
                            Submit Assessment
                            <Send size={16} />
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleNext}
                        className="px-8 py-3 bg-[#042E5C] text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg shadow-[#042E5C]/20 hover:bg-[#064282] transition-all"
                      >
                        Next Section
                        <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {showSubmitWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 text-center shadow-2xl space-y-5"
            >
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <AlertTriangle size={28} className="text-amber-500" />
              </div>
              <h2 className="text-xl font-extrabold text-[#042E5C]">
                {unansweredCount} unanswered {unansweredCount === 1 ? "question" : "questions"}
              </h2>
              <p className="text-[#042E5C]/60 text-[15px]">
                Unanswered questions will be scored as 0. Are you sure you want to submit?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubmitWarning(false)}
                  className="flex-1 py-3 bg-slate-100 text-[#042E5C] rounded-xl font-bold text-[15px] hover:bg-slate-200 transition-all"
                >
                  Go Back
                </button>
                <button
                  onClick={() => {
                    setShowSubmitWarning(false);
                    submitTest();
                  }}
                  className="flex-1 py-3 bg-[#042E5C] text-white rounded-xl font-bold text-[15px] hover:bg-[#064282] transition-all"
                >
                  Submit Anyway
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TestPage() {
  return (
    <AuthGuard requiredRole="student">
      <TestPageContent />
    </AuthGuard>
  );
}
