"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  useStudentStore, 
} from "../store/useStudentStore";
import { StudentChatInput } from "./StudentChatInput";
import { AlertCircle, ChevronRight, Clock, Bot, Menu, LogOut } from "lucide-react";
import { RateLimitPrompt } from "@/features/billing/components/RateLimitPrompt";
import { OnboardingModal } from "@/features/onboarding/components/OnboardingModal";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";
import { useOnboardingStore } from "@/features/onboarding/store/useOnboardingStore";

interface StudentChatHubProps {
  toggleSidebar: () => void;
}

export function StudentChatHub({ toggleSidebar }: StudentChatHubProps) {
  const router = useRouter();
  const [activeOnboarding, setActiveOnboarding] = useState<{ subject: string; grade: number } | null>(null);
  const { 
    studentProfile, 
    recentChats, 
    availableAgents,
    fetchSessions,
    fetchAvailableAgents,
    openExistingChat,
    openNewChat,
    setAgentPickerOpen,
    isRateLimitHit,
    setRateLimitHit,
    isSessionsLoading,
    isAgentsLoading,
    logoutStudent,
    onboardingStatus,
    fetchOnboardingStatus
  } = useStudentStore();

  const { dnaStatus, checkDNAStatus } = useOnboardingStore();

  useEffect(() => {
    if (studentProfile) {
      fetchSessions();
      fetchAvailableAgents();
      fetchOnboardingStatus();
      checkDNAStatus(studentProfile.user_id);
    }
  }, [studentProfile, fetchSessions, fetchAvailableAgents, fetchOnboardingStatus, checkDNAStatus]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    if (hour >= 17 && hour < 21) return "Good Evening";
    return "Hi";
  };

  const username = studentProfile?.username ?? "Scholar";
  const greeting = getGreeting();

  // Filter for onboarding subjects that are actually PENDING from the API
  const onboardingSubjects = onboardingStatus?.subjects
    ? onboardingStatus.subjects
        .filter(s => s.status === "PENDING")
        .map(s => {
          // Find the corresponding agent in availableAgents to get icons/details if needed
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
    <div className="flex-1 flex flex-col h-full bg-[#F4F3EE]/30 overflow-hidden">
      <style>{animateGradientStyle}</style>
      
      {/* Mobile-friendly Header */}
      <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-[#042E5C]/8 flex-shrink-0">
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
        <img src="/Logo.svg" alt="GenEd Logo" className="h-6 w-auto" />
        <div className="w-10" /> {/* Spacer for balance */}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10 sm:space-y-12">
        
        {/* 1. Greeting & Onboarding Alert */}
        <div className="relative space-y-6">
          <motion.header
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight animate-gradient-text">
              {greeting}, {username}!
            </h1>
            <p className="text-base sm:text-xl md:text-2xl font-bold text-[#042E5C]/60 tracking-tight">
              Where should we start?
            </p>
          </motion.header>

          {onboardingSubjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900">Pending Assessments</p>
                  <p className="text-xs text-amber-700/70">Complete your onboarding for {onboardingSubjects.map(s => s.subject).join(" & ")}.</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                {onboardingSubjects.map(agent => (
                  <button
                    key={agent.agent_id}
                    onClick={() => setActiveOnboarding({ subject: agent.subject, grade: Number(agent.grade) || studentProfile?.grade || 1 })}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors"
                  >
                    Start {agent.subject}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* 2. Recent Chats */}
        {(isAgentsLoading || hasAgents) && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-extrabold text-[#042E5C]/40 uppercase tracking-widest">Recent Sessions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {isSessionsLoading ? (
                [1, 2, 3].map(n => (
                  <div key={n} className="h-32 bg-white/50 rounded-2xl animate-pulse border border-[#042E5C]/5" />
                ))
              ) : recentChats.length > 0 ? (
                recentChats.slice(0, 3).map((chat, i) => (
                  <HubCard 
                    key={chat.id}
                    title={chat.title || "Untitled Session"}
                    subtitle={`Last active ${chat.lastActive || "Recently"}`}
                    icon={<Clock size={18} />}
                    onClick={() => {
                      openExistingChat(chat);
                      router.push(`/student/chat/${chat.id}`);
                    }}
                    delay={0.2 + i * 0.05}
                  />
                ))
              ) : (
                <div className="col-span-full py-8 text-center bg-white/40 rounded-2xl border border-dashed border-[#042E5C]/10">
                  <p className="text-xs font-bold text-[#042E5C]/30 uppercase tracking-widest">No recent sessions</p>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* 3. Quick Start Agents */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-extrabold text-[#042E5C]/40 uppercase tracking-widest">Quick Start</h2>
            <button 
              onClick={() => setAgentPickerOpen(true)}
              className="text-[10px] font-bold text-[#042E5C]/40 hover:text-[#042E5C] uppercase tracking-widest flex items-center gap-1 transition-colors"
            >
              See all agents <ChevronRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isAgentsLoading ? (
              [1, 2, 3].map(n => (
                <div key={n} className="h-24 bg-white/50 rounded-2xl animate-pulse border border-[#042E5C]/5" />
              ))
            ) : availableAgents.length > 0 ? (
              availableAgents.slice(0, 3).map((agent, i) => (
                <HubCard 
                  key={agent.agent_id}
                  title={agent.name}
                  subtitle={`${agent.subject} • Grade ${agent.grade}`}
                  icon={<Bot size={18} />}
                  onClick={() => {
                    openNewChat(agent);
                    router.push('/student/chat/new');
                  }}
                  delay={0.3 + i * 0.05}
                />
              ))
            ) : (
              <div className="col-span-full py-12 text-center bg-white/20 rounded-3xl border-2 border-dashed border-[#042E5C]/5">
                <div className="max-w-xs mx-auto space-y-3">
                  <Bot size={32} className="mx-auto text-[#042E5C]/20" />
                  <p className="text-sm font-bold text-[#042E5C]/40 uppercase tracking-widest">No agents assigned yet</p>
                  <p className="text-xs text-[#042E5C]/30 leading-relaxed px-4">Complete your initial assessments to unlock your personalized learning agents.</p>
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* 4. Primary Input (Unified with Chat) */}
        {(isAgentsLoading || hasAgents) && (
          <motion.section
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="relative z-10 max-w-3xl mx-auto w-full"
          >
            <RateLimitPrompt 
              isVisible={isRateLimitHit} 
              onClose={() => setRateLimitHit(false)} 
            />
            <StudentChatInput chatTitle="New Session" isHub={true} />
          </motion.section>
        )}

        </div>
      </div>

      {/* Subject Onboarding Modal */}
      <AnimatePresence>
        {activeOnboarding && (
          <OnboardingModal
            subject={activeOnboarding.subject}
            grade={activeOnboarding.grade}
            onClose={() => setActiveOnboarding(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface HubCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
  delay: number;
}

function HubCard({ title, subtitle, icon, onClick, delay }: HubCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className="bg-white p-5 rounded-2xl border border-[#042E5C]/5 shadow-sm hover:shadow-md hover:border-[#042E5C]/10 transition-all text-left group flex flex-col justify-between h-full min-h-[100px]"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="w-8 h-8 rounded-lg bg-[#042E5C]/5 flex items-center justify-center text-[#042E5C]/60 group-hover:bg-[#03b1ed]/10 group-hover:text-[#03b1ed] transition-colors">
            {icon}
          </div>
          <ChevronRight size={14} className="text-[#042E5C]/20 group-hover:text-[#042E5C]/40 transition-colors" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-[#042E5C] text-sm group-hover:text-[#03b1ed] transition-colors line-clamp-1">{title}</h3>
          <p className="text-[10px] font-bold text-[#042E5C]/40 uppercase tracking-widest leading-none">{subtitle}</p>
        </div>
      </div>
    </motion.button>
  );
}
