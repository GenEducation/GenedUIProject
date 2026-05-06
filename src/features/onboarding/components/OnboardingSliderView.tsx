"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { onboardingService } from "../services/onboardingService";

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
        className="w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-white/20 bg-white/80 p-8 shadow-[0_32px_80px_rgba(4,46,92,0.12)] backdrop-blur-xl sm:p-12"
      >
        <AnimatePresence mode="wait">
          {!isStarted ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center space-y-8"
            >
              <div className="w-48 h-48 sm:w-64 sm:h-64">
                <svg width="100%" height="100%" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff"/>
                      <stop offset="100%" stopColor="#dfefff"/>
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>

                  {/* antennas */}
                  <ellipse cx="185" cy="90" rx="18" ry="42" fill="white" stroke="#111" strokeWidth="6" transform="rotate(-15 185 90)"/>
                  <ellipse cx="327" cy="90" rx="18" ry="42" fill="white" stroke="#111" strokeWidth="6" transform="rotate(15 327 90)"/>

                  {/* side ears */}
                  <ellipse cx="115" cy="220" rx="45" ry="60" fill="#d9f3ff" stroke="#111" strokeWidth="8"/>
                  <ellipse cx="397" cy="220" rx="45" ry="60" fill="#d9f3ff" stroke="#111" strokeWidth="8"/>

                  {/* head */}
                  <rect x="110" y="120" width="292" height="220" rx="90" fill="url(#bg)" stroke="#111" strokeWidth="10"/>

                  {/* face screen */}
                  <rect x="150" y="170" width="212" height="120" rx="40" fill="#0a0a0f"/>

                  {/* eyes */}
                  <rect x="195" y="205" width="28" height="48" rx="10" fill="#67e8ff" filter="url(#glow)"/>
                  <rect x="289" y="205" width="28" height="48" rx="10" fill="#67e8ff" filter="url(#glow)"/>

                  {/* smile */}
                  <path d="M230 255 Q256 275 282 255" stroke="#67e8ff" strokeWidth="8" fill="none" strokeLinecap="round" filter="url(#glow)"/>

                  {/* waving hand */}
                  <ellipse cx="430" cy="300" rx="35" ry="55" fill="#111" transform="rotate(-35 430 300)"/>

                  {/* motion lines */}
                  <path d="M470 255 Q485 245 492 258" stroke="#3bdcff" strokeWidth="6" fill="none" strokeLinecap="round"/>
                  <path d="M475 280 Q495 275 498 292" stroke="#3bdcff" strokeWidth="6" fill="none" strokeLinecap="round"/>

                  {/* subtle shadow */}
                  <ellipse cx="256" cy="395" rx="120" ry="20" fill="#dbeafe" opacity="0.5"/>
                </svg>
              </div>

              <div className="space-y-4">
                <h2 className="font-serif text-3xl font-extrabold text-[#042e5c] sm:text-4xl">
                  Hello, I'm GenEd!
                </h2>
                <p className="max-w-md text-lg text-[#042e5c]/70 leading-relaxed">
                  I would like to ask a few questions before we start our journey to help me customize this experience for you.
                </p>
              </div>

              <button
                onClick={() => setIsStarted(true)}
                className="mt-4 rounded-2xl bg-[#059F6D] px-10 py-4 text-lg font-bold text-white shadow-xl shadow-[#059F6D]/20 transition-all hover:shadow-2xl hover:shadow-[#059F6D]/30 active:scale-[0.98]"
              >
                Start Onboarding
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="questions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
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
                    <h2 className="font-serif text-3xl font-extrabold text-[#042e5c] sm:text-4xl">
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
                    placeholder={currentQuestion.placeholder}
                    className="min-h-[200px] w-full rounded-2xl border border-[#042e5c]/10 bg-white/50 p-6 text-lg text-[#042e5c] transition-all focus:border-[#059F6D] focus:outline-none focus:ring-4 focus:ring-[#059F6D]/5"
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
