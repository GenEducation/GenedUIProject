"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { listAgents, updateAgent, deleteAgent, AdminAgent } from "../adminService";
import { DataTable, Column } from "./DataTable";
import { EntityEditModal } from "./EntityEditModal";
import { Button } from "@/components/ui/Button";

export function AgentsView() {
  const [rows, setRows] = useState<AdminAgent[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminAgent | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listAgents()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load agents"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(
    async (a: AdminAgent) => {
      try {
        await updateAgent(a.id, { is_available: !a.is_available });
        load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update agent");
      }
    },
    [load],
  );

  const remove = useCallback(
    async (a: AdminAgent) => {
      if (!confirm(`Delete agent "${a.name}"?`)) return;
      try {
        await deleteAgent(a.id);
        load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete agent");
      }
    },
    [load],
  );

  const columns = useMemo<Column<AdminAgent>[]>(
    () => [
      { key: "name", header: "Name" },
      { key: "subject", header: "Subject", filterable: true },
      { key: "grade", header: "Grade", accessor: (a) => a.grade, filterable: true },
      {
        key: "owner_name",
        header: "Partner",
        accessor: (a) => a.owner_name ?? "GenEd (global)",
        filterable: true,
      },
      {
        key: "available",
        header: "Availability",
        accessor: (a) => (a.is_available ? "Available" : "Hidden"),
        filterable: true,
        render: (a) => (
          <button
            onClick={() => toggle(a)}
            className={`rounded-md px-2 py-0.5 text-xs ${
              a.is_available
                ? "bg-[#059F6D]/15 text-[#059F6D]"
                : "bg-white/10 text-white/50"
            }`}
          >
            {a.is_available ? "Available" : "Hidden"}
          </button>
        ),
      },
    ],
    [toggle],
  );

  return (
    <>
      <DataTable
        title="Agents"
        noun="master agents"
        rows={rows}
        columns={columns}
        getRowKey={(a) => a.id}
        loading={loading}
        error={error}
        actions={(a) => (
          <div className="flex items-center justify-end gap-2">
            <Button iconOnly size="sm" variant="tertiary" tone="onDark" aria-label="Edit" onClick={() => setEditing(a)}>
              <Pencil size={15} />
            </Button>
            <Button iconOnly size="sm" variant="destructive" tone="onDark" aria-label="Delete" onClick={() => remove(a)}>
              <Trash2 size={15} />
            </Button>
          </div>
        )}
      />
      {editing && (
        <EntityEditModal
          title={`Edit ${editing.name}`}
          initial={editing as unknown as Record<string, unknown>}
          fields={[{ key: "name", label: "Agent name" }]}
          onClose={() => setEditing(null)}
          onSave={async (vals) => {
            await updateAgent(editing.id, vals as { name?: string });
            load();
          }}
        />
      )}
    </>
  );
}
