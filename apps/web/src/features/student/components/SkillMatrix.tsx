"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Activity, Award, Info, X, Users, ChevronRight } from "lucide-react";
import { useAgentStore } from "@/store/useAgent";

export function SkillMatrix() {
  const { masteryNodes, agents, student, fetchMasteryMap, setActiveAgent } = useAgentStore();
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  // Get enrolled agents
  const enrolledAgents = agents.filter(a => student?.class_ids?.includes(a.class_id) || a.class_id === 'core_curriculum');

  useEffect(() => {
    // Default to the first enrolled agent if none selected
    if (!selectedAgentId && enrolledAgents.length > 0) {
      setSelectedAgentId(enrolledAgents[0].id);
    }
  }, [enrolledAgents, selectedAgentId]);

  useEffect(() => {
    if (student?.id && selectedAgentId) {
      const agent = enrolledAgents.find(a => a.id === selectedAgentId);
      if (agent) {
        fetchMasteryMap(student.id, agent.class_id);
      }
    }
  }, [student?.id, selectedAgentId, fetchMasteryMap]);

  const activeAgent = enrolledAgents.find(a => a.id === selectedAgentId);

  // Ensure masteryNodes is always an array
  const safeNodes = Array.isArray(masteryNodes) ? masteryNodes : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4 w-full md:w-auto">
          <div className="space-y-1">
            <h3 className="text-3xl font-bold text-navy">Conceptual Mastery Hall</h3>
            <p className="text-sm text-navy/40">Visualizing your depth in scholarly subjects.</p>
          </div>
          
          {/* Agent Selection Combo Box */}
          <div className="relative group w-full md:w-80">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-navy/20 group-focus-within:text-emerald transition-colors">
              <Users size={16} />
            </div>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full pl-12 pr-10 py-4 bg-academic-grey border border-navy/5 rounded-2xl text-sm font-bold text-navy appearance-none focus:outline-none focus:ring-2 focus:ring-emerald/20 transition-all cursor-pointer shadow-inner"
            >
              <option value="" disabled>Select Scholarly Subject...</option>
              {enrolledAgents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} — {agent.grade || 'Core'}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-navy/20">
              <div className="w-5 h-5 flex items-center justify-center rotate-90">
                <ChevronRight size={14} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-white p-4 pr-8 rounded-[2rem] border border-navy/5 shadow-xl shadow-navy/5">
           <div className="w-16 h-16 bg-academic-grey rounded-[1.5rem] flex items-center justify-center text-emerald shadow-inner relative overflow-hidden">
             <Award size={32} />
             <motion.div 
               initial={{ rotate: 0 }}
               animate={{ rotate: 360 }}
               transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
               className="absolute inset-0 border-2 border-dashed border-emerald/20 rounded-full scale-150"
             />
           </div>
           <div className="space-y-1">
             <p className="text-[10px] font-bold text-navy/30 uppercase tracking-[0.2em]">Overall Mastery</p>
             <div className="flex items-baseline gap-1">
               <span className="text-4xl font-extrabold text-navy tracking-tighter">35<span className="text-emerald">%</span></span>
             </div>
           </div>
        </div>
      </div>

      <div className="relative h-[500px] w-full bg-white border border-navy/5 rounded-[3rem] shadow-sm overflow-hidden group">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#042E5C 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Connection Lines (Simplified SVGs) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10">
          <path d="M100,100 L200,150 L300,200" stroke="#042E5C" strokeWidth="2" fill="none" strokeDasharray="4 4" />
          <path d="M200,150 L150,250" stroke="#042E5C" strokeWidth="2" fill="none" strokeDasharray="4 4" />
        </svg>

        {/* Concept Nodes */}
        {safeNodes.length > 0 ? safeNodes.map((node) => (
          <motion.div
            key={node.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            onClick={() => setSelectedNode(node)}
            className="absolute cursor-pointer flex flex-col items-center gap-3 group/node"
            style={{ left: node.coordinates?.x || 0, top: node.coordinates?.y || 0 }}
          >
            <div className={`
              w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all border-2
              ${node.status === 'mastered' ? 'bg-emerald border-emerald-300 text-white' : 
                node.status === 'in_progress' ? 'bg-amber-100 border-amber-300 text-amber-600' : 
                'bg-academic-grey border-navy/5 text-navy/20'}
            `}>
              <Activity size={20} className={node.status === 'in_progress' ? 'animate-pulse' : ''} />
            </div>
            <div className="px-3 py-1 bg-white border border-navy/5 rounded-full shadow-sm opacity-0 group-hover/node:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold text-navy truncate block max-w-[100px]">{node.label}</span>
            </div>
            
            {/* Status Ping for in_progress */}
            {node.status === 'in_progress' && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald rounded-full border-2 border-white animate-ping" />
            )}
          </motion.div>
        )) : (
          <div className="w-full h-full flex items-center justify-center text-navy/20 font-bold uppercase tracking-widest">
            {activeAgent ? 'Generating Skill Map...' : 'Select an Agent to View Mastery'}
          </div>
        )}

        {/* Mastery Detail Modal (Overlay) */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-10 left-10 right-10 p-8 bg-navy text-white rounded-[2.5rem] shadow-2xl flex justify-between items-center z-50"
            >
              <div className="flex gap-6 items-center">
                <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center text-emerald">
                  <Activity size={32} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald uppercase tracking-widest">
                      {selectedNode.status?.replace('_', ' ') || 'Exploration'}
                    </span>
                    <div className="w-1 h-1 bg-white/20 rounded-full" />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{activeAgent?.name}</span>
                  </div>
                  <h4 className="text-2xl font-bold">{selectedNode.label}</h4>
                  <p className="text-sm text-white/40 max-w-md">Mastery of this concept represents a significant breakthrough in {activeAgent?.name}'s curriculum.</p>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-3">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Conceptual Depth</p>
                  <p className="text-3xl font-bold text-emerald">{selectedNode.score}%</p>
                </div>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
