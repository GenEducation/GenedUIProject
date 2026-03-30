"use client";

import { motion } from "framer-motion";
import { Compass, ShieldPlus, Clock, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAgentStore } from "@/store/useAgent";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export function SubjectDiscovery() {
  const { student } = useAgentStore();
  const [agents, setAgents] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agentsRes, requestsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/agents`),
          fetch(`${API_BASE_URL}/enrollment/requests`)
        ]);
        const agentsData = await agentsRes.json();
        const requestsData = await requestsRes.json();
        
        setAgents(agentsData);
        setRequests(requestsData);
      } catch (err) {
        console.error("Discovery fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRequest = async (agentId: string) => {
    if (!student) return;
    try {
      const response = await fetch(`${API_BASE_URL}/enrollment/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: student.id,
          student_name: student.name,
          agent_id: agentId,
          agent_name: agents.find(a => a.id === agentId)?.name
        })
      });
      if (response.ok) {
        const newReq = await response.json();
        setRequests([...requests, newReq]);
      }
    } catch (err) {
      console.error("Request failed", err);
    }
  };

  const getStatus = (agentId: string) => {
    if (student?.class_ids?.includes(agentId)) return "enrolled";
    const req = requests.find(r => r.agent_id === agentId && r.student_id === student?.id);
    if (req) return req.status; // pending, approved, etc.
    return "available";
  };

  if (loading) return <div className="text-center py-20 text-navy/20 font-bold uppercase tracking-widest">Scanning The Athenaeum...</div>;

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h3 className="text-3xl font-bold text-navy">The Athenaeum</h3>
          <p className="text-sm text-navy/40">Discover and request enrollment in new scholarly subjects.</p>
        </div>
        <div className="px-6 py-3 bg-academic-grey rounded-2xl border border-navy/5 text-[10px] font-bold text-navy/40 uppercase tracking-widest shadow-inner">
          Total Subjects: {agents.length}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {agents.map((agent) => {
          const status = getStatus(agent.id);
          return (
            <motion.div
              key={agent.id}
              whileHover={{ y: -5 }}
              className="p-8 bg-white border border-navy/5 rounded-[2.5rem] shadow-sm flex flex-col justify-between group h-full hover:shadow-2xl hover:shadow-navy/5 transition-all"
            >
              <div className="space-y-6">
                <div className={`w-16 h-16 rounded-3xl ${agent.id === 'agent_science' ? 'bg-emerald/10 text-emerald' : 'bg-navy/5 text-navy/20'} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Compass size={32} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-bold text-navy">{agent.name}</h4>
                  <p className="text-sm text-navy/40 leading-relaxed font-medium capitalize">{agent.role}</p>
                </div>
                <p className="text-xs text-navy/60 leading-relaxed italic line-clamp-2">"{agent.description}"</p>
              </div>

              <div className="pt-8 mt-8 border-t border-navy/5">
                {status === "enrolled" ? (
                  <div className="flex items-center gap-2 text-emerald font-bold text-xs uppercase tracking-widest">
                    <CheckCircle2 size={16} /> Fully Enrolled
                  </div>
                ) : status === "pending" ? (
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-widest animate-pulse">
                    <Clock size={16} /> Request Pending
                  </div>
                ) : (
                  <button
                    onClick={() => handleRequest(agent.id)}
                    className="w-full py-4 bg-navy text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald transition-all"
                  >
                    <ShieldPlus size={14} /> Request Enrollment
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
