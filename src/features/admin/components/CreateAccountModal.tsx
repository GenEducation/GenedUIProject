"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { createUser, listPartners, CreateUserPayload, PartnerRow } from "../adminService";
import { useTaxonomySubjects } from "@/features/subjects/subjectCatalog";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

type FormRole = "STUDENT" | "PARENT" | "PARTNER" | "TEACHER";

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-[#059F6D] focus:outline-none focus:ring-2 focus:ring-[#059F6D]/20";
const labelCls =
  "block text-[9px] font-bold uppercase tracking-[0.22em] text-white/40 mb-1.5";

export function CreateAccountModal({ onClose, onCreated }: Props) {
  const catalog = useTaxonomySubjects();
  const taxonomySubjects = useMemo(
    () => Array.from(new Set(catalog.map((entry) => entry.name))),
    [catalog],
  );
  const [role, setRole] = useState<FormRole>("STUDENT");
  const [form, setForm] = useState<Record<string, string>>({});
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Teachers must be scoped to a school — load partners for the picker.
  useEffect(() => {
    if (role === "TEACHER" && partners.length === 0) {
      listPartners()
        .then(setPartners)
        .catch(() => {});
    }
  }, [role, partners.length]);

  const handleSubmit = async () => {
    setError("");
    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }
    if (role === "TEACHER" && !form.partner_id) {
      setError("A teacher must be assigned to a school.");
      return;
    }

    const payload: CreateUserPayload = {
      role,
      email: form.email,
      password: form.password,
      ...(form.username ? { username: form.username } : {}),
    };
    if (role === "STUDENT") {
      if (form.age) payload.age = Number(form.age);
      if (form.grade) payload.grade = Number(form.grade);
      if (form.school_board) payload.school_board = form.school_board;
      if (form.parent_email) payload.parent_email = form.parent_email;
    } else if (role === "PARENT") {
      if (form.phone) payload.phone = form.phone;
    } else if (role === "PARTNER") {
      if (form.organization) payload.organization = form.organization;
      if (form.website) payload.website = form.website;
    } else if (role === "TEACHER") {
      payload.partner_id = form.partner_id;
      if (form.full_name) payload.full_name = form.full_name;
      if (form.title) payload.title = form.title;
      if (form.subjects) {
        payload.subjects = form.subjects
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    setSaving(true);
    try {
      await createUser(payload);
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create account.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#13283a] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Create account</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Role</label>
            <div className="flex gap-2">
              {(["STUDENT", "PARENT", "PARTNER", "TEACHER"] as FormRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    role === r
                      ? "bg-[#059F6D] text-white"
                      : "bg-white/5 text-white/50 hover:bg-white/10"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email *</label>
              <input
                className={inputCls}
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className={labelCls}>Username</label>
              <input
                className={inputCls}
                value={form.username ?? ""}
                onChange={(e) => set("username", e.target.value)}
                placeholder="(auto from email)"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Password *</label>
            <input
              className={inputCls}
              type="password"
              value={form.password ?? ""}
              onChange={(e) => set("password", e.target.value)}
            />
          </div>

          {role === "STUDENT" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Age</label>
                <input className={inputCls} value={form.age ?? ""} onChange={(e) => set("age", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Grade</label>
                <input className={inputCls} value={form.grade ?? ""} onChange={(e) => set("grade", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>School board</label>
                <input className={inputCls} value={form.school_board ?? ""} onChange={(e) => set("school_board", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Parent email</label>
                <input className={inputCls} value={form.parent_email ?? ""} onChange={(e) => set("parent_email", e.target.value)} />
              </div>
            </div>
          )}

          {role === "PARENT" && (
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
            </div>
          )}

          {role === "PARTNER" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Organization</label>
                <input className={inputCls} value={form.organization ?? ""} onChange={(e) => set("organization", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Website</label>
                <input className={inputCls} value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} />
              </div>
            </div>
          )}

          {role === "TEACHER" && (
            <>
              <div>
                <label className={labelCls}>School (partner) *</label>
                <select
                  className={inputCls}
                  value={form.partner_id ?? ""}
                  onChange={(e) => set("partner_id", e.target.value)}
                >
                  <option value="">Select a school…</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.organization ?? p.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Full name</label>
                  <input className={inputCls} value={form.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Title</label>
                  <input className={inputCls} value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="HOD Science" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Subjects</label>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/15 bg-white/5 p-3">
                    {taxonomySubjects.map((subject) => {
                      const selected = (form.subjects ?? "").split(",").filter(Boolean);
                      return (
                        <label key={subject} className="flex items-center gap-2 text-xs text-white/80">
                          <input
                            type="checkbox"
                            checked={selected.includes(subject)}
                            onChange={(event) => {
                              const next = event.target.checked
                                ? [...selected, subject]
                                : selected.filter((item) => item !== subject);
                              set("subjects", next.join(","));
                            }}
                          />
                          {subject}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

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
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-[#059F6D] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
