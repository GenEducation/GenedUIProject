"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, User, Check, X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useParentStore } from "../store/useParentStore";

export function ParentRequestBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { linkedStudents, updateStudentStatus } = useParentStore();

  const pendingRequests = linkedStudents.filter(s => s.status === "PENDING");
  const unreadCount = pendingRequests.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-12 h-12 rounded-2xl bg-white border border-[#1a3a2a]/10 hover:border-[#1a3a2a]/30 flex items-center justify-center text-[#1a3a2a] transition-all shadow-sm hover:shadow-md group active:scale-95"
      >
        <Bell size={22} className={unreadCount > 0 ? "animate-swing" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-[#059669] text-white text-[10px] font-black rounded-full flex items-center justify-center border-4 border-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute right-0 mt-4 w-96 bg-white rounded-[32px] shadow-[0_30px_90px_rgba(26,58,42,0.18)] border border-[#1a3a2a]/10 overflow-hidden z-50"
          >
            <div className="p-6 border-b border-[#1a3a2a]/5 bg-[#FBFBFA]">
              <h3 className="text-sm font-black text-[#1a3a2a] uppercase tracking-widest leading-none mb-1.5">Link Requests</h3>
              <p className="text-[10px] font-bold text-[#1a3a2a]/40 uppercase tracking-tight">
                {unreadCount > 0 ? `${unreadCount} students waiting for approval` : "No pending requests"}
              </p>
            </div>

            <div className="max-h-[440px] overflow-y-auto">
              {pendingRequests.length > 0 ? (
                <div className="divide-y divide-[#1a3a2a]/5">
                  {pendingRequests.map((request) => (
                    <div 
                      key={request.student_id}
                      className="p-6 flex items-center justify-between gap-4 hover:bg-[#FBFBFA] transition-colors group"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-[#E5F2E9] flex items-center justify-center text-[#1a3a2a] shadow-sm">
                          <User size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[#1a3a2a] truncate leading-tight">
                            {request.username || "Unknown Student"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-[#1a3a2a]/30 uppercase tracking-widest">
                            <Clock size={10} />
                            <span>Pending</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => updateStudentStatus(request.student_id, "APPROVED")}
                          className="w-10 h-10 rounded-xl bg-[#059669] text-white flex items-center justify-center hover:bg-[#047857] transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5"
                          title="Approve"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => updateStudentStatus(request.student_id, "REJECTED")}
                          className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-all"
                          title="Reject"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-16 text-center">
                  <div className="w-20 h-20 bg-[#F4F3EE] rounded-[32px] flex items-center justify-center mx-auto text-[#1a3a2a]/10 mb-6">
                    <Bell size={36} />
                  </div>
                  <h4 className="text-base font-bold text-[#1a3a2a]/60">All Caught Up!</h4>
                  <p className="text-[12px] font-medium text-[#1a3a2a]/30 mt-2">No pending connection requests at the moment.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes swing {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
        }
        .animate-swing {
          animation: swing 2s ease-in-out infinite;
          transform-origin: top center;
        }
      `}</style>
    </div>
  );
}
