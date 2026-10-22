"use client";

import { useState } from "react";
import { Select } from "@/components/ui/Select";
import { FormModal } from "./ui/FormModal";
import { ADMIN_INPUT, ADMIN_LABEL } from "./ui/fields";

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
    <FormModal title={title} onClose={onClose} onSubmit={save} submitting={saving} error={error}>
      {fields.map((f) => (
        <div key={f.key}>
          <label className={ADMIN_LABEL} htmlFor={`entity-${f.key}`}>
            {f.label}
          </label>
          {f.type === "select" ? (
            <Select
              size="lg"
              aria-label={f.label}
              value={vals[f.key] ?? ""}
              onChange={(v) => setVals((prev) => ({ ...prev, [f.key]: v }))}
              options={(f.options ?? []).map((option) => ({ value: option, label: option }))}
            />
          ) : (
            <input
              id={`entity-${f.key}`}
              className={ADMIN_INPUT}
              type={f.type === "number" ? "number" : "text"}
              value={vals[f.key] ?? ""}
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          )}
        </div>
      ))}
    </FormModal>
  );
}
