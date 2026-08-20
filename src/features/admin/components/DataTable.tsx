"use client";

import { ReactNode, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Select } from "@/components/ui/Select";

export interface Column<T> {
  key: string;
  header: string;
  /**
   * Plain text for this cell — drives global search, the filter dropdown, and
   * (when `render` is omitted) the displayed value. Defaults to row[key].
   * Keep it equal to what the user sees so search/filter match the screen.
   */
  accessor?: (row: T) => string | number | null | undefined;
  /** Custom cell renderer (badges/buttons). `accessor` still drives search/filter. */
  render?: (row: T) => ReactNode;
  /**
   * Show a filter dropdown for this column. Opt-in — only meaningful for
   * categorical fields (Role, Status, Board, …), never for free-text like
   * name/email (those are covered by the global search).
   */
  filterable?: boolean;
  align?: "left" | "right";
}

interface DataTableProps<T> {
  title: string;
  rows: T[];
  columns: Column<T>[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  error?: string;
  actions?: (row: T) => ReactNode;
  headerRight?: ReactNode;
  noun?: string;
}

function cellText<T>(row: T, col: Column<T>): string {
  const v = col.accessor ? col.accessor(row) : (row as Record<string, unknown>)[col.key];
  return v == null ? "" : String(v);
}

export function DataTable<T>({
  title,
  rows,
  columns,
  getRowKey,
  loading,
  error,
  actions,
  headerRight,
  noun = "records",
}: DataTableProps<T>) {
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filterCols = useMemo(() => columns.filter((c) => c.filterable), [columns]);

  const distinct = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const c of filterCols) {
      map[c.key] = Array.from(
        new Set(rows.map((r) => cellText(r, c)).filter((v) => v !== "")),
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
    return map;
  }, [rows, filterCols]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      for (const c of filterCols) {
        const sel = filters[c.key];
        if (sel && cellText(r, c) !== sel) return false;
      }
      if (!needle) return true;
      // Global search across EVERY column's visible text.
      return columns.some((c) => cellText(r, c).toLowerCase().includes(needle));
    });
  }, [rows, q, filters, columns, filterCols]);

  const activeFilters = Object.values(filters).filter(Boolean).length;
  const colCount = columns.length + (actions ? 1 : 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-white/40">
            {filtered.length} of {rows.length} {noun}
          </p>
        </div>
        {headerRight}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search any field…"
            className="w-full rounded-lg border border-white/15 bg-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-[#059F6D] focus:outline-none"
          />
        </div>
        {filterCols.map((c) => (
          <Select
            key={c.key}
            theme="dark"
            variant="filter"
            panelWidth={220}
            className="min-w-[160px]"
            aria-label={`Filter by ${c.header}`}
            value={filters[c.key] ?? ""}
            onChange={(v) => setFilters((f) => ({ ...f, [c.key]: v }))}
            options={[
              { value: "", label: `${c.header}: All` },
              ...(distinct[c.key] ?? []).map((v) => ({ value: v, label: v })),
            ]}
            buttonStyle={
              filters[c.key]
                ? {
                    borderColor: "rgba(5,159,109,0.6)",
                    background: "rgba(5,159,109,0.10)",
                    color: "#059F6D",
                  }
                : undefined
            }
          />
        ))}
        {(activeFilters > 0 || q) && (
          <button
            onClick={() => {
              setQ("");
              setFilters({});
            }}
            className="rounded-lg border border-white/15 px-3 py-2.5 text-sm text-white/60 hover:bg-white/5"
          >
            Clear{activeFilters > 0 ? ` (${activeFilters})` : ""}
          </button>
        )}
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300 mb-4">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-white/40 text-xs uppercase tracking-wider">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-3 font-semibold ${c.align === "right" ? "text-right" : "text-left"}`}
                >
                  {c.header}
                </th>
              ))}
              {actions ? <th className="px-4 py-3 text-right font-semibold">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-white/40">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-white/40">
                  No {noun} found.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={getRowKey(row)} className="hover:bg-white/[0.02]">
                  {columns.map((c, i) => (
                    <td
                      key={c.key}
                      className={`px-4 py-3 ${i === 0 ? "font-medium text-white" : "text-white/60"} ${
                        c.align === "right" ? "text-right" : ""
                      }`}
                    >
                      {c.render ? c.render(row) : cellText(row, c) || "—"}
                    </td>
                  ))}
                  {actions ? <td className="px-4 py-3 text-right">{actions(row)}</td> : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
