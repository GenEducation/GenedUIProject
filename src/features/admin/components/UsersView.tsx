"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Upload, ChevronDown } from "lucide-react";
import { deleteUser, updateUser, AdminUser, Role, Plan, ImportRole } from "../adminService";
import { fetchAllUsers } from "../fetchAllUsers";
import { CreateAccountModal } from "./CreateAccountModal";
import { BulkImportModal } from "./BulkImportModal";
import { DataTable, Column } from "./DataTable";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Identity } from "./ui/Avatar";
import { StatusPill } from "./ui/StatusPill";
import { MenuButton } from "./ui/MenuButton";
import { FormModal } from "./ui/FormModal";
import { ADMIN_INPUT, ADMIN_LABEL, SECONDARY_ACTION } from "./ui/fields";

const toOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));
const BULK_ROLES: ImportRole[] = ["STUDENT", "PARENT", "PARTNER", "TEACHER"];
const ROLE_OPTIONS = toOptions(["STUDENT", "PARENT", "PARTNER", "TEACHER", "ADMIN"]);
const PLAN_OPTIONS = toOptions(["FREE", "PRO"]);
const ROLE_ORDER = ["STUDENT", "PARENT", "TEACHER", "PARTNER", "ADMIN"];

/** "STUDENT" → "Students", for tab labels. */
const rolePlural = (r: string) => `${r.charAt(0)}${r.slice(1).toLowerCase()}s`;

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
  const [bulkRole, setBulkRole] = useState<ImportRole | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    // Every column is searched and filtered client-side, so the screen wants
    // the whole list -- but it has to be PAGED for it. Asking for one huge
    // page worked only against the MVP, which did not enforce its own cap;
    // the new backend rejects anything over 200 with a 422.
    fetchAllUsers()
      .then((res) => setRows(res.users))
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
      {
        key: "username",
        header: "User",
        // Both lines are searchable, so the email column can go.
        accessor: (u) => `${u.username} ${u.email}`,
        render: (u) => <Identity primary={u.username} secondary={u.email} />,
      },
      {
        key: "role",
        header: "Role",
        render: (u) => <StatusPill tone={u.role === "ADMIN" ? "info" : "neutral"}>{u.role}</StatusPill>,
      },
      {
        key: "plan",
        header: "Plan",
        filterable: true,
        render: (u) => (
          <StatusPill tone={u.plan === "PRO" ? "brand" : "neutral"} dot={u.plan === "PRO"}>
            {u.plan}
          </StatusPill>
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
        tabs={{ label: "Filter by role", accessor: (u) => u.role, order: ROLE_ORDER, format: rolePlural }}
        headerRight={
          <>
            <MenuButton
              label="Bulk import"
              triggerClassName={SECONDARY_ACTION}
              trigger={
                <>
                  <Upload size={15} /> Bulk import <ChevronDown size={14} className="text-muted" />
                </>
              }
              items={BULK_ROLES.map((r) => ({
                label: `Import ${rolePlural(r).toLowerCase()}`,
                onSelect: () => setBulkRole(r),
              }))}
            />
            <Button leadingIcon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
              Create account
            </Button>
          </>
        }
        actions={(u) => (
          <div className="flex items-center justify-end gap-1">
            <Button iconOnly size="sm" variant="tertiary" aria-label="Edit" title="Edit user" onClick={() => setEditing(u)}>
              <Pencil size={15} />
            </Button>
            <Button iconOnly size="sm" variant="destructive" aria-label="Delete" title="Delete user" onClick={() => handleDelete(u)}>
              <Trash2 size={15} />
            </Button>
          </div>
        )}
      />

      {showCreate && (
        <CreateAccountModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}
      {bulkRole && (
        <BulkImportModal
          role={bulkRole}
          onClose={() => setBulkRole(null)}
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
    <FormModal
      title="Edit user"
      subtitle={user.username}
      onClose={onClose}
      onSubmit={save}
      submitting={saving}
      error={error}
    >
      <div>
        <label className={ADMIN_LABEL} htmlFor="edit-user-username">Username</label>
        <input id="edit-user-username" className={ADMIN_INPUT} value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div>
        <label className={ADMIN_LABEL} htmlFor="edit-user-email">Email</label>
        <input id="edit-user-email" className={ADMIN_INPUT} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={ADMIN_LABEL}>Role</label>
          <Select size="lg" aria-label="Role" value={role} onChange={(v) => setRole(v as Role)} options={ROLE_OPTIONS} />
        </div>
        <div>
          <label className={ADMIN_LABEL}>Plan</label>
          <Select size="lg" aria-label="Plan" value={plan} onChange={(v) => setPlan(v as Plan)} options={PLAN_OPTIONS} />
        </div>
      </div>
    </FormModal>
  );
}
