"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, User, TrendingUp, Shield, Clock, Lock, ShieldCheck } from "lucide-react";
import { onboardingService } from "../services/onboardingService";
import { WavingStudentCharacter } from "../../../components/shared/loaders/StudentLoader/WavingStudentCharacter";

interface OnboardingSliderViewProps {
  studentProfile: {
    user_id: string;
    username: string;
    age?: number;
    grade?: number;
  };
  onComplete: () => void;
}

const QUESTIONS = [
  {
    id: "learning_preferences",
    title: "Learning Preferences",
    description: "How do you prefer to absorb new information? (e.g., visual, auditory, hands-on)",
    placeholder: "I learn best when I see diagrams or watch videos...",
  },
  {
    id: "interests",
    title: "Interests",
    description: "What subjects or hobbies excite you the most?",
    placeholder: "I am really into space exploration and solving complex math puzzles...",
  },
  {
    id: "strengths",
    title: "Strengths",
    description: "What are your best academic or personal skills?",
    placeholder: "I am good at explaining things to others and I have a strong memory...",
  },
  {
    id: "weaknesses",
    title: "Weaknesses",
    description: "What areas do you find most challenging?",
    placeholder: "I sometimes struggle with time management and long-form writing...",
  },
];

export const OnboardingSliderView: React.FC<OnboardingSliderViewProps> = ({
  studentProfile,
  onComplete,
}) => {
  const [isStarted, setIsStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({
    learning_preferences: "",
    interests: "",
    strengths: "",
    weaknesses: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        student_id: studentProfile.user_id,
        name: studentProfile.username,
        age: Number(studentProfile.age) || 0,
        grade: Number(studentProfile.grade) || 0,
        learning_preferences: [answers.learning_preferences],
        interests: [answers.interests],
        strengths: [answers.strengths],
        weaknesses: [answers.weaknesses],
      };
      console.log("Submitting onboarding data:", payload);
      await onboardingService.completeGeneralOnboarding(payload);
      localStorage.setItem("start_tutorial_after_onboarding", "true");
      onComplete();
    } catch (err) {
      console.error("Onboarding submission failed:", err);
      setError("Failed to save your preferences. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = QUESTIONS[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#042e5c]/10 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl overflow-hidden rounded-[2.5rem] border border-white/20 bg-white/80 shadow-[0_32px_80px_rgba(4,46,92,0.12)] backdrop-blur-xl flex flex-col"
      >
        <AnimatePresence mode="wait">
          {!isStarted ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex h-full w-full flex-col md:flex-row"
            >
              {/* Left Column: Visuals & Benefits — hidden on mobile, shown on md+ */}
              <div className="hidden md:flex md:relative md:flex-1 flex-col items-center justify-center bg-gradient-to-br from-[#059F6D] to-[#042e5c] p-10 text-white overflow-hidden">
                {/* Decorative Stars/Sparks */}
                <div className="absolute top-10 left-10 w-2 h-2 bg-yellow-300 rounded-full blur-[1px] animate-pulse" />
                <div className="absolute top-40 right-20 w-3 h-3 bg-blue-300 rounded-full blur-[1px] opacity-60" />
                <div className="absolute bottom-20 left-20 w-2 h-2 bg-pink-300 rounded-full blur-[1px] opacity-40" />
                
                <div className="relative z-10 flex flex-col items-center">
                  <div className="mb-12">
                    <WavingStudentCharacter />
                  </div>
                  
                  <div className="space-y-8 w-full max-w-[280px]">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold tracking-tight">Personalized Learning</h4>
                        <p className="text-[11px] text-white/70 font-medium">I adapt to how you think and learn.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold tracking-tight">Smarter Progress</h4>
                        <p className="text-[11px] text-white/70 font-medium">I adjust the pace and difficulty for you.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold tracking-tight">Your Privacy Matters</h4>
                        <p className="text-[11px] text-white/70 font-medium">Your data is private and never shared.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Call to Action */}
              <div className="flex flex-col bg-white p-6 sm:p-10 md:p-14 flex-1 overflow-y-auto">
                {/* Mobile-only top banner */}
                <div className="flex items-center gap-3 mb-6 md:hidden bg-gradient-to-r from-[#059F6D] to-[#042e5c] rounded-2xl px-4 py-3">
                  <span className="text-2xl">🎓</span>
                  <div>
                    <p className="text-white font-black text-sm">GenEd AI</p>
                    <p className="text-white/70 text-xs">Your personal learning guide</p>
                  </div>
                </div>
                <div className="mb-auto">
                  <h2 className="font-serif text-2xl md:text-3xl font-extrabold text-[#042e5c] leading-tight mb-4">
                    Let's build your <br /><span className="text-[#059F6D]">learning profile</span>
                  </h2>
                  <p className="text-sm text-[#042e5c]/60 leading-relaxed font-medium">
                    I'll ask you a few simple questions to understand how you learn best. This helps me teach you in the most effective way.
                  </p>

                  <div className="mt-10 space-y-3">
                    <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-5 py-4 border border-gray-100">
                      <Clock className="h-5 w-5 text-[#042e5c]/40" />
                      <span className="text-[13px] font-bold text-[#042e5c]/70">Takes about 5-7 minutes</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-5 py-4 border border-gray-100">
                      <Lock className="h-5 w-5 text-[#042e5c]/40" />
                      <span className="text-[13px] font-bold text-[#042e5c]/70">100% Private & Secure</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-6">
                  <button
                    onClick={() => setIsStarted(true)}
                    className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-[#059F6D] py-4.5 text-sm font-bold text-white shadow-xl shadow-[#059F6D]/20 transition-all hover:bg-[#047a54] active:scale-[0.98]"
                  >
                    Start Onboarding
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  <div className="pt-6 border-t border-gray-100 flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-[#059F6D] shrink-0 mt-0.5" />
                    <p className="text-[10px] text-[#042e5c]/40 leading-relaxed font-medium">
                      By continuing, you agree to our <a href="#" className="underline font-bold text-[#059F6D]">Terms of Service</a> and <a href="#" className="underline font-bold text-[#059F6D]">Privacy Policy</a>.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="questions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 p-6 sm:p-10 overflow-y-auto flex-1"
            >
              {/* Progress Bar */}
              <div className="mb-12 flex gap-2">
                {QUESTIONS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                      idx <= currentStep ? "bg-[#059F6D]" : "bg-[#042e5c]/10"
                    }`}
                  />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#042e5c] sm:text-4xl">
                      {currentQuestion.title}
                    </h2>
                    <p className="mt-2 text-lg text-[#042e5c]/60">
                      {currentQuestion.description}
                    </p>
                  </div>

                  <textarea
                    value={answers[currentQuestion.id]}
                    onChange={(e) =>
                      setAnswers({ ...answers, [currentQuestion.id]: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (answers[currentQuestion.id].trim() && !isSubmitting) {
                          handleNext();
                        }
                      }
                    }}
                    placeholder={currentQuestion.placeholder}
                    className="min-h-[140px] sm:min-h-[200px] w-full rounded-2xl border border-[#042e5c]/10 bg-white/50 p-4 sm:p-6 text-base sm:text-lg text-[#042e5c] transition-all focus:border-[#059F6D] focus:outline-none focus:ring-4 focus:ring-[#059F6D]/5"
                  />
                </motion.div>
              </AnimatePresence>

              {error && (
                <p className="mt-4 text-sm font-medium text-rose-500">{error}</p>
              )}

              <div className="mt-12 flex items-center justify-between">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 0 || isSubmitting}
                  className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                    currentStep === 0 || isSubmitting
                      ? "opacity-0 cursor-default"
                      : "text-[#042e5c]/40 hover:text-[#042e5c]"
                  }`}
                >
                  <ArrowLeft size={18} /> Back
                </button>

                <button
                  onClick={handleNext}
                  disabled={!answers[currentQuestion.id].trim() || isSubmitting}
                  className="group flex items-center gap-2 rounded-xl bg-[#059F6D] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#059F6D]/20 transition-all hover:shadow-xl hover:shadow-[#059F6D]/30 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : currentStep === QUESTIONS.length - 1 ? (
                    <>
                      Complete <Check size={18} />
                    </>
                  ) : (
                    <>
                      Next <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
