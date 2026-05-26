"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingModal } from "@/features/onboarding/components/OnboardingModal";
import {
  useStudentStore,
} from "../store/useStudentStore";
import { StudentChatInput } from "./StudentChatInput";
import { ChevronRight, Clock, Bot, Menu, Flame, BarChart2 } from "lucide-react";
import { RateLimitPrompt } from "@/features/billing/components/RateLimitPrompt";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";
import { useOnboardingStore } from "@/features/onboarding/store/useOnboardingStore";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { SUBJECT_CONFIG, Subject } from "@/constants/subjectConfig";
import { EnglishIcon } from "@/components/icons/EnglishIcon";
import { MathematicsIcon } from "@/components/icons/MathematicsIcon";
import { ScienceIcon } from "@/components/icons/ScienceIcon";
import { HindiIcon } from "@/components/icons/HindiIcon";


type SubjectKey = "english" | "mathematics" | "science" | "hindi";

const SUBJECT_ICON_MAP: Record<SubjectKey, React.ComponentType<{ size: number; style?: React.CSSProperties }>> = {
  english: EnglishIcon,
  mathematics: MathematicsIcon,
  science: ScienceIcon,
  hindi: HindiIcon,
};

function normalizeSubject(subject: string): SubjectKey | null {
  const lower = (subject ?? "").toLowerCase();
  if (lower.includes("english")) return "english";
  if (lower.includes("math")) return "mathematics";
  if (lower.includes("science")) return "science";
  if (lower.includes("hindi")) return "hindi";
  return null;
}

function resolveSubjectLabel(chat: { subject?: string; title?: string }): string {
  if (chat.subject) return chat.subject;
  // Extract from title as fallback
  const hay = (chat.title ?? "").toLowerCase();
  if (hay.includes("english")) return "English";
  if (hay.includes("math")) return "Mathematics";
  if (hay.includes("science")) return "Science";
  if (hay.includes("hindi")) return "Hindi";
  return "Session";
}

interface StudentChatHubProps {
  toggleSidebar: () => void;
}

export function StudentChatHub({ toggleSidebar }: StudentChatHubProps) {
  const router = useRouter();
  const {
    studentProfile,
    recentChats,
    availableAgents,
    fetchSessions,
    fetchAvailableAgents,
    openExistingChat,
    openNewChat,
    openNewSession,
    setAgentPickerOpen,
    isRateLimitHit,
    setRateLimitHit,
    isSessionsLoading,
    isAgentsLoading,
    logoutStudent,
    onboardingStatus,
    fetchOnboardingStatus,
    studentStats,
    fetchStudentStats
  } = useStudentStore();

  const { dnaStatus, checkDNAStatus } = useOnboardingStore();
  const [onboardingModal, setOnboardingModal] = useState<{ subject: string; grade: number } | null>(null);

  useEffect(() => {
    if (studentProfile) {
      fetchSessions();
      fetchAvailableAgents();
      fetchOnboardingStatus();
      fetchStudentStats();
      checkDNAStatus(studentProfile.user_id);
    }
  }, [studentProfile, fetchSessions, fetchAvailableAgents, fetchOnboardingStatus, checkDNAStatus]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 17) return "Afternoon";
    if (hour >= 17 && hour < 21) return "Evening";
    return "Hi";
  };

  const username = studentProfile?.username ?? "Scholar";
  const greeting = getGreeting();

  const onboardingSubjects = onboardingStatus?.subjects
    ? onboardingStatus.subjects
        .filter(s => s.status === "PENDING")
        .map(s => {
          const agent = availableAgents.find(a => a.subject === s.subject);
          return agent || { subject: s.subject, agent_id: s.subject, grade: studentProfile?.grade };
        })
    : [];

  const animateGradientStyle = `
    @keyframes shiftGradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .animate-gradient-text {
      background: linear-gradient(
        to right,
        #042E5C,
        #03b1ed,
        #00a866,
        #430163,
        #042E5C
      );
      background-size: 300% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: shiftGradient 8s ease-in-out infinite;
      display: inline-block;
      padding-bottom: 0.15em;
      margin-bottom: -0.15em;
    }
  `;

  const hasAgents = availableAgents.length > 0;

  const { isActive, nextStep, completeAction, getCurrentStep } = useTutorialStore();

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      <style>{animateGradientStyle}</style>

      {/* Mobile header */}
      <header className="lg:hidden flex items-center px-6 py-4 bg-white flex-shrink-0">
        <button
          onClick={() => {
            toggleSidebar();
            const currentStep = getCurrentStep();
            if (isActive && currentStep?.requiresAction === "open_sidebar") {
              completeAction("open_sidebar");
              nextStep();
            }
          }}
          data-tutorial="hamburger-menu"
          className="w-10 h-10 rounded-xl bg-[#F4F3EE] flex items-center justify-center text-[#042E5C]/60 hover:text-[#042E5C] transition-all"
        >
          <Menu size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6 pb-24 space-y-8 sm:space-y-10">

          {/* 1. Greeting */}
          <div className="relative space-y-6">
            <motion.header
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight animate-gradient-text">
                {greeting}, {username}!
              </h1>
              <p className="text-sm sm:text-base font-bold text-[#042E5C]/50 tracking-tight">
                You&apos;re on a <span className="text-[#00B894] font-extrabold">{studentStats?.currentStreak ?? 0}-day streak</span>. Ready to keep going?
              </p>
            </motion.header>

          </div>

          {/* 2. Stats Row */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="grid grid-cols-3 gap-3 sm:gap-4"
          >
            <StatCard
              icon={<Flame size={18} />}
              label="Current Streak"
              value={`${studentStats?.currentStreak ?? 0} days`}
              accentColor="#FDCB6E"
            />
            <StatCard
              icon={<BarChart2 size={18} />}
              label="Total Sessions"
              value={studentStats?.totalSessions ?? 0}
              accentColor="#74B9FF"
            />
            <StatCard
              icon={<Flame size={18} />}
              label="Longest Streak"
              value={`${studentStats?.longestStreak ?? 0} days`}
              accentColor="#00B894"
            />
          </motion.section>

          {/* 3. Activity Heatmap */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="space-y-3"
          >
            <h2 className="text-sm font-extrabold text-[#042E5C]/40 uppercase tracking-widest px-2">
              Activity
            </h2>
            <div className="bg-white rounded-2xl p-5 border border-[#042E5C]/5 shadow-sm">
              <ActivityHeatmap />
            </div>
          </motion.section>

          {/* 4. Quick Start Agents */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-extrabold text-[#042E5C]/40 uppercase tracking-widest">Quick Start</h2>
              <button
                onClick={() => setAgentPickerOpen(true)}
                className="text-[10px] font-bold text-[#042E5C]/40 hover:text-[#042E5C] uppercase tracking-widest flex items-center gap-1 transition-colors"
              >
                All Subjects <ChevronRight size={12} />
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {isAgentsLoading ? (
                [1, 2, 3].map(n => (
                  <div key={n} className="h-14 w-52 bg-white/50 rounded-2xl animate-pulse border border-[#042E5C]/5" />
                ))
              ) : availableAgents.length > 0 ? (
                availableAgents.slice(0, 3).map((agent, i) => {
                  const subjectKey = normalizeSubject(agent.subject);
                  const isOnboardingComplete = agent.is_onboarding_complete !== false;
                  return (
                    <HubCard
                      key={agent.agent_id}
                      title={agent.subject || agent.name}
                      subtitle={`Grade ${agent.grade}`}
                      icon={<Bot size={18} />}
                      subjectKey={subjectKey}
                      isOnboardingComplete={isOnboardingComplete}
                      onStartChat={() => {
                        openNewSession(agent, "chat");
                        router.push(`/student/chat/new?agentId=${agent.agent_id}`);
                      }}
                      onStartVoice={() => {
                        openNewSession(agent, "voice");
                        router.push(`/student/voice?agent=${agent.agent_id}`);
                      }}
                      onOnboarding={() => {
                        setOnboardingModal({
                          subject: agent.subject,
                          grade: agent.grade ?? studentProfile?.grade ?? 9,
                        });
                      }}
                      delay={0.3 + i * 0.05}
                    />
                  );
                })
              ) : (
                <div className="col-span-full py-10 text-center bg-white/20 rounded-3xl border-2 border-dashed border-[#042E5C]/5 w-full">
                  <div className="max-w-xs mx-auto space-y-3">
                    <Bot size={32} className="mx-auto text-[#042E5C]/20" />
                    <p className="text-sm font-bold text-[#042E5C]/60">No subjects yet</p>
                    <p className="text-xs text-[#042E5C]/40 leading-relaxed px-4">
                      Connect to a school from your <button onClick={() => router.push("/student/profile")} className="underline underline-offset-2 hover:text-[#042E5C]/70 transition-colors">Profile</button> to see your subjects here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.section>

        </div>
      </div>

      {/* Sticky bottom input */}
      {(isAgentsLoading || hasAgents) && (
        <div className="flex-shrink-0 px-4 sm:px-6 pb-6 pt-10" style={{ background: "linear-gradient(to bottom, transparent 0%, #ffffff 40%)" }}>
          <div className="max-w-3xl mx-auto w-full">
            <RateLimitPrompt
              isVisible={isRateLimitHit}
              onClose={() => setRateLimitHit(false)}
            />
            <StudentChatInput chatTitle="New Session" isHub={true} />
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      <AnimatePresence>
        {onboardingModal && (
          <OnboardingModal
            subject={onboardingModal.subject}
            grade={onboardingModal.grade}
            onClose={() => setOnboardingModal(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accentColor: string;
}

function StatCard({ icon, label, value, accentColor }: StatCardProps) {
  return (
    <div
      className="bg-white rounded-2xl px-4 py-3 border border-[#042E5C]/5 shadow-sm hover:shadow-md transition-all border-l-4 flex items-center justify-between gap-3"
      style={{ borderLeftColor: accentColor }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
        >
          {icon}
        </div>
        <p className="text-[10px] font-extrabold text-[#042E5C]/40 uppercase tracking-widest leading-none truncate">{label}</p>
      </div>
      <p className="text-lg sm:text-xl font-extrabold text-[#042E5C] leading-none flex-shrink-0">{value}</p>
    </div>
  );
}

// ── HubCard ───────────────────────────────────────────────────────────────────

interface HubCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  subjectKey: SubjectKey | null;
  onStartChat: () => void;
  onStartVoice: () => void;
  delay: number;
  isOnboardingComplete?: boolean;
  onOnboarding?: () => void;
}

function HubCard({ title, subtitle, icon, subjectKey, onStartChat, onStartVoice, delay, isOnboardingComplete = true, onOnboarding }: HubCardProps) {
  const config = subjectKey ? SUBJECT_CONFIG[subjectKey] : null;
  const IconComponent = subjectKey ? SUBJECT_ICON_MAP[subjectKey] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white px-5 py-4 rounded-2xl border border-[#042E5C]/5 shadow-sm hover:shadow-md hover:border-[#042E5C]/10 transition-all text-left border-l-4 flex flex-col gap-3 flex-1 min-w-[280px] max-w-[340px]"
      style={{ borderLeftColor: config?.color ?? "#042E5C20" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: config ? config.bgColor : "rgba(4,46,92,0.05)" }}
        >
          {IconComponent ? (
            <IconComponent
              size={20}
              style={{ "--icon-color": config?.color ?? "#042E5C" } as React.CSSProperties}
            />
          ) : (
            <span style={{ color: "#042E5C60" }}>{icon}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[#042E5C] text-sm line-clamp-1">{title}</h3>
          <p className="text-[10px] font-bold text-[#042E5C]/40 uppercase tracking-widest leading-none mt-1">
            {isOnboardingComplete ? subtitle : "Complete Onboarding"}
          </p>
        </div>
      </div>

      {isOnboardingComplete ? (
        <div className="flex gap-2 w-full">
          <button
            onClick={onStartChat}
            className="flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-[#00B894]/10 text-[#00B894] hover:bg-[#00B894]/20 border border-[#00B894]/20 cursor-pointer"
          >
            Chat
          </button>
          <button
            onClick={onStartVoice}
            className="flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-[#00B894] text-white hover:bg-[#00B894]/90 cursor-pointer"
          >
            Voice
          </button>
        </div>
      ) : (
        <button
          onClick={onOnboarding}
          className="px-4 py-2 rounded-lg font-semibold text-sm transition-all w-full bg-[#00B894]/15 text-[#00B894] hover:bg-[#00B894]/25 cursor-pointer"
        >
          Start Onboarding
        </button>
      )}
    </motion.div>
  );
}
