"use client";

import { motion } from "framer-motion";
import { Play, Zap, AlertCircle, Sparkles, RefreshCcw } from "lucide-react";
import { useAgentStore } from "@/store/useAgent";

export function ShowcaseDirector() {
  const { addMastery, setActiveAgent, agents } = useAgentStore();

  const scenarios = [
    { 
      id: "victory", 
      name: "Victory Glow", 
      icon: Sparkles, 
      color: "bg-emerald", 
      action: () => addMastery(40) 
    },
    { 
      id: "struggle", 
      name: "Detect Struggle", 
      icon: AlertCircle, 
      color: "bg-red-500", 
      action: () => alert("Demo: Struggle Detected. Hint Escalation active.") 
    },
    { 
      id: "reset", 
      name: "Reset Mastery", 
      icon: RefreshCcw, 
      color: "bg-navy", 
      action: () => addMastery(-100) 
    },
    { 
      id: "switch", 
      name: "Switch Agent", 
      icon: Zap, 
      color: "bg-amber-500", 
      action: () => setActiveAgent(agents[1] || null) 
    },
  ];

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-4 bg-white border border-navy/10 rounded-2xl shadow-2xl flex gap-3 items-center"
      >
        <div className="pr-3 border-r border-navy/5">
          <p className="text-[10px] font-bold text-navy/30 uppercase tracking-widest">Showcase Director</p>
        </div>
        <div className="flex gap-2">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={s.action}
              className={`p-2 ${s.color} text-white rounded-lg hover:scale-110 transition-transform shadow-lg shadow-black/5`}
              title={s.name}
            >
              <s.icon size={18} />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
