"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Plus, LogOut } from "lucide-react";
import { useTeacherStore } from "../store/useTeacherStore";
import { TeacherStudent } from "../services/teacherService";
import { TeacherSummary } from "./TeacherSummary";
import { StudentRoster } from "./StudentRoster";
import { InviteStudentModal } from "./InviteStudentModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { ToastStack, ToastItem } from "./Toast";
import { TeacherChatExploration } from "./TeacherChatExploration";

// Lazy-loaded: pulls in the full report-card document, only needed when a
// teacher opens a student's report (same component used by the student/parent portals).
const StudentReportCard = dynamic(
  () => import("@/components/report-card/StudentReportCard").then((m) => m.StudentReportCard),
  { ssr: false },
);

function studentLabel(student: TeacherStudent) {
  return student.name || student.username || student.email || "this student";
}

export function TeacherDashboard() {
  const {
    teacherProfile,
    overview,
    isFetchingOverview,
    fetchOverview,
    fetchStudents,
    invite,
    approve,
    remove,
    approvingId,
    isRemoving,
    logoutTeacher,
    view,
    selectedStudent,
    openReport,
    openAnalytics,
    closeReport,
  } = useTeacherStore();

  const [isInviteOpen, setInviteOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<TeacherStudent | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (!teacherProfile) return;
    fetchOverview();
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherProfile?.user_id]);

  const pushToast = (toast: Omit<ToastItem, "id">) => {
    setToasts((prev) => [...prev, { ...toast, id: Date.now() + Math.random() }]);
  };

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleApprove = async (student: TeacherStudent) => {
    const result = await approve(student.student_id, student.subject || "");
    if (result.ok) {
      pushToast({
        type: "success",
        title: "Student approved",
        description: `${studentLabel(student)} is now an active learner${student.subject ? ` in ${student.subject}` : ""}.`,
      });
    } else {
      pushToast({
        type: "error",
        title: "Cannot approve",
        description: result.message,
        code: result.code,
      });
    }
  };

  const handleRemoveConfirm = async () => {
    if (!pendingRemove) return;
    const student = pendingRemove;
    try {
      await remove(student.student_id);
      pushToast({
        type: "success",
        title: "Removed",
        description: `${studentLabel(student)} was removed from your class.`,
      });
    } catch (err) {
      pushToast({
        type: "error",
        title: "Couldn't remove student",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setPendingRemove(null);
    }
  };

  const handleViewChats = (student: TeacherStudent) => {
    openReport(student);
  };

  const handleViewAnalytics = (student: TeacherStudent) => {
    openAnalytics(student);
  };

  const handleInvite = async (identifier: string, subject: string) => {
    await invite(identifier, subject);
    pushToast({
      type: "success",
      title: "Invite sent",
      description: `Request sent to ${identifier} for ${subject} (status: pending).`,
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b-[3px] border-[#059F6D] bg-[#042E5C] text-white shadow-[0_6px_24px_rgba(4,46,92,.18)]">
        <div className="flex items-center gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white px-2.5 py-1.5">
              <img src="/Logo.svg" alt="GenEd" className="h-6 w-auto" />
            </div>
            <div className="hidden sm:block">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8fb9e6]">
                Teacher&apos;s Portal
              </div>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-[13.5px] font-semibold">{teacherProfile?.full_name || teacherProfile?.username}</div>
              <div className="text-[11px] text-[#8fb9e6]">
                {[teacherProfile?.title, teacherProfile?.role].filter(Boolean).join(" · ")}
              </div>
            </div>
            <button
              onClick={logoutTeacher}
              className="flex items-center gap-1.5 rounded-[9px] border border-white/15 bg-white/10 px-3 py-2 text-[12.5px] font-medium text-[#cfe0f2] transition-colors hover:bg-white/15 hover:text-white"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {view === "analytics" && selectedStudent ? (
        <div className="min-h-[calc(100vh-57px)] bg-[#FBFBFA]">
          <div className="mx-auto max-w-6xl px-6 pt-6">
            <button
              onClick={closeReport}
              className="mb-1 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#6b7d91] transition-colors hover:text-[#042E5C]"
            >
              <ArrowLeft size={14} />
              Back to class
            </button>
          </div>
          <StudentReportCard
            teacherId={teacherProfile?.user_id}
            childId={selectedStudent.student_id}
            childName={studentLabel(selectedStudent)}
          />
        </div>
      ) : view === "chats" && selectedStudent ? (
        <div className="flex h-[calc(100vh-57px)] flex-col">
          <div className="flex-none border-b border-[#e6ecf2] bg-white px-6 py-3.5">
            <button
              onClick={closeReport}
              className="mb-1.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#6b7d91] transition-colors hover:text-[#042E5C]"
            >
              <ArrowLeft size={14} />
              Back to class
            </button>
            <h1 className="font-serif text-lg font-semibold text-[#042E5C]">
              {studentLabel(selectedStudent)} <span className="font-sans text-[12.5px] font-normal text-[#6b7d91]">· Chat history</span>
            </h1>
          </div>
          <TeacherChatExploration />
        </div>
      ) : (
      <main className="mx-auto max-w-6xl px-6 py-8">
        {view === "chats" ? null : (
          <>
            {/* Page head */}
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#059F6D]">My Students</p>
                <h1 className="mt-1 font-serif text-3xl font-semibold text-[#042E5C] sm:text-4xl">
                  Class Progress Overview
                </h1>
                <p className="mt-1 text-[15px] text-[#6b7d91]">
                  Approve requests, then track each student&apos;s journey.
                </p>
              </div>
              <button
                onClick={() => setInviteOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-[#059F6D] px-4.5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(5,159,109,.28)] transition-all hover:-translate-y-0.5 hover:bg-[#048a5d]"
              >
                <Plus size={17} />
                Invite student
              </button>
            </div>

            <TeacherSummary overview={overview} approvedAvgMastery={null} isLoading={isFetchingOverview} />

            <StudentRoster
              onApprove={handleApprove}
              onRemove={setPendingRemove}
              onViewChats={handleViewChats}
              onViewReport={handleViewAnalytics}
              approvingId={approvingId}
              removingId={isRemoving}
            />
          </>
        )}
      </main>
      )}

      <InviteStudentModal isOpen={isInviteOpen} onClose={() => setInviteOpen(false)} onInvite={handleInvite} />

      <ConfirmDialog
        isOpen={!!pendingRemove}
        onClose={() => setPendingRemove(null)}
        onConfirm={handleRemoveConfirm}
        title="Remove student?"
        message={
          pendingRemove
            ? `Remove ${studentLabel(pendingRemove)}${pendingRemove.subject ? ` (${pendingRemove.subject})` : ""} from your class?`
            : ""
        }
        confirmLabel="Remove"
        isLoading={!!isRemoving}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
