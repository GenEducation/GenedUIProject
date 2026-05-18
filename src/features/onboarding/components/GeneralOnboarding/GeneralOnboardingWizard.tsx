"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { WavingStudentCharacter } from "@/components/shared/loaders/StudentLoader/WavingStudentCharacter";
import { onboardingService } from "../../services/onboardingService";
import { QUESTIONS } from "./constants";
import { StepWelcome } from "./steps/StepWelcome";
import { StepQuestion } from "./steps/StepQuestion";
import { StepDone } from "./steps/StepDone";

interface GeneralOnboardingWizardProps {
  studentProfile: {
    user_id: string;
    username: string;
    age?: number;
    grade?: number;
  };
  onComplete: () => void;
}

const TOTAL_STEPS = 6;

export function GeneralOnboardingWizard({
  studentProfile,
  onComplete,
}: GeneralOnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    learning_preferences: "",
    interests: "",
    strengths: "",
    weaknesses: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [visible, setVisible] = useState(false);
  const prevStep = useRef(step);

  useEffect(() => {
    prevStep.current = step;
    setVisible(false);
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setVisible(true))
    );
    return () => cancelAnimationFrame(raf);
  }, [step]);

  useEffect(() => {
    setVisible(true);
  }, []);

  const next = useCallback(
    () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)),
    []
  );
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onboardingService.completeGeneralOnboarding({
        student_id: studentProfile.user_id,
        name: studentProfile.username,
        age: Number(studentProfile.age) || 0,
        grade: Number(studentProfile.grade) || 0,
        learning_preferences: [answers.learning_preferences],
        interests: [answers.interests],
        strengths: [answers.strengths],
        weaknesses: [answers.weaknesses],
      });
      localStorage.setItem("start_tutorial_after_onboarding", "true");
      onComplete();
    } catch {
      setError("Failed to save your preferences. Please try again.");
      setIsSubmitting(false);
    }
  };

  const updateAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const transitionStyle: React.CSSProperties = {
    transition:
      "opacity 0.3s ease, transform 0.35s cubic-bezier(.22,1,.36,1)",
    opacity: visible ? 1 : 0,
    transform: visible ? "scale(1)" : "scale(0.97)",
  };

  const questionIndex = step - 1;
  const question = QUESTIONS[questionIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{
        background: "rgba(244,248,255,0.35)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        padding: "32px 20px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(29,184,123,0.05) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="flex items-end gap-6 relative z-[1] w-full max-w-[720px]">
        {/* Character — hidden on small screens */}
        <div className="hidden md:flex flex-col items-center justify-end shrink-0 pb-10">
          <WavingStudentCharacter />
        </div>

        {/* Card column */}
        <div className="flex-1 min-w-0">
        {/* Progress bar */}
        <div
          className="h-[3px] rounded-sm mb-7 overflow-hidden"
          style={{ background: "rgba(11,36,71,0.10)" }}
        >
          <div
            className="h-full rounded-sm"
            style={{
              background: "linear-gradient(90deg, #1DB87B, #34D399)",
              width: `${(step / (TOTAL_STEPS - 1)) * 100}%`,
              transition:
                "width 0.55s cubic-bezier(.22,1,.36,1)",
            }}
          />
        </div>

        {/* Card */}
        <div style={transitionStyle}>
          <div
            className="relative overflow-hidden"
            style={{
              background: "#fff",
              borderRadius: "28px",
              padding: "36px 40px 40px",
              boxShadow:
                "0 1px 0 rgba(11,36,71,0.04), 0 24px 60px -24px rgba(11,36,71,0.16)",
            }}
          >
            {/* Top accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{
                background:
                  "linear-gradient(90deg, #0B2447, #1DB87B, #34D399)",
              }}
            />

            {step === 0 && (
              <StepWelcome
                name={studentProfile.username}
                onNext={next}
              />
            )}

            {step >= 1 && step <= 4 && question && (
              <StepQuestion
                key={question.id}
                sageMessage={question.sageMessage}
                placeholder={question.placeholder}
                value={answers[question.id as keyof typeof answers]}
                onChange={(val) => updateAnswer(question.id, val)}
                onNext={next}
                onBack={back}
                showBack={step > 1}
              />
            )}

            {step === 5 && (
              <StepDone
                name={studentProfile.username}
                age={studentProfile.age}
                isSubmitting={isSubmitting}
                onFinish={handleSubmit}
              />
            )}

            {error && (
              <p className="mt-4 text-sm font-medium text-rose-500 text-center">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Step counter */}
        {step < 5 && (
          <div
            className="text-center mt-4.5"
            style={{
              fontSize: "12px",
              color: "rgba(11,36,71,0.38)",
              fontWeight: 500,
              letterSpacing: "0.05em",
            }}
          >
            {step + 1} of {TOTAL_STEPS}
          </div>
        )}
        </div>{/* end card column */}
      </div>{/* end flex row */}
    </div>
  );
}
