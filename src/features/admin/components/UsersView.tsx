"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Upload } from "lucide-react";
import { listUsers, deleteUser, updateUser, AdminUser, Role, Plan, ImportRole } from "../adminService";
import { CreateAccountModal } from "./CreateAccountModal";
import { BulkImportModal } from "./BulkImportModal";
import { DataTable, Column } from "./DataTable";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

const toOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));
const BULK_ROLE_OPTIONS = toOptions(["STUDENT", "PARENT", "PARTNER", "TEACHER"]);
const ROLE_OPTIONS = toOptions(["STUDENT", "PARENT", "PARTNER", "TEACHER", "ADMIN"]);
const PLAN_OPTIONS = toOptions(["FREE", "PRO"]);

interface Props {
  fixedRole?: Role;
  title?: string;
}

export function UsersView({ title }: Props) {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [bulkRoleSel, setBulkRoleSel] = useState<ImportRole>("STUDENT");
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    // Load all users so every column can be searched/filtered client-side.
    listUsers({ page: 1, pageSize: 1000 })
      .then((res) => setRows(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = useCallback(
    async (u: AdminUser) => {
      if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
      try {
        await deleteUser(u.id);
        load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete user");
      }
    },
    [load],
  );

  const columns = useMemo<Column<AdminUser>[]>(
    () => [
      { key: "username", header: "Username" },
      { key: "email", header: "Email" },
      {
        key: "role",
        header: "Role",
        filterable: true,
        render: (u) => (
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs">{u.role}</span>
        ),
      },
      {
        key: "plan",
        header: "Plan",
        filterable: true,
        render: (u) => (
          <span
            className={`rounded-md px-2 py-0.5 text-xs ${
              u.plan === "PRO" ? "bg-[#059F6D]/15 text-[#059F6D]" : "bg-white/10 text-white/50"
            }`}
          >
            {u.plan}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <DataTable
        title={title ?? "Users"}
        noun="users"
        rows={rows}
        columns={columns}
        getRowKey={(u) => u.id}
        loading={loading}
        error={error}
        headerRight={
          <div className="flex items-center gap-2">
            <Select
              theme="dark"
              size="sm"
              aria-label="Bulk import role"
              className="min-w-[120px]"
              value={bulkRoleSel}
              onChange={(v) => setBulkRoleSel(v as ImportRole)}
              options={BULK_ROLE_OPTIONS}
            />
            <button
              onClick={() => setBulkOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5"
            >
              <Upload size={15} /> Bulk import
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-lg bg-[#059F6D] px-4 py-2.5 text-sm font-bold text-white"
            >
              <Plus size={16} /> Create account
            </button>
          </div>
        }
        actions={(u) => (
          <div className="flex items-center justify-end gap-2">
            <Button iconOnly size="sm" variant="tertiary" tone="onDark" aria-label="Edit" onClick={() => setEditing(u)}>
              <Pencil size={15} />
            </Button>
            <Button iconOnly size="sm" variant="destructive" tone="onDark" aria-label="Delete" onClick={() => handleDelete(u)}>
              <Trash2 size={15} />
            </Button>
          </div>
        )}
      />

      {showCreate && (
        <CreateAccountModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}
      {bulkOpen && (
        <BulkImportModal
          role={bulkRoleSel}
          onClose={() => setBulkOpen(false)}
          onDone={load}
        />
      )}
      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);
  const [plan, setPlan] = useState<Plan>(user.plan);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const inputCls =
    "w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-[#059F6D] focus:outline-none";
  const labelCls =
    "block text-[9px] font-bold uppercase tracking-[0.22em] text-white/40 mb-1.5";

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      await updateUser(user.id, { username, email, role, plan });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update user");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#13283a] p-6 shadow-2xl">
        <h2 className="text-lg font-bold mb-5">Edit user</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Username</label>
            <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Role</label>
              <Select
                theme="dark"
                size="lg"
                aria-label="Role"
                value={role}
                onChange={(v) => setRole(v as Role)}
                options={ROLE_OPTIONS}
              />
            </div>
            <div>
              <label className={labelCls}>Plan</label>
              <Select
                theme="dark"
                size="lg"
                aria-label="Plan"
                value={plan}
                onChange={(v) => setPlan(v as Plan)}
                options={PLAN_OPTIONS}
              />
            </div>
          </div>
          {error ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
              {error}
            </div>
          ) : null}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="tertiary" tone="onDark" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" tone="onDark" loading={saving} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
