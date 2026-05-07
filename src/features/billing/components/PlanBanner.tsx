"use client";

import React, { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { UpgradeButton } from "../UpgradeButton";

export const PlanBanner: React.FC = () => {
  const { studentProfile } = useStudentStore();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Show only for FREE users who haven't dismissed it this session
    const currentPlan = studentProfile?.plan || "FREE";
    if (currentPlan === "FREE" && !isDismissed) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [studentProfile?.plan, isDismissed]);

  if (!isVisible) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-[#042E5C] text-white py-1.5 px-5 rounded-full flex items-center gap-4 shadow-lg shadow-[#042E5C]/15 pointer-events-auto border border-white/5 animate-in fade-in slide-in-from-top duration-500">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase">
          <span className="text-[#03b1ed]">Free plan</span>
          <span className="text-white/20 font-light text-sm">•</span>
          {studentProfile ? (
            <UpgradeButton
              userId={studentProfile.user_id}
              userName={studentProfile.username}
              userEmail={studentProfile.email}
              className="bg-transparent hover:bg-transparent p-0 text-[#00a866] hover:text-[#00c074] underline underline-offset-4 font-bold"
            >
              Upgrade
            </UpgradeButton>
          ) : (
            <span className="text-[#00a866] opacity-50">Upgrade</span>
          )}
        </div>
        
        <button 
          onClick={() => setIsDismissed(true)}
          className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/10 text-white/30 hover:text-white transition-all"
        >
          <X size={12} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};
