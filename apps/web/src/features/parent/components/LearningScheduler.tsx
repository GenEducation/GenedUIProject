"use client";

import { motion } from "framer-motion";
import { Lock, Unlock, Calendar, Clock } from "lucide-react";
import { useAgentStore } from "@/store/useAgent";
import { useEffect, useState } from "react";

interface Session {
  id: string;
  title: string;
  status: "locked" | "unlocked" | "completed";
  time: string;
  requirement?: string;
}

export function LearningScheduler() {
  const { student } = useAgentStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

  useEffect(() => {
    if (!student) return;
    fetch(`${API_BASE_URL}/students/${student.id}/roadmap`)
      .then(res => res.json())
      .then(setSessions)
      .catch(err => console.error("Roadmap fetch failed", err));
  }, [student]);

  const handleUnlock = (id: string) => {
    setSessions(prev => prev.map(s => 
      s.id === id ? { ...s, status: "unlocked" as const } : s
    ));
  };

  return (
    <div className="p-8 bg-academic-grey border border-navy/5 rounded-3xl shadow-sm space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-navy">Learning Roadmap</h3>
        <Calendar className="text-navy/20" size={24} />
      </div>

      <div className="space-y-4">
        {sessions.map((session, index) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-2xl border transition-all flex items-center justify-between
              ${session.status === "completed" ? "bg-emerald/5 border-emerald/20" : 
                session.status === "unlocked" ? "bg-white border-navy/10 shadow-sm" : 
                "bg-navy/5 border-transparent opacity-60"}
            `}
          >
            <div className="flex gap-4 items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center
                ${session.status === "completed" ? "bg-emerald text-white" : 
                  session.status === "unlocked" ? "bg-navy text-white" : 
                  "bg-navy/10 text-navy/40"}
              `}>
                {session.status === "completed" ? <Unlock size={18} /> : 
                 session.status === "unlocked" ? <Clock size={18} /> : 
                 <Lock size={18} />}
              </div>
              <div>
                <h4 className="font-bold text-navy text-sm">{session.title}</h4>
                <p className="text-[10px] text-navy/40 font-sans">{session.time}</p>
              </div>
            </div>

            {session.status === "locked" ? (
              <div className="text-right space-y-1">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">{session.requirement}</p>
                <button 
                  onClick={() => handleUnlock(session.id)}
                  className="px-4 py-1.5 bg-navy text-white text-[10px] font-bold rounded-lg hover:bg-navy/90 transition-colors"
                >
                  Force Unlock
                </button>
              </div>
            ) : session.status === "unlocked" ? (
              <span className="text-[10px] font-bold text-emerald uppercase tracking-widest">Ready to Begin</span>
            ) : (
              <span className="text-[10px] font-bold text-navy/20 uppercase tracking-widest">Verified</span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
