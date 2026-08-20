"use client";

import { useState } from "react";
import { Select } from "@/components/ui/Select";

export interface EditField {
  key: string;
  label: string;
  type?: "text" | "number" | "select";
  options?: readonly string[];
}

interface Props {
  title: string;
  fields: EditField[];
  initial: Record<string, unknown>;
  onClose: () => void;
  /** Receives only the changed/typed values; numbers are coerced. */
  onSave: (values: Record<string, string | number>) => Promise<unknown>;
}

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-[#059F6D] focus:outline-none";
const labelCls =
  "block text-[9px] font-bold uppercase tracking-[0.22em] text-white/40 mb-1.5";

export function EntityEditModal({ title, fields, initial, onClose, onSave }: Props) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((f) => [f.key, initial[f.key] == null ? "" : String(initial[f.key])]),
    ),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError("");
    const payload: Record<string, string | number> = {};
    for (const f of fields) {
      const raw = vals[f.key]?.trim() ?? "";
      if (raw === "") continue;
      payload[f.key] = f.type === "number" ? Number(raw) : raw;
    }
    setSaving(true);
    try {
      await onSave(payload);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#13283a] p-6 shadow-2xl">
        <h2 className="text-lg font-bold mb-5">{title}</h2>
        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className={labelCls}>{f.label}</label>
              {f.type === "select" ? (
                <Select
                  theme="dark"
                  size="lg"
                  aria-label={f.label}
                  value={vals[f.key] ?? ""}
                  onChange={(v) => setVals((prev) => ({ ...prev, [f.key]: v }))}
                  options={(f.options ?? []).map((option) => ({ value: option, label: option }))}
                />
              ) : (
                <input
                  className={inputCls}
                  type={f.type === "number" ? "number" : "text"}
                  value={vals[f.key] ?? ""}
                  onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
          {error ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
              {error}
            </div>
          ) : null}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white/60 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-[#059F6D] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
