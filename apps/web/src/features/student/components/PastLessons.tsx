"use client";

import { motion } from "framer-motion";
import { History, Star, Bookmark, Calendar, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useAgentStore } from "@/store/useAgent";

export function PastLessons() {
  const { chatHistory, fetchHistory } = useAgentStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory("session_1").then(() => setIsLoading(false));
  }, [fetchHistory]);

  if (isLoading) return <div className="h-48 animate-pulse bg-navy/5 rounded-3xl" />;
  if (!chatHistory || chatHistory.length === 0) return null;

  return (
    <div className="space-y-6 mt-12">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-navy">Scholarly History</h3>
          <p className="text-navy/40 text-sm">Reviewing your past conceptual breakthroughs.</p>
        </div>
        <button className="text-xs font-bold text-navy hover:text-emerald flex items-center gap-2 transition-colors">
          View Full Archive <ArrowRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {chatHistory.map((session: any, i) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white border border-navy/5 rounded-3xl hover:border-emerald/30 hover:shadow-xl hover:shadow-emerald/5 transition-all group relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-academic-grey rounded-2xl text-navy group-hover:bg-emerald group-hover:text-white transition-colors">
                <History size={20} />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald/10 text-emerald text-[10px] font-bold rounded-full">
                <Star size={10} fill="currentColor" /> {session.attributes?.effort_score || 80}% Effort
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-navy/20 uppercase tracking-widest">{new Date(session.timestamp).toLocaleDateString()}</p>
                <h4 className="text-lg font-bold text-navy mt-1">Focus: {session.attributes?.topic || 'General Mastery'}</h4>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-navy/40 uppercase tracking-widest flex items-center gap-2">
                  <Bookmark size={10} className="text-emerald" /> Key Breakthroughs
                </p>
                <div className="flex flex-wrap gap-2">
                  {session.attributes?.breakthroughs?.map((b: string) => (
                    <span key={b} className="text-[10px] font-medium bg-academic-grey text-navy px-2 py-1 rounded-md">
                      {b}
                    </span>
                  )) || <span className="text-[10px] text-navy/20">None recorded</span>}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
