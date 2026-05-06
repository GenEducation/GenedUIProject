"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Check } from "lucide-react";

export interface TutorialStep {
  target: string; // CSS selector
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface SiteTutorialProps {
  steps: TutorialStep[];
  onComplete: () => void;
  onClose: () => void;
}

export const SiteTutorial: React.FC<SiteTutorialProps> = ({
  steps,
  onComplete,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const updateTargetRect = useCallback(() => {
    const element = document.querySelector(steps[currentStep].target);
    if (element) {
      setTargetRect(element.getBoundingClientRect());
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setTargetRect(null);
    }
  }, [currentStep, steps]);

  useEffect(() => {
    updateTargetRect();
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect);
    return () => {
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect);
    };
  }, [updateTargetRect]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];

  if (!targetRect) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#042e5c]/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pointer-events-auto flex flex-col gap-4 rounded-2xl border border-white/20 bg-white p-8 shadow-2xl backdrop-blur-xl w-full max-w-sm text-center"
        >
          <h4 className="font-bold text-[#042e5c]">{currentStepData.title}</h4>
          <p className="text-sm text-[#042e5c]/70 leading-relaxed">
            This feature is located in another section. Please navigate there to see it highlighted.
          </p>
          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="px-6 py-2 rounded-xl border border-[#042e5c]/10 text-sm font-bold disabled:opacity-30"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 rounded-xl bg-[#059F6D] text-white text-sm font-bold shadow-lg shadow-[#059F6D]/20"
            >
              Skip Step
            </button>
          </div>
          <button
            onClick={onClose}
            className="mt-2 text-xs text-[#042e5c]/40 hover:text-[#042e5c] font-medium"
          >
            End Tutorial
          </button>
        </motion.div>
      </div>
    );
  }

  const padding = 8;
  const spotlightStyle: React.CSSProperties = {
    position: "fixed",
    top: targetRect.top - padding,
    left: targetRect.left - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
    borderRadius: "12px",
    boxShadow: "0 0 0 9999px rgba(4, 46, 92, 0.6)",
    zIndex: 9999,
    pointerEvents: "none",
    transition: "all 0.3s ease-in-out",
  };


  const cardWidth = 288;
  const margin = 24;
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  
  // Calculate center of the target
  const targetCenter = targetRect.left + targetRect.width / 2;
  
  // Calculate initial left position (centered on target)
  let leftPos = targetCenter - cardWidth / 2;

  // Bias towards center of screen if near edges
  const screenCenter = screenWidth / 2;
  const bias = 0.2; // 20% pull towards center
  leftPos = (leftPos * (1 - bias)) + (screenCenter - cardWidth / 2) * bias;

  // Clamp to viewport
  leftPos = Math.max(margin, Math.min(leftPos, screenWidth - cardWidth - margin));

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      {/* Spotlight Mask */}
      <div style={spotlightStyle} />

      {/* Info Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="pointer-events-auto absolute flex flex-col gap-4 rounded-3xl border border-white bg-white p-7 shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-80 z-[10001]"
          style={{
            top: currentStepData.position === "bottom" ? targetRect.bottom + 24 : "auto",
            bottom: currentStepData.position === "top" ? window.innerHeight - targetRect.top + 24 : "auto",
            left: leftPos,
            transform: "translateX(0)",
          }}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#059F6D] tracking-widest uppercase">Step {currentStep + 1} of {steps.length}</span>
              <h4 className="font-bold text-lg text-[#042e5c] leading-tight">{currentStepData.title}</h4>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 text-[#042e5c]/30 hover:text-[#042e5c] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          <p className="text-sm text-[#042e5c]/60 leading-relaxed">
            {currentStepData.description}
          </p>

          <div className="flex items-center justify-between mt-4">
            <button 
              onClick={onClose}
              className="text-xs font-bold text-[#042e5c]/40 hover:text-[#042e5c] transition-colors"
            >
              Skip Tutorial
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className={`p-2 rounded-xl border border-[#042e5c]/10 text-[#042e5c] hover:bg-gray-50 transition-colors ${
                  currentStep === 0 ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 bg-[#059F6D] text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-[#059F6D]/20 hover:shadow-xl transition-all"
              >
                {currentStep === steps.length - 1 ? (
                  <>Finish <Check size={16} /></>
                ) : (
                  <>Next <ChevronRight size={16} /></>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
