"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Check, Loader2, User, Mail, BookOpen, School, Calendar, Clock } from "lucide-react";

interface StudentProfile {
  id: string;
  username: string;
  email: string;
  age: string | number;
  grade: string | number;
  school_board: string;
  status: "APPROVED" | "PENDING";
  requested_at: string;
  updated_at?: string;
}

interface StudentDetailsModalProps {
  studentId: string;
  studentName: string;
  grade: string;
  status: "APPROVED" | "PENDING";
  onClose: () => void;
  onAccept: (studentId: string) => Promise<void>;
  onReject: (studentId: string) => Promise<void>;
}

const CORE_API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
if (!CORE_API_URL) {
  // In a component we can't easily throw at top level without crashing the whole app render 
  // but since we already throw in services/stores, this is just for local consistency.
  // Actually, we'll keep it consistent with the other files.
  throw new Error("NEXT_PUBLIC_CORE_API_URL is required. Set it in your .env.local file.");
}

const getBaseUrl = () => CORE_API_URL;

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export function StudentDetailsModal({
  studentId,
  studentName,
  grade,
  status,
  onClose,
  onAccept,
  onReject,
}: StudentDetailsModalProps) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isBusy = isApproving || isRejecting;
  const isPending = status === "PENDING";

  // Fetch full student profile on mount
  useEffect(() => {
    const rawPartnerId = localStorage.getItem("gened_partner_id");
    const partnerId = rawPartnerId?.replace(/['"]+/g, "");
    if (!partnerId) {
      setFetchError("Partner ID not found. Please sign in again.");
      setIsFetching(false);
      return;
    }

    fetch(`${getBaseUrl()}/partner/students/${studentId}?partner_id=${partnerId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load student profile");
        return res.json();
      })
      .then((data: StudentProfile) => {
        setProfile(data);
        setIsFetching(false);
      })
      .catch(() => {
        setFetchError("Could not load student details. Please try again.");
        setIsFetching(false);
      });
  }, [studentId]);

  const handleAccept = async () => {
    setActionError(null);
    setIsApproving(true);
    try {
      await onAccept(studentId);
    } catch {
      setActionError("Failed to approve request. Please try again.");
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setActionError(null);
    setIsRejecting(true);
    try {
      await onReject(studentId);
    } catch {
      setActionError("Failed to reject request. Please try again.");
      setIsRejecting(false);
    }
  };

  const initials = studentName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 bg-[#1A3D2C]/20 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative w-full max-w-sm md:max-w-md bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_24px_80px_rgba(26,61,44,0.18)] overflow-hidden flex flex-col"
      >
        {/* Header strip */}
        <div className="bg-[#1A3D2C] px-6 md:px-10 pt-8 pb-10 flex flex-col items-center text-center">
          {/* Close */}
          <button
            onClick={onClose}
            disabled={isBusy}
            className="absolute top-5 right-5 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-40"
          >
            <X size={18} />
          </button>

          {/* Avatar */}
          <div className="w-14 h-14 md:w-18 md:h-18 bg-white/15 rounded-[1.25rem] flex items-center justify-center mb-4">
            <span className="text-white text-lg md:text-xl font-black">{initials}</span>
          </div>

          <h3 className="text-lg md:text-xl font-black text-white tracking-tight">{studentName}</h3>

          {/* Status badge */}
          <span
            className={`mt-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
              isPending
                ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                : "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
            }`}
          >
            {status}
          </span>
        </div>

        {/* Body */}
        <div className="px-6 md:px-10 pt-6 pb-8 flex flex-col gap-5">
          {isFetching ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 size={24} className="animate-spin text-[#1A3D2C]/30" />
              <p className="text-[11px] font-bold text-[#1A3D2C]/30 uppercase tracking-widest">Loading profile…</p>
            </div>
          ) : fetchError ? (
            <div className="py-8 text-center">
              <p className="text-sm font-bold text-red-500">{fetchError}</p>
            </div>
          ) : profile ? (
            <>
              {/* Detail rows */}
              <div className="space-y-3">
                {[
                  { icon: <Mail size={14} />, label: "Email", value: profile.email },
                  { icon: <User size={14} />, label: "Age", value: String(profile.age) },
                  { icon: <BookOpen size={14} />, label: "Grade", value: `Grade ${profile.grade}` },
                  { icon: <School size={14} />, label: "Board", value: profile.school_board },
                  { icon: <Calendar size={14} />, label: "Requested", value: formatDate(profile.requested_at) },
                  // updated_at only for APPROVED students
                  ...(profile.status === "APPROVED" && profile.updated_at
                    ? [{ icon: <Clock size={14} />, label: "Approved on", value: formatDate(profile.updated_at) }]
                    : []),
                ].map(({ icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 px-4 py-3 bg-[#F8F9F8] rounded-2xl"
                  >
                    <span className="text-[#1A3D2C]/30 shrink-0">{icon}</span>
                    <span className="text-[10px] font-black text-[#1A3D2C]/40 uppercase tracking-widest w-20 shrink-0">{label}</span>
                    <span className="text-xs font-bold text-[#1A3D2C] truncate">{value}</span>
                  </div>
                ))}
              </div>

              {/* Action error */}
              {actionError && (
                <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-2xl">
                  <p className="text-xs font-bold text-red-600">{actionError}</p>
                </div>
              )}

              {/* Actions — only for PENDING */}
              {isPending && (
                <div className="space-y-2.5 pt-1">
                  <button
                    onClick={handleAccept}
                    disabled={isBusy}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1A3D2C] text-white rounded-2xl hover:bg-[#1A3D2C]/90 transition-all font-bold text-sm shadow-lg shadow-[#1A3D2C]/10 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isApproving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    {isApproving ? "Approving…" : "Accept Request"}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isBusy}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-red-500 border border-red-100 rounded-2xl hover:bg-red-50 transition-all font-bold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isRejecting ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                    {isRejecting ? "Rejecting…" : "Reject Request"}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
