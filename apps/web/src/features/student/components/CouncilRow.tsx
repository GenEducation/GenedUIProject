"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { SubjectCard } from "./SubjectCard";
import { useAgentStore } from "@/store/useAgent";

export function CouncilRow() {
  const { agents, fetchAgents, isLoading } = useAgentStore();

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  if (isLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex items-end justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-3xl text-navy">The Council of Agents</h2>
          <p className="text-navy/50 font-sans">Awaken your scholarly companion to begin the journey.</p>
        </div>
        <span className="text-xs font-bold text-navy/30 uppercase tracking-widest pb-1">
          {agents.length} Agents Available
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {agents.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <SubjectCard agent={agent} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
