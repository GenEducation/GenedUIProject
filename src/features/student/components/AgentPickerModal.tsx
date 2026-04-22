"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStudentStore, AgentItem } from "../store/useStudentStore";

export function AgentPickerModal() {
  const router = useRouter();
  const { setAgentPickerOpen, openNewChat, availableAgents } = useStudentStore();
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? (Array.isArray(availableAgents) ? availableAgents.filter(
        (a) =>
          a.name.toLowerCase().includes(query.toLowerCase()) ||
          a.subject.toLowerCase().includes(query.toLowerCase()) ||
          `grade ${a.grade}`.toLowerCase().includes(query.toLowerCase())
      ) : [])
    : (Array.isArray(availableAgents) ? availableAgents : []);

  const handleSelect = (agent: AgentItem) => {
    const newId = openNewChat(agent);
    router.push(`/student/chat/${newId}`);
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
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[560px] bg-white rounded-3xl shadow-2xl shadow-black/20 z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-[#1a3a2a]/8">
          <div>
            <h2 className="text-xl font-extrabold text-[#1a3a2a]">Choose a Subject</h2>
            <p className="text-sm text-[#1a3a2a]/50 mt-0.5">Select what you'd like to learn today</p>
          </div>
          <button
            onClick={() => setAgentPickerOpen(false)}
            className="w-9 h-9 rounded-xl bg-[#F4F3EE] flex items-center justify-center text-[#1a3a2a]/50 hover:text-[#1a3a2a] hover:bg-[#1a3a2a]/8 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-7 py-4 border-b border-[#1a3a2a]/8">
          <div className="flex items-center gap-3 bg-[#F4F3EE] rounded-2xl px-4 py-3">
            <Search size={16} className="text-[#1a3a2a]/40 flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subjects or grade..."
              className="flex-1 bg-transparent text-sm text-[#1a3a2a] placeholder:text-[#1a3a2a]/35 focus:outline-none"
            />
          </div>
        </div>

        {/* Subject list */}
        <div className="overflow-y-auto max-h-[360px] p-4 space-y-2">
          {(!Array.isArray(filtered) || filtered.length === 0) ? (
            <div className="py-10 text-center text-sm text-[#1a3a2a]/40 px-8 leading-relaxed">
              {query 
                ? "No agents match your search." 
                : "Add partners from your profile to start chat"}
            </div>
          ) : (
            filtered.map((agent, i) => (
              <motion.button
                key={agent.agent_id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.035 }}
                onClick={() => handleSelect(agent)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-left hover:bg-[#F4F3EE] hover:shadow-sm transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-[#F4F3EE] group-hover:bg-white flex items-center justify-center text-xl flex-shrink-0 transition-colors">
                  🤖
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#1a3a2a] text-sm">{agent.name}</p>
                  <p className="text-xs text-[#1a3a2a]/45 mt-0.5">{agent.subject} &bull; Grade {agent.grade}</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-[#1a3a2a]/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[#1a3a2a] text-xs font-bold">→</span>
                </div>
              </motion.button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-[#1a3a2a]/8 bg-[#F4F3EE]/50">
          <p className="text-xs text-[#1a3a2a]/40 text-center">
            {filtered.length} agent{filtered.length !== 1 ? "s" : ""} available
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
