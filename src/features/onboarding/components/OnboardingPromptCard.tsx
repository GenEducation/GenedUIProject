"use client";

import { useState } from "react";
import { X, Sparkles } from "lucide-react";

interface OnboardingPromptCardProps {
  onStart: () => void;
  userId: string;
}

export function OnboardingPromptCard({ onStart, userId }: OnboardingPromptCardProps) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(`gened_onboarding_prompt_dismissed_${userId}`) === "true"
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(`gened_onboarding_prompt_dismissed_${userId}`, "true");
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-6 right-6 z-30 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="relative bg-white rounded-2xl shadow-xl border border-[#059F6D]/15 p-5">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={14} />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#059F6D]/10 flex items-center justify-center flex-shrink-0">
            <Sparkles size={20} className="text-[#059F6D]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#042e5c] mb-1">
              Personalize your learning
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              Complete a quick learning profile so we can tailor lessons to your style.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onStart}
                className="px-4 py-2 rounded-lg bg-[#059F6D] text-xs font-bold text-white hover:bg-[#048a5e] transition-colors"
              >
                Start
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
