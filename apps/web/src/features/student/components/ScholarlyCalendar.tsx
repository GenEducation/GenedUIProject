"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useAgentStore } from "@/store/useAgent";
import { Calendar as CalendarIcon, Clock, ChevronRight } from "lucide-react";

interface Session {
  id: string;
  title: string;
  time: string;
  agent: string;
  status: "upcoming" | "completed";
}

export function ScholarlyCalendar() {
  const { student } = useAgentStore();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!student) return;
    fetch(`http://localhost:8001/students/${student.id}/schedule`)
      .then(res => res.json())
      .then(setSessions);
  }, [student]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-navy flex items-center gap-2">
          <CalendarIcon size={20} className="text-emerald" />
          Scholarly Planner
        </h3>
        <button className="text-xs font-bold text-emerald hover:underline">View Full Calendar</button>
      </div>

      <div className="space-y-4">
        {(sessions || []).map((session, i) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group p-4 bg-white border border-navy/5 rounded-2xl hover:border-emerald/30 hover:shadow-xl hover:shadow-emerald/5 transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-academic-grey rounded-xl flex flex-col items-center justify-center leading-none">
                <span className="text-[10px] font-bold text-navy/30 uppercase">Mar</span>
                <span className="text-lg font-bold text-navy">{new Date(session.time).getDate()}</span>
              </div>
              <div>
                <h4 className="font-bold text-navy text-sm leading-tight">{session.title}</h4>
                <p className="text-xs text-navy/40 flex items-center gap-2 mt-1">
                  <Clock size={12} /> {new Date(session.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {session.agent}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-navy/20 group-hover:text-emerald transition-colors" />
          </motion.div>
        ))}
      </div>

      <div className="p-6 bg-navy text-white rounded-2xl space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Goal Status</p>
        <p className="text-sm leading-relaxed">
          You are <span className="text-emerald font-bold font-sans italic">8 mins</span> away from your weekly scholarly milestone.
        </p>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-emerald w-[85%]" />
        </div>
      </div>
    </div>
  );
}
