"use client";

import React from "react";
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Users, 
  UserMinus, 
  Check, 
  X, 
  Clock,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useParentStore } from "../store/useParentStore";
import { UnlinkConfirmationModal } from "./UnlinkConfirmationModal";

export function ParentProfileView({ profile }: { profile: any }) {
  const linkedStudents = useParentStore((state) => state.linkedStudents);
  const updateStudentStatus = useParentStore((state) => state.updateStudentStatus);
  const unlinkStudent = useParentStore((state) => state.unlinkStudent);
  
  // Use the passed prop if available, otherwise fallback to store
  const storeProfile = useParentStore((state) => state.parentProfile);
  const parentProfile = profile || storeProfile;

  const pendingRequests = linkedStudents.filter(s => s.status === "PENDING");
  const approvedStudents = linkedStudents.filter(s => s.status === "APPROVED");

  const [unlinkModal, setUnlinkModal] = React.useState<{ isOpen: boolean; studentId: string; studentName: string }>({
    isOpen: false,
    studentId: "",
    studentName: ""
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#FBFBFA] p-6 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-black text-[#1a3a2a] mb-2">Account & Connections</h1>
          <p className="text-sm font-medium text-[#1a3a2a]/40">Manage your profile, linked students, and connection requests.</p>
        </header>

        {/* Account Details Section */}
        <section className="bg-white rounded-[32px] p-8 border border-[#1a3a2a]/5 shadow-sm">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-[#1a3a2a] to-[#059669] flex items-center justify-center text-white shadow-lg border-4 border-white">
              <User size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#1a3a2a] leading-tight">{parentProfile?.username || "Parent Account"}</h2>
              
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#F4F3EE]/50 border border-[#1a3a2a]/5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#1a3a2a]/40 group-hover:text-[#1a3a2a] transition-colors shadow-sm">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[#1a3a2a]/30 uppercase tracking-[0.2em] leading-none mb-1">Email Address</p>
                <p className="text-sm font-bold text-[#1a3a2a]">{parentProfile?.email || "No email provided"}</p>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-[#F4F3EE]/50 border border-[#1a3a2a]/5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#1a3a2a]/40 transition-colors shadow-sm">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[#1a3a2a]/30 uppercase tracking-[0.2em] leading-none mb-1">Account Role</p>
                <p className="text-sm font-bold text-[#1a3a2a] capitalize">{parentProfile?.role || "Parent"}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Student Connection Requests Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#1a3a2a]/40" />
              <h3 className="text-xs font-black text-[#1a3a2a] uppercase tracking-widest">Pending Requests</h3>
            </div>
            {pendingRequests.length > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-wider">
                Action Required
              </span>
            )}
          </div>

          <div className="space-y-3">
            {pendingRequests.length > 0 ? (
              pendingRequests.map((request) => (
                <motion.div 
                  key={request.student_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[24px] p-5 border border-[#1a3a2a]/5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#F4F3EE] flex items-center justify-center text-[#1a3a2a]">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#1a3a2a] leading-none">{request.username || `ID: ${request.student_id.slice(-8)}`}</p>
                      <p className="text-[11px] font-bold text-[#1a3a2a]/30 mt-1 uppercase tracking-tight">Requested Connection</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStudentStatus(request.student_id, "APPROVED")}
                      className="p-3 rounded-xl bg-[#059669] text-white hover:bg-[#047857] transition-all shadow-sm hover:shadow-md active:scale-95"
                    >
                      <Check size={18} strokeWidth={3} />
                    </button>
                    <button
                      onClick={() => updateStudentStatus(request.student_id, "REJECTED")}
                      className="p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all border border-red-500/10 active:scale-95"
                    >
                      <X size={18} strokeWidth={3} />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="bg-white/50 border border-dashed border-[#1a3a2a]/10 rounded-[28px] p-12 text-center">
                <p className="text-sm font-bold text-[#1a3a2a]/20">No pending student requests</p>
              </div>
            )}
          </div>
        </section>

        {/* Linked Children Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Users size={16} className="text-[#1a3a2a]/40" />
            <h3 className="text-xs font-black text-[#1a3a2a] uppercase tracking-widest">Your Linked Scholars</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedStudents.length > 0 ? (
              approvedStudents.map((student) => (
                <motion.div 
                  key={student.student_id}
                  layout
                  className="bg-white rounded-[28px] p-6 border border-[#1a3a2a]/5 shadow-sm hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#E5F2E9] flex items-center justify-center text-[#1a3a2a] shadow-inner mb-auto">
                        <User size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-[#1a3a2a] leading-none mb-1">{student.username}</h4>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-[#1a3a2a]/30 uppercase tracking-[0.05em]">Linked Scholar</span>
                          <span className="text-[8px] font-mono text-[#1a3a2a]/20 uppercase tracking-tight">{student.student_id}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setUnlinkModal({
                          isOpen: true,
                          studentId: student.student_id,
                          studentName: student.username || "Unknown Student"
                        });
                      }}
                      className="p-2.5 rounded-xl bg-[#FBFBFA] text-[#1a3a2a]/20 hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-500/10"
                      title="Remove Student"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-[#1a3a2a]/5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse" />
                      <span className="text-[10px] font-black text-[#059669] uppercase tracking-widest">Active Link</span>
                    </div>
                    <p className="text-[10px] font-bold text-[#1a3a2a]/30 uppercase">Since {new Date(student.requested_at).toLocaleDateString()}</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-1 md:col-span-2 bg-white/50 border border-dashed border-[#1a3a2a]/10 rounded-[32px] p-12 text-center">
                <p className="text-sm font-bold text-[#1a3a2a]/20 italic">You haven't linked any students yet</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <UnlinkConfirmationModal
        isOpen={unlinkModal.isOpen}
        studentName={unlinkModal.studentName}
        onClose={() => setUnlinkModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={() => unlinkStudent(unlinkModal.studentId)}
      />
    </div>
  );
}
