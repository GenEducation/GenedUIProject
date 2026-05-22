"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Search, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStudentStore, AgentItem } from "../store/useStudentStore";
import { SUBJECT_CONFIG } from "@/constants/subjectConfig";
import { EnglishIcon } from "@/components/icons/EnglishIcon";
import { MathematicsIcon } from "@/components/icons/MathematicsIcon";
import { ScienceIcon } from "@/components/icons/ScienceIcon";
import { HindiIcon } from "@/components/icons/HindiIcon";
import React from "react";

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

export function AgentPickerModal() {
  const router = useRouter();
  const { setAgentPickerOpen, openNewChat, availableAgents } = useStudentStore();
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? (Array.isArray(availableAgents) ? availableAgents.filter(
        (a) =>
          a.subject.toLowerCase().includes(query.toLowerCase()) ||
          `grade ${a.grade}`.toLowerCase().includes(query.toLowerCase())
      ) : [])
    : (Array.isArray(availableAgents) ? availableAgents : []);

  const handleSelect = (agent: AgentItem) => {
    openNewChat(agent);
    router.push(`/student/chat?agent=${agent.agent_id}`);
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setAgentPickerOpen(false)}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
      />

      {/* Panel */}
      <motion.div
        key="panel"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[520px] bg-white rounded-3xl shadow-2xl shadow-black/20 z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-[#042E5C]/8">
          <div>
            <h2 className="text-xl font-extrabold text-[#042E5C]">All Subjects</h2>
            <p className="text-sm text-[#042E5C]/50 mt-0.5">Select what you'd like to learn today</p>
          </div>
          <button
            onClick={() => setAgentPickerOpen(false)}
            className="w-9 h-9 rounded-xl bg-[#F4F3EE] flex items-center justify-center text-[#042E5C]/50 hover:text-[#042E5C] hover:bg-[#042E5C]/8 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-7 py-4 border-b border-[#042E5C]/8">
          <div className="flex items-center gap-3 bg-[#F4F3EE] rounded-2xl px-4 py-3">
            <Search size={16} className="text-[#042E5C]/40 flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by subject or grade..."
              className="flex-1 bg-transparent text-sm text-[#042E5C] placeholder:text-[#042E5C]/35 focus:outline-none"
            />
          </div>
        </div>

        {/* Subject list */}
        <div className="overflow-y-auto max-h-[360px] p-4 space-y-1.5">
          {(!Array.isArray(filtered) || filtered.length === 0) ? (
            <div className="py-10 text-center text-sm text-[#042E5C]/40 px-8 leading-relaxed">
              {query ? "No subjects match your search." : "No subjects available yet."}
            </div>
          ) : (
            filtered.map((agent, i) => {
              const subjectKey = normalizeSubject(agent.subject);
              const config = subjectKey ? SUBJECT_CONFIG[subjectKey] : null;
              const IconComp = subjectKey ? SUBJECT_ICON_MAP[subjectKey] : null;

              return (
                <motion.button
                  key={agent.agent_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.035 }}
                  onClick={() => handleSelect(agent)}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-left hover:bg-[#F4F3EE] transition-all group border-l-4"
                  style={{ borderLeftColor: config?.color ?? "transparent" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ backgroundColor: config?.bgColor ?? "rgba(4,46,92,0.05)" }}
                  >
                    {IconComp ? (
                      <IconComp
                        size={20}
                        style={{ "--icon-color": config?.color ?? "#042E5C" } as React.CSSProperties}
                      />
                    ) : (
                      <span className="text-[#042E5C]/40 text-sm font-bold">?</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#042E5C] text-sm">{agent.subject}</p>
                    <p className="text-xs text-[#042E5C]/45 mt-1">Grade {agent.grade}</p>
                  </div>
                  <ChevronRight size={16} className="text-[#042E5C]/20 group-hover:text-[#042E5C]/50 transition-colors flex-shrink-0" />
                </motion.button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-[#042E5C]/8 bg-[#F4F3EE]/50">
          <p className="text-xs text-[#042E5C]/40 text-center">
            {filtered.length} subject{filtered.length !== 1 ? "s" : ""} available
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
