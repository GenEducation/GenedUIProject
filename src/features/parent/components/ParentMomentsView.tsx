"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useMomentsStore } from "../store/useMomentsStore";
import { Moment } from "../types/moments";
import { TimePicker } from "@/components/ui/TimePicker";
import { formatTimeDisplay } from "@/utils/datetime";
import {
  Bell,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Power,
  Edit2,
  X,
} from "lucide-react";

interface ParentMomentsViewProps {
  studentId: string;
  studentName?: string;
}

const DEFAULT_PURPOSE = "a cheerful good-morning to start the day";

export function ParentMomentsView({ studentId, studentName }: ParentMomentsViewProps) {
  const { moments, isLoading, isSaving, error, loadMoments, createMoment, updateMoment, deleteMoment, clearError } =
    useMomentsStore();

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [newTime, setNewTime] = useState("07:00");
  const [newPurpose, setNewPurpose] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editPurpose, setEditPurpose] = useState("");

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadMoments(studentId);
  }, [studentId, loadMoments]);

  const handleCreate = async () => {
    if (!newTime) return;
    const result = await createMoment({
      user_id: studentId,
      kind: "wakeup",
      purpose: newPurpose.trim() || DEFAULT_PURPOSE,
      scheduled_time: newTime,
    });
    if (result) {
      setShowForm(false);
      setNewTime("07:00");
      setNewPurpose("");
      setShowAdvanced(false);
      setSuccessId(result.id);
      setTimeout(() => setSuccessId(null), 3000);
    }
  };

  const handleToggle = (moment: Moment) => {
    updateMoment(moment.id, { enabled: !moment.enabled });
  };

  const handleDelete = async (momentId: string) => {
    await deleteMoment(momentId);
    setConfirmDeleteId(null);
  };

  const startEdit = (moment: Moment) => {
    setEditingId(moment.id);
    setEditTime(moment.scheduled_time);
    setEditPurpose(moment.purpose);
  };

  const handleEditSave = async () => {
    if (!editingId || !editTime) return;
    await updateMoment(editingId, {
      scheduled_time: editTime,
      purpose: editPurpose.trim() || DEFAULT_PURPOSE,
    });
    setEditingId(null);
  };

  const wakeupMoments = moments.filter((m) => m.kind === "wakeup");
  const otherMoments = moments.filter((m) => m.kind !== "wakeup");

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10">
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-[#1a3a2a]">
              Smart Alarms{studentName ? ` for ${studentName}` : ""}
            </h2>
            <p className="text-xs text-[#1a3a2a]/40 font-medium mt-1">
              The device speaks a personalised AI-generated greeting at the set time — no ringtone, just a warm welcome.
            </p>
          </div>
          <button
            onClick={() => { setShowForm((v) => !v); clearError(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a3a2a] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#059669] transition-all shadow-lg shadow-[#1a3a2a]/10 shrink-0"
          >
            <Plus size={14} />
            Add Alarm
          </button>
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-red-50 text-red-600 text-sm font-medium"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
              <button onClick={clearError} className="hover:text-red-800">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white p-6 lg:p-8 rounded-[32px] border border-[#1a3a2a]/5 shadow-sm space-y-5"
            >
              <h3 className="text-sm font-black text-[#1a3a2a] uppercase tracking-widest flex items-center gap-2">
                <Bell size={14} />
                New Wake-Up Alarm
              </h3>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#1a3a2a]/40 uppercase tracking-widest">Wake-Up Time (IST)</label>
                <TimePicker
                  value={newTime}
                  onChange={setNewTime}
                  aria-label="Wake-up time"
                  accentColor="#1a3a2a"
                  clearable={false}
buttonStyle={{
                    background: "color-mix(in srgb, var(--surface-sunken) 50%, transparent)",
                    border: "1px solid rgba(26,58,42,0.05)",
                    borderRadius: 16,
                    padding: "14px 16px",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="text-[10px] font-black text-[#1a3a2a]/30 uppercase tracking-widest hover:text-[#1a3a2a]/60 transition-colors"
              >
                {showAdvanced ? "▲ Hide" : "▼ Customise"} greeting vibe
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-2"
                  >
                    <label className="text-[10px] font-black text-[#1a3a2a]/40 uppercase tracking-widest">
                      What should it say? <span className="font-medium normal-case">(optional — describe the vibe, not the script)</span>
                    </label>
                    <textarea
                      value={newPurpose}
                      onChange={(e) => setNewPurpose(e.target.value)}
                      placeholder={DEFAULT_PURPOSE}
                      rows={2}
                      className="w-full bg-[#F4F3EE]/50 border border-[#1a3a2a]/5 rounded-2xl py-3 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/10 focus:bg-white transition-all resize-none"
                    />
                    <p className="text-[10px] text-[#1a3a2a]/30 font-medium">
                      e.g. "gently wake them up and remind them it's a school day" — the AI writes the actual sentence.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleCreate}
                  disabled={isSaving || !newTime}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[#1a3a2a] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-[#059669] disabled:opacity-50 transition-all shadow-lg shadow-[#1a3a2a]/10"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                  {isSaving ? "Saving..." : "Create Alarm"}
                </button>
                <button
                  onClick={() => { setShowForm(false); clearError(); }}
                  className="px-4 py-3.5 bg-[#F4F3EE] text-[#1a3a2a] rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#E5F2E9] transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Moments List */}
        {isLoading ? (
          <div className="flex items-center gap-3 py-8 text-[#1a3a2a]/40">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm font-bold uppercase tracking-widest">Loading alarms...</span>
          </div>
        ) : moments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-white/40 rounded-[40px] border border-dashed border-[#1a3a2a]/10">
            <div className="w-16 h-16 rounded-full bg-[#1a3a2a]/5 flex items-center justify-center text-[#1a3a2a]/20">
              <Bell size={32} />
            </div>
            <p className="text-sm font-medium text-[#1a3a2a]/40">No alarms set yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-xs font-black text-[#1a3a2a]/40 uppercase tracking-widest hover:text-[#1a3a2a] transition-colors"
            >
              + Add the first alarm
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {[{ label: "Wake-Up", items: wakeupMoments }, { label: "Other", items: otherMoments }]
              .filter((g) => g.items.length > 0)
              .map((group) => (
                <div key={group.label} className="space-y-3">
                  <p className="text-[10px] font-black text-[#1a3a2a]/30 uppercase tracking-[0.25em]">{group.label}</p>
                  <AnimatePresence mode="popLayout">
                    {group.items.map((moment) => (
                      <motion.div
                        key={moment.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        className={`bg-white rounded-3xl border shadow-sm transition-all ${
                          moment.enabled ? "border-[#1a3a2a]/5" : "border-[#1a3a2a]/5 opacity-60"
                        }`}
                      >
                        {editingId === moment.id ? (
                          /* Edit mode */
                          <div className="p-5 space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-[#1a3a2a]/40 uppercase tracking-widest">Time (IST)</label>
                              <TimePicker
                                value={editTime}
                                onChange={setEditTime}
                                aria-label="Moment time"
                                accentColor="#1a3a2a"
                                size="sm"
                                clearable={false}
                                buttonStyle={{
                                  background:
                                    "color-mix(in srgb, var(--surface-sunken) 50%, transparent)",
                                  border: "1px solid rgba(26,58,42,0.05)",
                                  borderRadius: 12,
                                  padding: "10px 12px",
                                }}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-[#1a3a2a]/40 uppercase tracking-widest">Greeting vibe</label>
                              <textarea
                                value={editPurpose}
                                onChange={(e) => setEditPurpose(e.target.value)}
                                rows={2}
                                className="w-full bg-[#F4F3EE]/50 border border-[#1a3a2a]/5 rounded-xl py-2.5 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/10 focus:bg-white transition-all resize-none"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleEditSave}
                                disabled={isSaving || !editTime}
                                className="flex items-center gap-1.5 px-4 py-2 bg-[#1a3a2a] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#059669] disabled:opacity-50 transition-all"
                              >
                                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-4 py-2 bg-[#F4F3EE] text-[#1a3a2a] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#E5F2E9] transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : confirmDeleteId === moment.id ? (
                          /* Delete confirmation */
                          <div className="p-5 flex items-center justify-between gap-4">
                            <p className="text-sm font-bold text-[#1a3a2a]">Delete this alarm?</p>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => handleDelete(moment.id)}
                                disabled={isSaving}
                                className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 disabled:opacity-50 transition-all"
                              >
                                {isSaving ? <Loader2 size={12} className="animate-spin" /> : "Delete"}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-4 py-2 bg-[#F4F3EE] text-[#1a3a2a] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#E5F2E9] transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Normal view */
                          <div className="p-5 flex items-center gap-4">
                            {/* Time display */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-[#1a3a2a] tabular-nums">
                                  {(formatTimeDisplay(moment.scheduled_time) ?? moment.scheduled_time)}
                                </span>
                                <span className="text-[10px] font-black text-[#1a3a2a]/30 uppercase tracking-widest">
                                  {moment.scheduled_date ? `on ${moment.scheduled_date}` : "Daily"}
                                </span>
                              </div>
                              <p className="text-xs text-[#1a3a2a]/40 font-medium mt-0.5 truncate">
                                {moment.purpose}
                              </p>
                              {successId === moment.id && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">
                                  <CheckCircle2 size={10} /> Created — device picks it up within ~5 min
                                </span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleToggle(moment)}
                                disabled={isSaving}
                                title={moment.enabled ? "Disable" : "Enable"}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 ${
                                  moment.enabled
                                    ? "bg-[#1a3a2a] text-white shadow-md shadow-[#1a3a2a]/15"
                                    : "bg-[#F4F3EE] text-[#1a3a2a]/30"
                                }`}
                              >
                                <Power size={14} />
                              </button>
                              <button
                                onClick={() => startEdit(moment)}
                                title="Edit"
                                className="w-9 h-9 rounded-xl bg-[#F4F3EE] text-[#1a3a2a]/50 flex items-center justify-center hover:bg-[#E5F2E9] hover:text-[#1a3a2a] transition-all"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(moment.id)}
                                title="Delete"
                                className="w-9 h-9 rounded-xl bg-[#F4F3EE] text-[#1a3a2a]/30 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
