"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, RotateCcw, UserRound, WifiOff } from "lucide-react";
import type { DeviceResponse, RosterStudent } from "../types/lab";

export type SeatingAssignments = Record<string, string>;

interface PreActivationSeatingProps {
  students: RosterStudent[];
  devices: DeviceResponse[];
  assignments: SeatingAssignments;
  disabled?: boolean;
  onChange: (assignments: SeatingAssignments) => void;
}

function studentForDevice(assignments: SeatingAssignments, deviceId: string): string | undefined {
  return Object.entries(assignments).find(([, assignedDevice]) => assignedDevice === deviceId)?.[0];
}

export function assignStudentToDevice(
  assignments: SeatingAssignments,
  studentId: string,
  deviceId: string,
): SeatingAssignments {
  const next = { ...assignments };
  const sourceDevice = next[studentId];
  const occupant = studentForDevice(next, deviceId);

  if (occupant && occupant !== studentId) {
    if (sourceDevice) next[occupant] = sourceDevice;
    else delete next[occupant];
  }
  next[studentId] = deviceId;
  return next;
}

function DraggableStudent({ student, disabled }: { student: RosterStudent; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `student:${student.student_id}`,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-grab touch-none"
      } ${isDragging ? "z-20 opacity-60 shadow-lg" : ""}`}
      {...listeners}
      {...attributes}
    >
      <GripVertical size={14} className="shrink-0 text-muted" aria-hidden="true" />
      <UserRound size={14} className="shrink-0 text-emerald" aria-hidden="true" />
      <span className="truncate">{student.name}</span>
    </div>
  );
}

function UnassignedList({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "unassigned" });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-32 space-y-2 rounded-xl border border-dashed p-3 transition-colors ${
        isOver ? "border-emerald bg-emerald-50" : "border-border bg-ink/[0.02]"
      }`}
    >
      {children}
    </div>
  );
}

function DeviceSeat({
  device,
  student,
  students,
  disabled,
  onSelect,
}: {
  device: DeviceResponse;
  student?: RosterStudent;
  students: RosterStudent[];
  disabled?: boolean;
  onSelect: (studentId: string) => void;
}) {
  const available = device.health_status === "ONLINE" && !device.revoked_at && !device.is_spare;
  const { setNodeRef, isOver } = useDroppable({
    id: `device:${device.id}`,
    disabled: disabled || !available,
  });
  const status = device.revoked_at
    ? "Revoked"
    : device.is_spare
      ? "Reserved spare"
      : device.health_status === "ONLINE"
        ? "Online"
        : device.health_status === "NEEDS_ATTENTION"
          ? "Needs attention"
          : "Offline";

  return (
    <article
      ref={setNodeRef}
      className={`rounded-xl border p-3 transition-colors ${
        !available
          ? "border-border bg-ink/[0.03] opacity-65"
          : isOver
            ? "border-emerald bg-emerald-50 ring-2 ring-emerald/20"
            : "border-border bg-white"
      }`}
      aria-label={`${device.device_label}, ${status}${student ? `, assigned to ${student.name}` : ""}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-ink">{device.device_label}</h4>
          <p className={`mt-0.5 text-[11px] font-semibold ${available ? "text-emerald" : "text-muted"}`}>
            {status}
          </p>
        </div>
        {!available && <WifiOff size={15} className="text-muted" aria-hidden="true" />}
      </div>

      {student ? (
        <DraggableStudent student={student} disabled={disabled} />
      ) : (
        <div className="rounded-lg border border-dashed border-border px-3 py-2 text-center text-xs text-muted">
          {available ? "Drop a student here" : "Unavailable"}
        </div>
      )}

      <label className="mt-2 block text-[11px] font-semibold text-muted">
        Assign without dragging
        <select
          value={student?.student_id ?? ""}
          disabled={disabled || !available}
          onChange={(event) => onSelect(event.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-white px-2 py-2 text-xs text-ink disabled:cursor-not-allowed"
        >
          <option value="">Automatic allocation</option>
          {students.map((candidate) => (
            <option key={candidate.student_id} value={candidate.student_id}>
              {candidate.name}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}

export function PreActivationSeating({
  students,
  devices,
  assignments,
  disabled,
  onChange,
}: PreActivationSeatingProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const studentById = new Map(students.map((student) => [student.student_id, student]));
  const assignedStudentIds = new Set(Object.keys(assignments));
  const unassigned = students.filter((student) => !assignedStudentIds.has(student.student_id));
  const eligibleDevices = devices.filter(
    (device) => device.health_status === "ONLINE" && !device.revoked_at && !device.is_spare,
  );
  const automaticSeats = Math.min(
    unassigned.length,
    Math.max(eligibleDevices.length - assignedStudentIds.size, 0),
  );
  const waiting = Math.max(unassigned.length - automaticSeats, 0);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || disabled) return;
    const studentId = String(active.id).replace(/^student:/, "");
    const target = String(over.id);
    if (target === "unassigned") {
      const next = { ...assignments };
      delete next[studentId];
      onChange(next);
      return;
    }
    if (target.startsWith("device:")) {
      onChange(assignStudentToDevice(assignments, studentId, target.replace(/^device:/, "")));
    }
  };

  const selectForDevice = (deviceId: string, studentId: string) => {
    const occupant = studentForDevice(assignments, deviceId);
    if (!studentId) {
      if (!occupant) return;
      const next = { ...assignments };
      delete next[occupant];
      onChange(next);
      return;
    }
    onChange(assignStudentToDevice(assignments, studentId, deviceId));
  };

  return (
    <section className="mb-5 rounded-2xl border border-border bg-white p-5" aria-labelledby="seating-heading">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="seating-heading" className="font-serif text-lg font-semibold text-ink">
            Seat students before activation
          </h2>
          <p className="mt-1 text-xs text-muted">
            Drag students onto online devices. Anyone left unassigned is seated automatically in roll-number order.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({})}
          disabled={disabled || assignedStudentIds.size === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold text-ink disabled:opacity-40"
        >
          <RotateCcw size={13} aria-hidden="true" /> Reset to automatic
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-600">
          {assignedStudentIds.size} manually seated
        </span>
        <span className="rounded-full bg-ink/5 px-3 py-1.5 font-semibold text-muted">
          {automaticSeats} auto-allocated
        </span>
        {waiting > 0 && (
          <span className="rounded-full bg-warning-bg px-3 py-1.5 font-semibold text-warning-ink">
            {waiting} waiting
          </span>
        )}
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid gap-5 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,2fr)]">
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
              Automatic allocation ({unassigned.length})
            </h3>
            <UnassignedList>
              {unassigned.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted">Every student has a chosen device.</p>
              ) : (
                unassigned.map((student) => (
                  <DraggableStudent key={student.student_id} student={student} disabled={disabled} />
                ))
              )}
            </UnassignedList>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
              Devices ({eligibleDevices.length} available)
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {devices.map((device) => {
                const studentId = studentForDevice(assignments, device.id);
                return (
                  <DeviceSeat
                    key={device.id}
                    device={device}
                    student={studentId ? studentById.get(studentId) : undefined}
                    students={students}
                    disabled={disabled}
                    onSelect={(selected) => selectForDevice(device.id, selected)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </DndContext>
    </section>
  );
}
