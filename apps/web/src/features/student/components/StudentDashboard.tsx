"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Award, ShieldCheck, LayoutDashboard, Users, BookOpen, Compass } from "lucide-react";
import { useState } from "react";
import { useAgentStore } from "@/store/useAgent";
import { CouncilRow } from "./CouncilRow";
import { SocraticChat } from "./SocraticChat";
import { SkillMatrix } from "./SkillMatrix";
import { PastLessons } from "./PastLessons";
import { SubjectDiscovery } from "./SubjectDiscovery";

export function StudentDashboard() {
  const [activeTab, setActiveTab] = useState<"council" | "hall">("council");
  const { student, masteryLevel } = useAgentStore();

  return (
    <div className="space-y-10 pb-20">
      {/* Dynamic Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-6xl font-extrabold tracking-tighter text-navy"
          >
            Scholarly <span className="text-emerald italic underline decoration-navy/10">Presence</span>
          </motion.h1>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-navy text-white rounded-full shadow-lg shadow-navy/20">
              <ShieldCheck size={14} className="text-emerald" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{student?.scholarly_rank || 'Adept'}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-academic-grey border border-navy/5 rounded-full">
              <Award size={14} className="text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-navy/60">{student?.current_title || 'Seeker of Symmetry'}</span>
            </div>
          </div>
        </div>

        <div className="flex bg-academic-grey p-1.5 rounded-2xl border border-navy/5 shadow-inner self-stretch md:self-auto">
          <button 
            onClick={() => setActiveTab("council")}
            className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'council' ? 'bg-white text-navy shadow-md' : 'text-navy/40 hover:text-navy'}`}
          >
            <Users size={14} /> Council
          </button>
          <button 
            onClick={() => setActiveTab("hall")}
            className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'hall' ? 'bg-white text-navy shadow-md' : 'text-navy/40 hover:text-navy'}`}
          >
            <LayoutDashboard size={14} /> Mastery Hall
          </button>
        </div>
      </header>

      {/* Main Experience Area */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          {activeTab === "council" && (
            <motion.div 
              key="council"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12"
            >
              <CouncilRow />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <SocraticChat />
                </div>
                <div className="space-y-6">
                   <div className="p-8 bg-academic-grey border border-navy/5 rounded-[2.5rem] space-y-4 shadow-sm">
                      <h3 className="text-xl font-bold">Concept Alignment</h3>
                      <div className="space-y-4">
                         <div className="h-2.5 w-full bg-navy/5 rounded-full overflow-hidden">
                           <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${masteryLevel}%` }}
                              className="h-full bg-emerald shadow-[0_0_15px_rgba(5,159,109,0.3)]"
                           />
                         </div>
                         <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-navy/40">Curriculum Mastery</p>
                      </div>
                   </div>
                   <PastLessons />
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === "hall" && (
            <motion.div 
              key="hall"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <SkillMatrix />
              <SubjectDiscovery />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
