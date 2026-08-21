"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { createUser, listPartners, CreateUserPayload, PartnerRow } from "../adminService";
import { useTaxonomySubjects } from "@/features/subjects/subjectCatalog";
import { EDUCATION_BOARDS, isEducationBoard } from "@/types/education";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

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
  const [role, setRole] = useState<FormRole>("STUDENT");
  const [form, setForm] = useState<Record<string, string>>({});
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedPartnerBoard = partners.find((partner) => partner.id === form.partner_id)?.board;
  const catalog = useTaxonomySubjects(
    role === "TEACHER" ? selectedPartnerBoard : undefined,
  );
  const taxonomySubjects = useMemo(
    () => Array.from(new Set(catalog.map((entry) => entry.name))),
    [catalog],
  );

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Teachers and admin-provisioned students can be scoped to a school.
  useEffect(() => {
    if ((role === "TEACHER" || role === "STUDENT") && partners.length === 0) {
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
    if (role === "PARTNER" && !isEducationBoard(form.board)) {
      setError("An education board is required for a partner.");
      return;
    }

    const base = {
      email: form.email,
      password: form.password,
      ...(form.username ? { username: form.username } : {}),
    };
    let payload: CreateUserPayload | undefined;
    if (role === "STUDENT") {
      payload = {
        ...base,
        role,
        ...(form.age ? { age: Number(form.age) } : {}),
        ...(form.grade ? { grade: Number(form.grade) } : {}),
        ...(form.parent_email ? { parent_email: form.parent_email } : {}),
        ...(form.partner_id ? { partner_id: form.partner_id } : {}),
      };
    } else if (role === "PARENT") {
      payload = { ...base, role, ...(form.phone ? { phone: form.phone } : {}) };
    } else if (role === "PARTNER") {
      const board = form.board;
      if (!isEducationBoard(board)) {
        setError("An education board is required for a partner.");
        return;
      }
      payload = {
        ...base,
        role,
        board,
        ...(form.organization ? { organization: form.organization } : {}),
        ...(form.website ? { website: form.website } : {}),
      };
    } else if (role === "TEACHER") {
      payload = {
        ...base,
        role,
        partner_id: form.partner_id,
        ...(form.full_name ? { full_name: form.full_name } : {}),
        ...(form.title ? { title: form.title } : {}),
        ...(form.subjects
          ? {
              subjects: form.subjects
                .split(",")
                .map((subject) => subject.trim())
                .filter(Boolean),
            }
          : {}),
      };
    }

    if (!payload) return;

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
          <Button iconOnly size="sm" variant="tertiary" tone="onDark" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </Button>
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
                <label className={labelCls}>Parent email</label>
                <input className={inputCls} value={form.parent_email ?? ""} onChange={(e) => set("parent_email", e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>School (partner)</label>
                <Select
                  theme="dark"
                  size="lg"
                  aria-label="School (partner)"
                  value={form.partner_id ?? ""}
                  onChange={(v) => set("partner_id", v)}
                  options={[
                    { value: "", label: "GenEd (default)" },
                    ...partners.map((p) => ({
                      value: p.id,
                      label: p.organization ?? p.username,
                    })),
                  ]}
                />
                <p className="mt-1.5 text-xs text-white/40">
                  The student&apos;s board is set automatically from this school.
                </p>
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
              <div className="col-span-2">
                <label className={labelCls}>Education board *</label>
                <Select
                  theme="dark"
                  size="lg"
                  aria-label="Education board"
                  placeholder="Select a board…"
                  value={form.board ?? ""}
                  onChange={(v) => set("board", v)}
                  options={EDUCATION_BOARDS.map((board) => ({ value: board, label: board }))}
                />
              </div>
            </div>
          )}

          {role === "TEACHER" && (
            <>
              <div>
                <label className={labelCls}>School (partner) *</label>
                <Select
                  theme="dark"
                  size="lg"
                  aria-label="School (partner)"
                  placeholder="Select a school…"
                  value={form.partner_id ?? ""}
                  onChange={(v) => set("partner_id", v)}
                  options={partners.map((p) => ({
                    value: p.id,
                    label: p.organization ?? p.username,
                  }))}
                />
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
            <Button variant="tertiary" tone="onDark" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" tone="onDark" loading={saving} onClick={handleSubmit}>
              Create account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
