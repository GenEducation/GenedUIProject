"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, PlayCircle, StopCircle, Users, ExternalLink, RefreshCw, TriangleAlert } from "lucide-react";
import { useLabStore } from "../store/useLabStore";
import { labService } from "../services/labService";
import { LiveBoard } from "./LiveBoard";
import { ClassReport } from "./ClassReport";
import type { LabCapacityResponse, SlotResponse } from "../types/lab";
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
  const [capacity, setCapacity] = useState<LabCapacityResponse | null>(null);
  const [isLoadingCapacity, setIsLoadingCapacity] = useState(false);
  const [startBlocked, setStartBlocked] = useState<"feature" | "capacity" | null>(null);
  const [capacityCheckFailed, setCapacityCheckFailed] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const currentSlot = slots.find((s) => s.id === slot.id) || slot;

  const pushToast = (t: Omit<ToastItem, "id">) => setToasts((prev) => [...prev, { ...t, id: Date.now() + Math.random() }]);
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const loadCapacity = useCallback(async () => {
    if (currentSlot.status !== "SCHEDULED") return;
    setIsLoadingCapacity(true);
    setNoRosterError(false);
    setCapacityCheckFailed(false);
    setStartBlocked(null);
    try {
      const result = await labService.getSlotCapacity(slot.id);
      setCapacity(result);
      setStartBlocked(result.can_start ? null : "capacity");
    } catch (err) {
      setCapacity(null);
      if (err instanceof ApiRequestError && err.error_code === "LAB_1101") {
        setNoRosterError(true);
      } else if (err instanceof ApiRequestError && err.error_code === "LAB_1120") {
        setStartBlocked("feature");
      } else if (err instanceof ApiRequestError && err.error_code === "LAB_1121") {
        setStartBlocked("capacity");
      } else {
        // Start performs the same authoritative check, so a failed hint does
        // not strand the teacher; explain that Start will retry it.
        setCapacityCheckFailed(true);
      }
    } finally {
      setIsLoadingCapacity(false);
    }
  }, [currentSlot.status, slot.id]);

  useEffect(() => {
    void loadCapacity();
  }, [loadCapacity]);

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
    setStartBlocked(null);
    try {
      const result = await activateSlot(slot.id);
      setActivateResult({ assigned: result.assigned, idle: result.idle });
      pushToast({ type: "success", title: "Period activated", description: `${result.assigned} assigned · ${result.idle} waiting` });
    } catch (err) {
      if (err instanceof ApiRequestError && err.error_code === "LAB_1101") {
        setNoRosterError(true);
      } else if (err instanceof ApiRequestError && err.error_code === "LAB_1120") {
        setStartBlocked("feature");
      } else if (err instanceof ApiRequestError && err.error_code === "LAB_1121") {
        setStartBlocked("capacity");
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
            disabled={isBusy || isLoadingCapacity || noRosterError || startBlocked !== null}
            className="flex items-center gap-2 rounded-xl bg-emerald px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(5,159,109,.28)] hover:-translate-y-0.5 hover:bg-emerald-600 disabled:opacity-50"
          >
            <PlayCircle size={18} />
            {isBusy
              ? "Activating…"
              : isLoadingCapacity
                ? "Checking readiness…"
                : noRosterError
                  ? "Roster required"
                  : startBlocked === "feature"
                  ? "Starts paused"
                  : startBlocked === "capacity"
                    ? "Waiting for capacity"
                    : "Activate period"}
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

      {currentSlot.status === "SCHEDULED" && startBlocked === "feature" && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-border bg-warning-bg p-4 text-[13px] text-warning-ink">
          <TriangleAlert className="mt-0.5 shrink-0" size={17} />
          <div>
            <p className="font-bold">New Lab periods are paused for this school.</p>
            <p className="mt-1">Your school administrator can confirm when starts are enabled again. Any period already running is unaffected.</p>
          </div>
        </div>
      )}

      {currentSlot.status === "SCHEDULED" && startBlocked === "capacity" && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-border bg-warning-bg p-4 text-[13px] text-warning-ink">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 shrink-0" size={17} />
            <div>
              <p className="font-bold">The whole class cannot be started yet.</p>
              <p className="mt-1">Shared voice capacity is currently in use. Wait a minute and retry; if it continues, ask your school administrator.</p>
            </div>
          </div>
          <button onClick={() => void loadCapacity()} disabled={isLoadingCapacity} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 font-bold disabled:opacity-50">
            <RefreshCw size={13} className={isLoadingCapacity ? "animate-spin" : ""} />
            Retry
          </button>
        </div>
      )}

      {currentSlot.status === "SCHEDULED" && capacity && startBlocked === null && capacity.healthy_devices === 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-border bg-warning-bg p-4 text-[13px] text-warning-ink">
          <TriangleAlert className="mt-0.5 shrink-0" size={17} />
          <div>
            <p className="font-bold">No devices are online in this lab.</p>
            <p className="mt-1">
              You can still start, but no student is seated until a Deskbot connects — devices that come online during the
              period are seated automatically.
              {capacity.spare > 0 && ` ${capacity.spare} spare ${capacity.spare === 1 ? "device is" : "devices are"} held in reserve.`}
            </p>
          </div>
        </div>
      )}

      {currentSlot.status === "SCHEDULED" && capacity && startBlocked === null && capacity.healthy_devices > 0 && (
        <div className="mb-5 flex items-center gap-4 rounded-xl bg-emerald-50 p-4 text-[13px] text-emerald-600">
          <Users size={16} />
          <span>
            <strong>{capacity.healthy_devices}</strong> of <strong>{capacity.roster}</strong> desks online · ready to reserve{" "}
            <strong>{capacity.required}</strong> of <strong>{capacity.limit}</strong> voice places when you start.
            {capacity.spare > 0 && ` (${capacity.spare} spare in reserve.)`}
          </span>
        </div>
      )}

      {currentSlot.status === "SCHEDULED" && capacityCheckFailed && startBlocked === null && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-4 text-[13px] text-muted">
          <span>Readiness could not be refreshed. Activate period will safely check again before starting anyone.</span>
          <button onClick={() => void loadCapacity()} className="inline-flex shrink-0 items-center gap-1.5 font-bold text-ink">
            <RefreshCw size={13} /> Retry
          </button>
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
