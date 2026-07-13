"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowLeft, Plus } from "lucide-react";
import { useTeacherStore } from "../store/useTeacherStore";
import { TeacherStudent } from "../services/teacherService";
import { TeacherSummary } from "./TeacherSummary";
import { StudentRoster } from "./StudentRoster";
import { InviteStudentModal } from "./InviteStudentModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { ToastStack, ToastItem } from "./Toast";
import { TeacherChatExploration } from "./TeacherChatExploration";
import { TeacherSideBar } from "./TeacherSideBar";
import { SlotScheduler } from "@/features/lab/components/SlotScheduler";
import { RunPeriod } from "@/features/lab/components/RunPeriod";

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
  const router = useRouter();
  const pathname = usePathname();

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
    setView,
    selectedStudent,
    openReport,
    openAnalytics,
    closeReport,
    activeSlot,
    setActiveSlot,
  } = useTeacherStore();

  const [isInviteOpen, setInviteOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<TeacherStudent | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Sync the sidebar's coarse section (My Class vs. Lab Mode) with the URL so a
  // refresh on /teacher/lab lands back in Lab Mode.
  useEffect(() => {
    if (pathname === "/teacher/lab" && view !== "lab") {
      setView("lab");
    } else if (pathname === "/teacher" && view === "lab") {
      setView("roster");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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

  const handleSideBarNav = (target: "roster" | "lab") => {
    if (target === "lab") {
      setActiveSlot(null);
      setView("lab");
      router.push("/teacher/lab", { scroll: false });
    } else {
      setActiveSlot(null);
      closeReport();
      router.push("/teacher", { scroll: false });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      <TeacherSideBar
        activeView={view}
        onViewChange={handleSideBarNav}
        onLogout={logoutTeacher}
        teacherProfile={teacherProfile}
      />

      <main className="flex-1 overflow-y-auto">
        {view === "lab" ? (
          <div className="flex min-h-full flex-col bg-paper">
            {activeSlot ? (
              <RunPeriod
                slot={activeSlot}
                userId={teacherProfile?.user_id || ""}
                onBack={() => setActiveSlot(null)}
              />
            ) : (
              <SlotScheduler
                teacherId={teacherProfile?.user_id || ""}
                partnerId={teacherProfile?.partner_id || ""}
                onOpenSlot={setActiveSlot}
              />
            )}
          </div>
        ) : view === "analytics" && selectedStudent ? (
          <div className="min-h-full bg-paper">
            <div className="mx-auto max-w-6xl px-6 pt-6">
              <button
                onClick={closeReport}
                className="mb-1 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted transition-colors hover:text-ink"
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
          <div className="flex h-full flex-col">
            <div className="flex-none border-b border-border bg-white px-6 py-3.5">
              <button
                onClick={closeReport}
                className="mb-1.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted transition-colors hover:text-ink"
              >
                <ArrowLeft size={14} />
                Back to class
              </button>
              <h1 className="font-serif text-lg font-semibold text-ink">
                {studentLabel(selectedStudent)}{" "}
                <span className="font-sans text-[12.5px] font-normal text-muted">· Chat history</span>
              </h1>
            </div>
            <TeacherChatExploration />
          </div>
        ) : (
          <motion.div
            key="roster"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mx-auto max-w-6xl px-6 py-8 lg:px-10"
          >
            {/* Page head */}
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-emerald">My Students</p>
                <h1 className="mt-1 font-serif text-3xl font-semibold text-ink sm:text-4xl">
                  Class Progress Overview
                </h1>
                <p className="mt-1 text-[15px] text-muted">
                  Approve requests, then track each student&apos;s journey.
                </p>
              </div>
              <button
                onClick={() => setInviteOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-emerald px-4.5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(5,159,109,.28)] transition-all hover:-translate-y-0.5 hover:bg-emerald-600"
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
              onInviteClick={() => setInviteOpen(true)}
            />
          </motion.div>
        )}
      </main>

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
