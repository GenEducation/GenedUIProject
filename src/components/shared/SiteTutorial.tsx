"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Check, Navigation, Loader2, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { PointingStudentCharacter } from "./loaders/StudentLoader/PointingStudentCharacter";
import { useTutorialStore, TUTORIAL_SEQUENCE } from "@/features/tutorial/store/useTutorialStore";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { TutorialCelebration } from "@/features/tutorial/components/TutorialCelebration";

// -- Main Tutorial Component ---------------------------------------------------
export const SiteTutorial: React.FC = () => {
  const pathname = usePathname();
  const { isPartnerModalOpen } = useStudentStore();
  const { 
    isActive, 
    currentStepIndex, 
    completedActions, 
    hasEnded,
    hasDismissedCelebration,
    nextStep, 
    prevStep, 
    skipTutorial,
    dismissCelebration 
  } = useTutorialStore();
  
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const screenHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const isMobile = screenWidth < 1024;
  const isDesktop = !isMobile;

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showLooking, setShowLooking] = useState(false);

  const currentStepData = TUTORIAL_SEQUENCE[currentStepIndex];
  const isCorrectRoute = currentStepData?.expectedRoute === pathname;
  const requiresAction = currentStepData?.requiresAction;
  const isActionCompleted = requiresAction ? completedActions[requiresAction] : true;

  useEffect(() => {
    let timer: any;
    if (isActive && isCorrectRoute && !targetRect) {
      timer = setTimeout(() => setShowLooking(true), 1000);
    } else {
      setShowLooking(false);
    }
    return () => clearTimeout(timer);
  }, [isActive, isCorrectRoute, targetRect]);

  const updateTargetRect = useCallback(() => {
    if (!isActive || !isCorrectRoute || !currentStepData) return;
    
    const element = document.querySelector(currentStepData.target);
    if (element) {
      setTargetRect(element.getBoundingClientRect());
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setTargetRect(null);
    }
  }, [isActive, isCorrectRoute, currentStepData]);

  useEffect(() => {
    // Initial update
    updateTargetRect();
    
    // Set up polling to catch elements that render late
    const intervalId = setInterval(updateTargetRect, 500);

    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect);
    };
  }, [updateTargetRect, pathname, currentStepIndex]);

  // Auto-advance if user navigates to expected next route manually
  useEffect(() => {
    if (isActive && currentStepData?.id === "go-to-profile" && pathname === "/student/profile") {
      nextStep();
    }
    if (isActive && currentStepData?.id === "go-to-analytics" && pathname === "/student/analytics") {
      nextStep();
    }
    if (isActive && currentStepData?.id === "go-back-from-profile" && pathname === "/student") {
      nextStep();
    }
    if (isActive && currentStepData?.id === "go-to-chat" && pathname === "/student") {
      nextStep();
    }
  }, [pathname, currentStepData?.id, isActive, nextStep]);

  // Auto-skip mobile-only steps if on desktop
  useEffect(() => {
    if (isActive && currentStepData?.mobileOnly && isDesktop) {
      nextStep();
    }
  }, [isActive, currentStepData?.mobileOnly, isDesktop, nextStep]);

  if (!isActive || !currentStepData || isPartnerModalOpen) {
    // Show celebration only once back on the Chat Hub
    if (hasEnded && pathname === "/student" && !hasDismissedCelebration) {
      return <TutorialCelebration onDismiss={dismissCelebration} />;
    }
    return null;
  }
  if (currentStepData.mobileOnly && isDesktop) return null;

  // Render centered waiting card if not on the correct route
  if (!isCorrectRoute) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#042e5c]/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pointer-events-auto flex flex-col gap-4 rounded-2xl border border-white/20 bg-white p-8 shadow-2xl backdrop-blur-xl w-full max-w-sm text-center"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#042e5c]/5 text-[#042e5c]">
            <Navigation className="h-6 w-6" />
          </div>
          <h4 className="font-bold text-[#042e5c]">{currentStepData.title}</h4>
          <p className="text-sm text-[#042e5c]/70 leading-relaxed">
            {currentStepData.description}
          </p>
          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={skipTutorial}
              className="px-6 py-2 rounded-xl bg-gray-100 text-[#042e5c] text-sm font-bold shadow-sm"
            >
              Skip Tutorial
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Fallback if target element not found on the correct page
  if (!targetRect && showLooking) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
         <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto bg-[#042e5c] text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-4"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-white/50" />
              <span className="text-sm font-medium">Looking for {currentStepData.title}...</span>
            </div>
            <span className="text-[10px] opacity-40 font-mono">Selector: {currentStepData.target}</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!targetRect) return null;

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

  const isMobileSize = screenWidth < 768;
  const cardWidth = isMobileSize ? 260 : 320;
  const margin = isMobileSize ? 12 : 24;
  
  let top: string | number = "auto";
  let bottom: string | number = "auto";
  let left: string | number = "auto";
  
  if (currentStepData.position === "top") {
    bottom = screenHeight - targetRect.top + 16;
    left = Math.max(margin, Math.min(targetRect.left + targetRect.width / 2 - cardWidth / 2, screenWidth - cardWidth - margin));
  } else if (currentStepData.position === "bottom") {
    top = targetRect.bottom + 16;
    left = Math.max(margin, Math.min(targetRect.left + targetRect.width / 2 - cardWidth / 2, screenWidth - cardWidth - margin));
  } else if (currentStepData.position === "left") {
    top = Math.max(margin, Math.min(targetRect.top + targetRect.height / 2 - 100, screenHeight - 250)); // Approximate height
    left = Math.max(margin, targetRect.left - cardWidth - 24);
  } else if (currentStepData.position === "right") {
    top = Math.max(margin, Math.min(targetRect.top + targetRect.height / 2 - 100, screenHeight - 250));
    left = Math.min(screenWidth - cardWidth - margin, targetRect.right + 24);
  }

  // Final safety check for mobile: always pin to bottom if it's likely to overlap content
  if (isMobileSize) {
    left = (screenWidth - cardWidth) / 2;
    top = "auto";
    bottom = margin + 10; // Slightly above the very edge
  }

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      {/* Spotlight Mask */}
      <div style={spotlightStyle} />

      {/* Info Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className={`pointer-events-auto absolute flex flex-col gap-3 rounded-3xl border border-white bg-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[10001] ${
            isMobileSize ? "p-4 w-[260px]" : "p-7 w-80"
          }`}
          style={{
            top,
            bottom,
            left,
          }}
        >
          {/* Pointing Character */}
          <div className={`absolute pointer-events-none transition-all duration-500 z-50 ${
            currentStepData.position === "bottom" ? "bottom-[100%] right-6 translate-y-[10px]" :
            currentStepData.position === "top" ? "top-[100%] right-6 -translate-y-[10px]" :
            currentStepData.position === "left" ? "left-[100%] top-4 -translate-x-[20px]" :
            "right-[100%] top-4 translate-x-[20px]" // right
          }`}>
             <PointingStudentCharacter 
               direction={
                 currentStepData.position === "bottom" ? "up" :
                 currentStepData.position === "top" ? "down" :
                 currentStepData.position === "left" ? "right" : "left"
               } 
               className="scale-75 origin-bottom" 
             />
          </div>

          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#059F6D] tracking-widest uppercase">Step {currentStepIndex + 1} of {TUTORIAL_SEQUENCE.length}</span>
              <h4 className="font-bold text-lg text-[#042e5c] leading-tight">{currentStepData.title}</h4>
            </div>
            <button
              onClick={skipTutorial}
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
              onClick={skipTutorial}
              className="text-xs font-bold text-[#042e5c]/40 hover:text-[#042e5c] transition-colors"
            >
              Skip Tutorial
            </button>

            <div className="flex gap-2">
              <button
                onClick={prevStep}
                disabled={currentStepIndex === 0}
                className={`p-2 rounded-xl border border-[#042e5c]/10 text-[#042e5c] hover:bg-gray-50 transition-colors ${
                  currentStepIndex === 0 ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <ChevronLeft size={18} />
              </button>
              
              {isActionCompleted && (
                <button
                  onClick={nextStep}
                  className="flex items-center gap-2 bg-[#059F6D] text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-[#059F6D]/20 hover:shadow-xl transition-all"
                >
                  {currentStepIndex === TUTORIAL_SEQUENCE.length - 1 ? (
                    <>Finish <Check size={16} /></>
                  ) : (
                    <>Next <ChevronRight size={16} /></>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
