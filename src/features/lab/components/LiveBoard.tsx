"use client";

import { useState } from "react";
import { ArrowLeftRight, Check, Monitor, UserCheck, UserX, Zap, RefreshCw } from "lucide-react";
import { useLabStore } from "../store/useLabStore";
import type { BoardResponse, LabSessionState } from "../types/lab";
import { ApiRequestError } from "@/utils/authFetch";

const stateStyles: Record<LabSessionState, string> = {
  IDLE: "bg-border text-muted",
  ASSIGNED: "bg-warning-bg text-warning-ink",
  CONFIRMED: "bg-[#e6f0fb] text-info",
  ACTIVE: "bg-emerald-50 text-emerald-600",
  SUSPENDED: "bg-danger-bg text-danger-ink",
  COMPLETED: "bg-emerald-50 text-emerald-600",
  REASSIGNED: "bg-border text-muted",
  INCOMPLETE: "bg-danger-bg text-danger-ink",
  ABSENT: "bg-border text-muted-light",
};

interface LiveBoardProps {
  board: BoardResponse;
  onToast: (t: { type: "success" | "error"; title: string; description?: string }) => void;
}

export function LiveBoard({ board, onToast }: LiveBoardProps) {
  const { bind, reassign, resumeIncomplete, swap, confirmOverride, markAbsent, markPresent, endSession, refetchBoard } =
    useLabStore();
  const [pendingReassign, setPendingReassign] = useState<{ sessionId: string; label: string } | null>(null);
  const [swapFirst, setSwapFirst] = useState<{ sessionId: string; label: string } | null>(null);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);

  const freeDevices = board.devices.filter((d) => !d.session_id && d.health_status === "ONLINE");
  const idleStudents = board.students.filter((s) => s.state === "IDLE" || s.state === "ABSENT");

  async function run(sessionId: string, action: () => Promise<void>, successTitle: string) {
    setBusySessionId(sessionId);
    try {
      await action();
      onToast({ type: "success", title: successTitle });
    } catch (err) {
      const isStale = err instanceof ApiRequestError && err.error_code === "LAB_1105";
      onToast({
        type: "error",
        title: isStale ? "Board was out of date" : "Action failed",
        description: err instanceof ApiRequestError ? err.message : undefined,
      });
    } finally {
      setBusySessionId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Device grid */}
      <div className="lg:col-span-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted">Room layout</h3>
          <button
            onClick={() => refetchBoard()}
            className="flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-ink"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {board.devices.map((device) => {
            const isTarget = !!pendingReassign && !device.session_id && device.health_status === "ONLINE";
            const isActive = device.state === "ACTIVE";
            return (
              <button
                key={device.device_id}
                disabled={!isTarget}
                onClick={async () => {
                  if (!pendingReassign) return;
                  await run(pendingReassign.sessionId, () => reassign(pendingReassign.sessionId, device.device_id), `Moved ${pendingReassign.label} to ${device.device_label}`);
                  setPendingReassign(null);
                }}
                className={`relative rounded-2xl border p-3.5 text-left transition-all ${
                  isTarget
                    ? "cursor-pointer border-emerald bg-emerald-50 ring-2 ring-emerald/30"
                    : "border-border bg-white"
                } ${device.health_status !== "ONLINE" ? "opacity-50" : ""}`}
              >
                {isActive && (
                  <span className="absolute right-3 top-3 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald" />
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Monitor size={14} className="text-muted" />
                    <span className="text-[12.5px] font-bold text-ink">{device.device_label}</span>
                  </div>
                  {device.is_spare && (
                    <span className="rounded-full bg-ink/5 px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted">
                      Spare
                    </span>
                  )}
                </div>
                {device.student_name ? (
                  <>
                    <p className="mt-2 truncate text-[13px] font-semibold text-ink">{device.student_name}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${stateStyles[device.state!]}`}>
                      {device.state}
                    </span>
                  </>
                ) : (
                  <p className="mt-2 text-[11.5px] text-muted-light">
                    {device.health_status === "ONLINE" ? "Free desk" : device.health_status}
                  </p>
                )}
              </button>
            );
          })}
        </div>
        {pendingReassign && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-warning-bg px-3.5 py-2.5 text-[12.5px] text-warning-ink">
            <span>
              {freeDevices.length > 0
                ? `Pick a free desk for ${pendingReassign.label}…`
                : `No free desks for ${pendingReassign.label} — end a session or add a spare first.`}
            </span>
            <button onClick={() => setPendingReassign(null)} className="font-bold underline">
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Roster */}
      <div className="lg:col-span-2">
        <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-muted">Roster</h3>
        {swapFirst && (
          <div className="mb-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[12.5px] text-emerald-700">
            <span>Pick another student to swap desks with {swapFirst.label}…</span>
            <button onClick={() => setSwapFirst(null)} className="font-bold underline">
              Cancel
            </button>
          </div>
        )}
        <div className="space-y-2">
          {board.students.map((s) => {
            const isBusy = busySessionId === s.session_id;
            return (
              <div key={s.student_id} className="rounded-xl border border-border bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-ink">
                      #{s.roll_no} {s.student_name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">{s.device_label || "No device"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${stateStyles[s.state]}`}>
                    {s.state}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.state === "ASSIGNED" && (
                    <button
                      disabled={isBusy}
                      onClick={() => run(s.session_id, () => confirmOverride(s.session_id), `Confirmed ${s.student_name}`)}
                      className="flex items-center gap-1 rounded-lg bg-[#e6f0fb] px-2 py-1 text-[10.5px] font-bold text-info disabled:opacity-50"
                    >
                      <Check size={11} />
                      Confirm
                    </button>
                  )}
                  {["ASSIGNED", "CONFIRMED", "ACTIVE"].includes(s.state) && (
                    <button
                      disabled={isBusy || !!pendingReassign}
                      onClick={() => setPendingReassign({ sessionId: s.session_id, label: s.student_name })}
                      className="flex items-center gap-1 rounded-lg bg-ink/5 px-2 py-1 text-[10.5px] font-bold text-ink disabled:opacity-50"
                    >
                      <Zap size={11} />
                      Reassign
                    </button>
                  )}
                  {["ASSIGNED", "CONFIRMED", "ACTIVE"].includes(s.state) && (
                    <button
                      disabled={isBusy}
                      onClick={() => {
                        if (!swapFirst) {
                          setSwapFirst({ sessionId: s.session_id, label: s.student_name });
                          return;
                        }
                        if (swapFirst.sessionId === s.session_id) {
                          setSwapFirst(null);
                          return;
                        }
                        run(s.session_id, () => swap(swapFirst.sessionId, s.session_id), `Swapped ${swapFirst.label} and ${s.student_name}`);
                        setSwapFirst(null);
                      }}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-bold disabled:opacity-50 ${
                        swapFirst?.sessionId === s.session_id ? "bg-emerald text-white" : "bg-ink/5 text-ink"
                      }`}
                    >
                      <ArrowLeftRight size={11} />
                      {swapFirst?.sessionId === s.session_id
                        ? "Cancel swap"
                        : swapFirst
                          ? "Swap here"
                          : "Swap"}
                    </button>
                  )}
                  {["ASSIGNED", "CONFIRMED", "ACTIVE", "SUSPENDED"].includes(s.state) && (
                    <>
                      <button
                        disabled={isBusy}
                        onClick={() => run(s.session_id, () => markAbsent(s.session_id), `Marked ${s.student_name} absent`)}
                        className="flex items-center gap-1 rounded-lg bg-danger-bg px-2 py-1 text-[10.5px] font-bold text-danger-ink disabled:opacity-50"
                      >
                        <UserX size={11} />
                        Absent
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => run(s.session_id, () => endSession(s.session_id), `Ended session for ${s.student_name}`)}
                        className="flex items-center gap-1 rounded-lg bg-border px-2 py-1 text-[10.5px] font-bold text-muted disabled:opacity-50"
                      >
                        End
                      </button>
                    </>
                  )}
                  {s.state === "ABSENT" && (
                    <button
                      disabled={isBusy}
                      onClick={() =>
                        run(s.session_id, () => markPresent(s.session_id), `${s.student_name} marked present`)
                      }
                      className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10.5px] font-bold text-emerald-600 disabled:opacity-50"
                    >
                      <UserCheck size={11} />
                      Mark present
                    </button>
                  )}
                  {s.state === "IDLE" && freeDevices.length > 0 && (
                    <BindSelect
                      isBusy={isBusy}
                      placeholder="Bind to desk…"
                      freeDevices={freeDevices}
                      onBind={(deviceId) => run(s.session_id, () => bind(s.student_id, deviceId), `Placed ${s.student_name}`)}
                    />
                  )}
                  {s.state === "INCOMPLETE" &&
                    (freeDevices.length > 0 ? (
                      <BindSelect
                        isBusy={isBusy}
                        placeholder="Continue on desk…"
                        freeDevices={freeDevices}
                        onBind={(deviceId) =>
                          run(
                            s.session_id,
                            () => resumeIncomplete(s.session_id, deviceId),
                            `Resumed ${s.student_name}`,
                          )
                        }
                      />
                    ) : (
                      <span className="rounded-lg bg-ink/5 px-2 py-1 text-[10.5px] font-semibold text-muted">
                        No free desk to continue
                      </span>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
        {idleStudents.length > 0 && (
          <p className="mt-3 text-[11.5px] text-warning-ink">
            {idleStudents.length} student{idleStudents.length === 1 ? " is" : "s are"} waiting for a device.
          </p>
        )}
      </div>
    </div>
  );
}

function BindSelect({
  isBusy,
  freeDevices,
  onBind,
  placeholder,
}: {
  isBusy: boolean;
  freeDevices: BoardResponse["devices"];
  onBind: (deviceId: string) => void;
  placeholder: string;
}) {
  return (
    <select
      disabled={isBusy}
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) onBind(e.target.value);
      }}
      className="rounded-lg border border-border px-2 py-1 text-[10.5px] font-semibold text-ink disabled:opacity-50"
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {freeDevices.map((d) => (
        <option key={d.device_id} value={d.device_id}>
          {d.device_label}
        </option>
      ))}
    </select>
  );
}
