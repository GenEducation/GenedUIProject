"use client";

import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Check, X, Clock } from "lucide-react";
import { useState, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export function EnrollmentAdmin() {
  const [requests, setRequests] = useState<any[]>([]);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/enrollment/requests`);
      const data = await response.json();
      setRequests(data.filter((r: any) => r.status === 'pending'));
    } catch (err) {
      console.error("Fetch requests failed", err);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/enrollment/approve/${id}`, { method: 'POST' });
      setRequests(requests.filter(r => r.id !== id));
    } catch (err) {
      console.error("Approve failed", err);
    }
  };

  return (
    <div className="p-8 bg-white border border-navy/5 rounded-3xl shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-navy/5 rounded-xl flex items-center justify-center text-navy">
            <UserPlus size={20} />
          </div>
          <div>
            <h4 className="font-bold text-navy">Enrollment Requests</h4>
            <p className="text-[10px] text-navy/40 font-bold uppercase tracking-widest">Pending Approval</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full">{requests.length}</span>
      </div>

      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {requests.length > 0 ? requests.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 bg-academic-grey/50 rounded-2xl flex items-center justify-between border border-navy/5"
            >
              <div className="space-y-1">
                <p className="text-sm font-bold text-navy">{req.student_name}</p>
                <p className="text-[9px] text-navy/40 font-bold uppercase tracking-widest">{req.agent_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleApprove(req.id)}
                  className="p-2 bg-emerald text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald/10"
                >
                  <Check size={14} />
                </button>
                <button className="p-2 bg-white text-navy/20 rounded-lg hover:text-red-500 transition-colors border border-navy/5">
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )) : (
            <div className="py-10 text-center space-y-3">
              <Clock className="mx-auto text-navy/10" size={32} />
              <p className="text-[10px] text-navy/20 font-bold uppercase tracking-widest">Queue is currently clear</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
