"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, PlayCircle, StopCircle, Users, ExternalLink } from "lucide-react";
import { useLabStore } from "../store/useLabStore";
import { LiveBoard } from "./LiveBoard";
import { ClassReport } from "./ClassReport";
import type { SlotResponse } from "../types/lab";
import { ApiRequestError } from "@/utils/authFetch";
import { ToastStack, ToastItem } from "@/features/teacher/components/Toast";

interface RunPeriodProps {
  slot: SlotResponse;
  userId: string;
  onBack: () => void;
  onRosterImportClick?: () => void;
}

export function RunPeriod({ slot, userId, onBack, onRosterImportClick }: RunPeriodProps) {
  const { board, isLoadingBoard, boardError, openBoard, closeBoard, activateSlot, endSlot, slots } = useLabStore();
  const [activateResult, setActivateResult] = useState<{ assigned: number; idle: number } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [noRosterError, setNoRosterError] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const currentSlot = slots.find((s) => s.id === slot.id) || slot;

  const pushToast = (t: Omit<ToastItem, "id">) => setToasts((prev) => [...prev, { ...t, id: Date.now() + Math.random() }]);
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    if (currentSlot.status === "ACTIVE" || currentSlot.status === "COMPLETED") {
      openBoard(slot.id, userId);
    }
    return () => closeBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlot.status, slot.id]);

  const handleActivate = async () => {
    setIsBusy(true);
    setNoRosterError(false);
    try {
      const result = await activateSlot(slot.id);
      setActivateResult({ assigned: result.assigned, idle: result.idle });
      pushToast({ type: "success", title: "Period activated", description: `${result.assigned} assigned · ${result.idle} waiting` });
    } catch (err) {
      if (err instanceof ApiRequestError && err.error_code === "LAB_1101") {
        setNoRosterError(true);
      } else {
        pushToast({ type: "error", title: "Couldn't activate", description: err instanceof ApiRequestError ? err.message : undefined });
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleEnd = async () => {
    setIsBusy(true);
    try {
      await endSlot(slot.id);
      pushToast({ type: "success", title: "Period ended" });
    } catch (err) {
      pushToast({ type: "error", title: "Couldn't end period", description: err instanceof ApiRequestError ? err.message : undefined });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col px-6 py-8 lg:px-10">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted hover:text-ink">
        <ArrowLeft size={14} />
        Back to schedule
      </button>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-emerald">
            Grade {currentSlot.grade}
            {currentSlot.section} · {currentSlot.subject}
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">
            {currentSlot.chapter || currentSlot.topic || "Lab Period"}
          </h1>
        </div>

        {currentSlot.status === "SCHEDULED" && (
          <button
            onClick={handleActivate}
            disabled={isBusy}
            className="flex items-center gap-2 rounded-xl bg-emerald px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(5,159,109,.28)] hover:-translate-y-0.5 hover:bg-emerald-600 disabled:opacity-50"
          >
            <PlayCircle size={18} />
            {isBusy ? "Activating…" : "Activate period"}
          </button>
        )}
        {currentSlot.status === "ACTIVE" && (
          <button
            onClick={handleEnd}
            disabled={isBusy}
            className="flex items-center gap-2 rounded-xl bg-danger px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-danger/20 hover:bg-[#c84f3b] disabled:opacity-50"
          >
            <StopCircle size={18} />
            {isBusy ? "Ending…" : "End period"}
          </button>
        )}
      </div>

      {noRosterError && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-warning-bg p-4 text-[13px] text-warning-ink">
          <span>No roster found for this grade/section. Import the class register first.</span>
          {onRosterImportClick && (
            <button onClick={onRosterImportClick} className="flex shrink-0 items-center gap-1 font-bold underline">
              Import roster
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      )}

      {activateResult && currentSlot.status === "ACTIVE" && (
        <div className="mb-5 flex items-center gap-4 rounded-xl bg-emerald-50 p-4 text-[13px] text-emerald-600">
          <Users size={16} />
          <span>
            <strong>{activateResult.assigned}</strong> assigned to devices, <strong>{activateResult.idle}</strong> waiting for a
            free desk.
          </span>
        </div>
      )}

      {currentSlot.status === "COMPLETED" ? (
        <ClassReport slotId={slot.id} />
      ) : currentSlot.status === "ACTIVE" ? (
        isLoadingBoard && !board ? (
          <p className="text-sm text-muted">Loading board…</p>
        ) : boardError ? (
          <p className="text-sm text-danger-ink">{boardError}</p>
        ) : board ? (
          <LiveBoard board={board} onToast={pushToast} />
        ) : null
      ) : (
        <p className="text-sm text-muted">Activate the period to open the live board.</p>
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
