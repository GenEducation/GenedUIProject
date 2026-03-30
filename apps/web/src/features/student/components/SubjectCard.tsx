"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Agent, useAgentStore } from "@/store/useAgent";
import { BookOpen, ChevronRight, GraduationCap } from "lucide-react";

interface SubjectCardProps {
  agent: Agent;
}

export function SubjectCard({ agent }: SubjectCardProps) {
  const { activeAgent, setActiveAgent } = useAgentStore();
  const isActive = activeAgent?.id === agent.id;

  return (
    <motion.div
      layout
      key={agent.id}
      onClick={() => setActiveAgent(agent)}
      className={`p-6 rounded-[2rem] border transition-all duration-500 cursor-pointer group relative flex flex-col min-h-[160px] ${isActive ? 'bg-navy text-white border-navy shadow-2xl z-10' : 'bg-academic-grey border-navy/5 hover:border-emerald/30 shadow-sm'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner italic font-serif ${isActive ? 'bg-white/10 text-white' : 'bg-white text-navy/20'}`}>
          {agent.icon || "🎓"}
        </div>
        <div className="text-right whitespace-nowrap">
          <p className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-emerald' : 'text-emerald/60'}`}>{agent.grade || 'Core'}</p>
        </div>
      </div>
      
      <div className="space-y-1">
        <h4 className="font-bold text-lg truncate">{agent.name}</h4>
        <p className={`text-xs font-medium uppercase tracking-wider opacity-40`}>{agent.role}</p>
      </div>
      
      <p className={`text-sm mt-4 leading-relaxed line-clamp-2 transition-opacity duration-300 ${isActive ? 'opacity-90' : 'opacity-40 group-hover:opacity-70'}`}>
        {agent.description}
      </p>

      {/* Subject Depth Indicators */}
      <div className="flex gap-6 mt-6 pt-6 border-t border-white/5">
        <div className="space-y-1">
          <p className="text-xl font-bold text-emerald">{agent.topics?.length || 0}</p>
          <p className="text-[8px] font-bold uppercase opacity-30 tracking-widest">Global Topics</p>
        </div>
        <div className="space-y-1">
          <p className="text-xl font-bold text-emerald">{Object.keys(agent.skill_vectors || {}).length}</p>
          <p className="text-[8px] font-bold uppercase opacity-30 tracking-widest">Scholarly Skills</p>
        </div>
      </div>

      {/* Scholastic Map Disclosure */}
      <div className="mt-6 space-y-3">
        <div className={`p-4 rounded-2xl text-[10px] font-bold border transition-all flex items-center justify-between ${isActive ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-white border-navy/10 hover:bg-navy/5'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald text-white' : 'bg-emerald/10 text-emerald'}`}>
              <BookOpen size={16} />
            </div>
            <span className="uppercase tracking-[0.15em] font-extrabold text-[11px]">Scholastic Intel Map</span>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-white/10 rotate-90 text-emerald' : 'bg-navy/5 opacity-40'}`}>
            <ChevronRight size={16} />
          </div>
        </div>

        <AnimatePresence>
          {isActive && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-6 pt-2 overflow-hidden"
            >
              <div className="space-y-3">
                <p className="text-[9px] font-bold uppercase text-emerald tracking-[0.2em]">Academic Milestones</p>
                <div className="space-y-2 pl-2 border-l-2 border-emerald/20">
                  {agent.topics?.map((topic: string) => (
                    <div key={topic} className="flex items-center gap-3 group/topic">
                      <div className="w-2 h-2 bg-emerald/40 rounded-full group-hover/topic:scale-125 transition-transform" />
                      <span className="text-xs font-medium opacity-60 group-hover/topic:opacity-100 transition-opacity">{topic}</span>
                    </div>
                  ))}
                </div>
              </div>

              {agent.skill_vectors && (
                <div className="pt-4 border-t border-white/10 space-y-4">
                  <p className="text-[9px] font-bold uppercase text-emerald tracking-[0.2em]">Skill Persistence</p>
                  <div className="grid grid-cols-1 gap-4">
                    {Object.entries(agent.skill_vectors).map(([skill, val]: any) => (
                      <div key={skill} className="space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-bold uppercase opacity-30 tracking-widest">
                          <span>{skill}</span>
                          <span>{val}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${val}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-emerald shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center gap-3 text-emerald font-bold text-[10px] uppercase tracking-[0.2em] animate-pulse">
                <GraduationCap size={16} />
                Socratic Connection Peer Established
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
