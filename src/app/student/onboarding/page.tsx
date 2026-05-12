"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useOnboardingStore } from "@/features/onboarding/store/useOnboardingStore";
import { OnboardingChatView } from "@/features/onboarding/components/OnboardingChatView";
import { WavingStudentCharacter } from "@/components/shared/loaders/StudentLoader/WavingStudentCharacter";
import { BookOpen, MessageSquare, Clock, ShieldCheck } from "lucide-react";

const SUBJECT_ICONS: Record<string, string> = {
  Mathematics: "📐",
  English: "📖",
  Science: "🔬",
  History: "🏛️",
  Physics: "⚛️",
  Chemistry: "⚗️",
  Biology: "🧬",
  Geography: "🌍",
};

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { studentProfile } = useStudentStore();
  const {
    startOnboarding,
    isComplete,
    type,
    subject: storeSubject,
    clearSession,
  } = useOnboardingStore();

  const queryType = searchParams?.get("type") === "subject" ? "subject" : "general";
  const querySubject = searchParams?.get("subject") || undefined;
  const queryGrade = Number(searchParams?.get("grade")) || undefined;

  useEffect(() => {
    if (!studentProfile) return;
    if (!type || (queryType === "subject" && querySubject !== storeSubject)) {
      startOnboarding(studentProfile.user_id, queryType, querySubject, queryGrade);
    }
  }, [studentProfile, startOnboarding, type, queryType, querySubject, queryGrade, storeSubject]);

  useEffect(() => {
    if (isComplete) {
      if (studentProfile?.user_id) {
        useOnboardingStore.getState().checkDNAStatus(studentProfile.user_id);
      }
      clearSession();
      router.replace("/student");
    }
  }, [isComplete, queryType, router, clearSession, studentProfile?.user_id]);

  if (!studentProfile) return null;

  const subjectIcon = querySubject ? (SUBJECT_ICONS[querySubject] || "📚") : "📚";
  const subjectLabel = querySubject || "Subject";

  return (
    <div className="h-screen bg-[#F4F3EE] flex overflow-hidden">
      {/* Left Panel — Subject Context (hidden on small screens) */}
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="hidden md:flex w-[340px] shrink-0 flex-col bg-gradient-to-br from-[#042E5C] via-[#053a73] to-[#064282] text-white relative overflow-hidden"
      >
        {/* Background orbs */}
        <div className="absolute top-10 right-10 w-40 h-40 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 left-5 w-32 h-32 rounded-full bg-[#059F6D]/10 blur-3xl pointer-events-none" />

        {/* Top: Subject Badge */}
        <div className="relative z-10 px-8 pt-10 pb-6">
          <div className="inline-flex items-center gap-2.5 bg-white/10 border border-white/10 rounded-2xl px-4 py-3">
            <span className="text-2xl">{subjectIcon}</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Onboarding</p>
              <p className="text-sm font-extrabold text-white leading-tight">{subjectLabel}</p>
            </div>
          </div>
          {queryGrade && (
            <p className="text-[11px] font-bold text-white/30 mt-3 uppercase tracking-wider">
              Grade {queryGrade}
            </p>
          )}
        </div>

        {/* Character */}
        <div className="relative z-10 flex items-center justify-center flex-1 min-h-0 py-4 -mt-10">
          <div className="relative">
            <div className="absolute inset-0 scale-110 rounded-full bg-white/5 blur-2xl" />
            <WavingStudentCharacter />
          </div>
        </div>

        {/* What to expect */}
        <div className="relative z-10 px-8 pb-10 space-y-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            What to expect
          </p>
          <div className="space-y-4">
            {[
              { Icon: MessageSquare, label: "Short conversational questions", desc: "No long forms, just a chat." },
              { Icon: BookOpen, label: "Personalized to your grade", desc: `Tailored for Grade ${queryGrade || "you"}.` },
              { Icon: Clock, label: "Takes about 5–7 minutes", desc: "Quick and easy to complete." },
            ].map(({ Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={14} className="text-white/70" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-white/80 leading-tight">{label}</p>
                  <p className="text-[11px] text-white/40 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#059F6D] shrink-0" />
            <p className="text-[10px] text-white/30 font-medium">
              Your responses are private and secure.
            </p>
          </div>
        </div>
      </motion.aside>

      {/* Right Panel — Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <OnboardingChatView />
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#042E5C] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-white/10 border-t-white/60 rounded-full animate-spin" />
          <p className="text-sm font-bold text-white/30 uppercase tracking-widest animate-pulse">
            Initializing Onboarding...
          </p>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
