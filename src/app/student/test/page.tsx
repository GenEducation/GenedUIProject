"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Send, Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTestStore } from "@/features/student/store/useTestStore";
import { MultipleChoiceQuestion } from "@/features/student/components/test/MultipleChoiceQuestion";
import { ShortAnswerQuestion } from "@/features/student/components/test/ShortAnswerQuestion";
import { TestResultsView } from "@/features/student/components/test/TestResultsView";
import { AssessmentSidebar } from "@/features/student/components/test/AssessmentSidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";

function TestPageContent() {
  const router = useRouter();
  const { 
    currentTest, 
    answers, 
    updateAnswer, 
    submitTest, 
    isSubmitting, 
    isLoading, 
    testResult,
    resetTest
  } = useTestStore();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "analytics";

  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);

  const sections = useMemo(() => currentTest?.sections || [], [currentTest]);
  const currentSection = sections[currentSectionIdx];
  
  const isFirstSection = currentSectionIdx === 0;
  const isLastSection = currentSectionIdx === sections.length - 1;

  // Redirect if no test is active and not loading
  useEffect(() => {
    if (!currentTest && !isLoading && !testResult) {
      router.push(from === "assessments" ? "/student/assessments" : "/student/analytics");
    }
  }, [currentTest, isLoading, testResult, router, from]);

  const handleNext = () => {
    if (!isLastSection) {
      setCurrentSectionIdx(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (!isFirstSection) {
      setCurrentSectionIdx(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const onNavigateToQuestion = (sectionIdx: number, questionId: string) => {
    setCurrentSectionIdx(sectionIdx);
    // Smooth scroll to the specific question
    setTimeout(() => {
      const element = document.getElementById(`question-${questionId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const totalQuestions = useMemo(() => 
    sections.reduce((acc, s) => acc + s.questions.length, 0), 
  [sections]);

  const answeredCount = useMemo(() => 
    Object.keys(answers).length, 
  [answers]);

  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const handleClose = () => {
    resetTest();
    router.push(from === "assessments" ? "/student/assessments" : "/student/analytics");
  };

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
      {/* Immersive Header */}
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

      {/* Main Content Area - Two Column Layout */}
      <div className="flex-1 max-w-[1400px] mx-auto w-full flex gap-12 p-6 py-12">
        {currentTest && !testResult && (
          <AssessmentSidebar 
            currentTest={currentTest}
            answers={answers}
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
            ) : currentSection ? (
              <motion.div
                key={currentSectionIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-16"
              >
                {/* Questions List */}
                <div className="space-y-20">
                  {currentSection.questions.map((q, idx) => (
                    <motion.div 
                      key={q.question_id}
                      id={`question-${q.question_id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="group scroll-mt-32"
                    >
                      <div className="flex items-start gap-8">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-[#042E5C]/10 text-[#042E5C] flex items-center justify-center font-black text-xl shrink-0 shadow-sm group-hover:border-[#042E5C]/30 transition-all">
                          {idx + 1}
                        </div>
                        <div className="flex-1 pt-1">
                          {q.type === "multiple_choice" ? (
                            <MultipleChoiceQuestion
                              question={q}
                              selectedAnswer={answers[q.question_id]}
                              onSelect={(ans) => updateAnswer(q.question_id, ans)}
                            />
                          ) : (
                            <ShortAnswerQuestion
                              question={q}
                              value={answers[q.question_id]}
                              onChange={(val) => updateAnswer(q.question_id, val)}
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Inline Section Navigation */}
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
                        onClick={submitTest}
                        disabled={isSubmitting || answeredCount < totalQuestions}
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
