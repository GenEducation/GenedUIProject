"use client";

import { ReactNode, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search, X } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "./ui/PageHeader";
import { EmptyState, ErrorNote } from "./ui/EmptyState";
import { SegmentedTabs } from "./ui/SegmentedTabs";
import { CARD_SHADOW } from "./ui/fields";
import { useMediaQuery } from "./ui/useMediaQuery";

export interface Column<T> {
  key: string;
  header: string;
  /**
   * Plain text for this cell — drives global search, the filter dropdown,
   * sorting, and (when `render` is omitted) the displayed value. Defaults to
   * row[key]. Keep it equal to what the user sees so search/filter match the
   * screen.
   */
  accessor?: (row: T) => string | number | null | undefined;
  /** Custom cell renderer (badges/buttons). `accessor` still drives search/filter/sort. */
  render?: (row: T) => ReactNode;
  /**
   * Show a filter dropdown for this column. Opt-in — only meaningful for
   * categorical fields (Role, Status, Board, …), never for free-text like
   * name/email (those are covered by the global search).
   */
  filterable?: boolean;
  align?: "left" | "right";
  /** Default true. Columns whose text says nothing in order (actions, mixed labels) opt out. */
  sortable?: boolean;
  /**
   * The narrowest table layout this column still earns its width at. Below it
   * the column is dropped from the table (it stays in search, and in the
   * phone card). Unset = always shown.
   */
  minWidth?: "lg" | "xl" | "2xl";
}

/**
 * The one split of the list worth a row of tabs (role, status). Counts come
 * from the rows, so a tab never promises more than the list holds.
 */
export interface TableTabs<T> {
  label: string;
  accessor: (row: T) => string;
  /** Tab order; values not listed follow, alphabetically. */
  order?: string[];
  /** Display name for a value, when the raw one is SHOUTY. */
  format?: (value: string) => string;
  /** Selected on first render (e.g. from a link off the Overview). */
  initial?: string;
  /** The value whose tab is the call to action (e.g. "PENDING"); its count is drawn in citron. */
  highlight?: string;
}

interface DataTableProps<T> {
  title: string;
  subtitle?: ReactNode;
  rows: T[];
  columns: Column<T>[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  error?: string;
  actions?: (row: T) => ReactNode;
  headerRight?: ReactNode;
  noun?: string;
  tabs?: TableTabs<T>;
  /** Shown instead of the generic "No … found" when the list itself is empty (not filtered empty). */
  emptyState?: ReactNode;
  /** A notice between the header and the table (truncation warnings and the like). */
  banner?: ReactNode;
  /** Initial filter selections, keyed by column key. */
  initialFilters?: Record<string, string>;
}

const PAGE_SIZES = [25, 50, 100];

const HIDE_BELOW: Record<NonNullable<Column<unknown>["minWidth"]>, string> = {
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
  "2xl": "hidden 2xl:table-cell",
};

function cellText<T>(row: T, col: Column<T>): string {
  const v = col.accessor ? col.accessor(row) : (row as Record<string, unknown>)[col.key];
  return v == null ? "" : String(v);
}

function compareText(a: string, b: string): number {
  // Blanks last, whichever way the column is sorted.
  if (a === "" && b === "") return 0;
  if (a === "") return 1;
  if (b === "") return -1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function DataTable<T>({
  title,
  subtitle,
  rows: rowsProp,
  columns,
  getRowKey,
  loading,
  error,
  actions,
  headerRight,
  noun = "records",
  tabs,
  emptyState,
  banner,
  initialFilters,
}: DataTableProps<T>) {
  // A backend that answers with the wrong shape must not take the screen down
  // with it — say so, and render an empty list.
  const shapeOk = Array.isArray(rowsProp);
  const rows = useMemo(() => (shapeOk ? rowsProp : []), [shapeOk, rowsProp]);
  const shownError =
    error || (!shapeOk && !loading ? `The server returned ${noun} in an unexpected format.` : "");

  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters ?? {});
  const [tab, setTab] = useState(tabs?.initial ?? "");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [page, setPage] = useState(0);
  const isTable = useMediaQuery("(min-width: 768px)", true);

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

  const tabList = useMemo(() => {
    if (!tabs) return null;
    const counts = new Map<string, number>();
    for (const r of rows) {
      const v = tabs.accessor(r);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const order = tabs.order ?? [];
    const values = [
      ...order.filter((v) => counts.has(v)),
      ...[...counts.keys()].filter((v) => !order.includes(v)).sort(),
    ];
    return [
      { value: "", label: "All", count: rows.length },
      ...values.map((v) => ({
        value: v,
        label: tabs.format ? tabs.format(v) : v,
        count: counts.get(v),
        highlight: v === tabs.highlight,
      })),
    ];
  }, [rows, tabs]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (tabs && tab && tabs.accessor(r) !== tab) return false;
      for (const c of filterCols) {
        const sel = filters[c.key];
        if (sel && cellText(r, c) !== sel) return false;
      }
      if (!needle) return true;
      // Global search across EVERY column's visible text.
      return columns.some((c) => cellText(r, c).toLowerCase().includes(needle));
    });
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        const sign = sort.dir === "asc" ? 1 : -1;
        out.sort((a, b) => {
          const ta = cellText(a, col);
          const tb = cellText(b, col);
          if (ta === "" || tb === "") return compareText(ta, tb);
          return sign * compareText(ta, tb);
        });
      }
    }
    return out;
  }, [rows, q, filters, columns, filterCols, sort, tabs, tab]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Clamped rather than reset in an effect: narrowing a filter while on page 4
  // lands on the last page that exists.
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const activeFilters = Object.values(filters).filter(Boolean).length;

  const toggleSort = (key: string) => {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const clearAll = () => {
    setQ("");
    setFilters({});
    setPage(0);
  };

  const listEmpty = !loading && rows.length === 0;

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={
          <>
            {subtitle ? <span className="mr-1">{subtitle}</span> : null}
            <span className="tabular-nums">
              {filtered.length} of {rows.length} {noun}
            </span>
          </>
        }
        actions={headerRight}
      />

      {banner ? <div className="mb-4">{banner}</div> : null}
      {shownError ? <div className="mb-4"><ErrorNote>{shownError}</ErrorNote></div> : null}

      <section className={`rounded-2xl border border-border bg-white ${CARD_SHADOW}`}>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border p-3 sm:p-4">
          {tabList && tabList.length > 2 ? (
            <SegmentedTabs
              label={tabs!.label}
              tabs={tabList}
              value={tab}
              onChange={(v) => {
                setTab(v);
                setPage(0);
              }}
            />
          ) : null}
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder="Search any field…"
                aria-label={`Search ${noun}`}
                className="h-10 w-full rounded-[11px] border border-border bg-paper pl-10 pr-9 text-sm text-ink placeholder:text-muted-light transition-colors focus:border-emerald focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald/15"
              />
              {q ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQ("")}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            {filterCols.length > 0 || !isTable || activeFilters > 0 || q ? (
              <div
                className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5 lg:overflow-visible"
                style={{ scrollbarWidth: "none" }}
              >
                {filterCols.map((c) => (
                  <Select
                    key={c.key}
                    variant="filter"
                    panelWidth={220}
                    className="min-w-[150px] shrink-0"
                    aria-label={`Filter by ${c.header}`}
                    value={filters[c.key] ?? ""}
                    onChange={(v) => {
                      setFilters((f) => ({ ...f, [c.key]: v }));
                      setPage(0);
                    }}
                    options={[
                      { value: "", label: `${c.header}: All` },
                      ...(distinct[c.key] ?? []).map((v) => ({ value: v, label: v })),
                    ]}
                    buttonStyle={
                      filters[c.key]
                        ? {
                            borderColor: "var(--emerald)",
                            background: "var(--emerald-50)",
                            color: "var(--emerald)",
                          }
                        : undefined
                    }
                  />
                ))}
                {!isTable ? (
                  // No headers to click on a phone, so sorting gets its own control.
                  <Select
                    variant="filter"
                    panelWidth={220}
                    className="min-w-[150px] shrink-0"
                    aria-label="Sort"
                    value={sort ? `${sort.key}:${sort.dir}` : ""}
                    onChange={(v) => {
                      if (!v) return setSort(null);
                      const [key, dir] = v.split(":");
                      setSort({ key, dir: dir as "asc" | "desc" });
                    }}
                    options={[
                      { value: "", label: "Sort: Default" },
                      ...columns
                        .filter((c) => c.sortable !== false)
                        .flatMap((c) => [
                          { value: `${c.key}:asc`, label: `${c.header} ↑` },
                          { value: `${c.key}:desc`, label: `${c.header} ↓` },
                        ]),
                    ]}
                  />
                ) : null}
                {activeFilters > 0 || q ? (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-emerald hover:bg-emerald-50"
                  >
                    <X size={14} />
                    Clear{activeFilters > 0 ? ` (${activeFilters})` : ""}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="p-3 sm:p-4" aria-busy="true">
            <span className="sr-only">Loading…</span>
            <div className="space-y-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-xl bg-emerald/[0.06]" />
              ))}
            </div>
          </div>
        ) : listEmpty && emptyState ? (
          emptyState
        ) : filtered.length === 0 ? (
          <EmptyState
            bare
            icon={Search}
            title={`No ${noun} found.`}
            body={rows.length ? "Nothing matches the current search and filters." : undefined}
            action={
              rows.length && (activeFilters > 0 || q || tab) ? (
                <button
                  type="button"
                  onClick={() => {
                    clearAll();
                    setTab("");
                  }}
                  className="text-sm font-bold text-emerald hover:underline"
                >
                  Clear search and filters
                </button>
              ) : undefined
            }
          />
        ) : isTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {columns.map((c) => {
                    const sortable = c.sortable !== false;
                    const dir = sort?.key === c.key ? sort.dir : null;
                    return (
                      <th
                        key={c.key}
                        scope="col"
                        aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined}
                        className={`whitespace-nowrap px-4 py-3 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted first:pl-5 ${
                          c.align === "right" ? "text-right" : "text-left"
                        } ${c.minWidth ? HIDE_BELOW[c.minWidth] : ""}`}
                      >
                        {sortable ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(c.key)}
                            className={`inline-flex items-center gap-1 uppercase transition-colors hover:text-ink ${
                              dir ? "text-ink" : ""
                            } ${c.align === "right" ? "flex-row-reverse" : ""}`}
                          >
                            {c.header}
                            {dir === "asc" ? (
                              <ArrowUp size={12} />
                            ) : dir === "desc" ? (
                              <ArrowDown size={12} />
                            ) : (
                              <ChevronsUpDown size={12} className="opacity-40" />
                            )}
                          </button>
                        ) : (
                          c.header
                        )}
                      </th>
                    );
                  })}
                  {actions ? (
                    <th scope="col" className="px-4 py-3 pr-5 text-right text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
                      Actions
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {visible.map((row) => (
                  <tr key={getRowKey(row)} className="transition-colors hover:bg-paper">
                    {columns.map((c, i) => (
                      <td
                        key={c.key}
                        className={`px-4 py-3 align-middle first:pl-5 ${
                          i === 0 ? "font-bold text-ink" : "text-ink/75"
                        } ${c.align === "right" ? "text-right tabular-nums" : ""} ${
                          c.minWidth ? HIDE_BELOW[c.minWidth] : ""
                        }`}
                      >
                        {c.render ? c.render(row) : cellText(row, c) || <span className="text-muted-light">—</span>}
                      </td>
                    ))}
                    {actions ? <td className="px-4 py-2 pr-5 text-right">{actions(row)}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Phone: one card per row. The lead column is the card's title; the
          // rest become label/value pairs so nothing needs a sideways scroll.
          <ul className="divide-y divide-border/70">
            {visible.map((row) => {
              const [lead, ...rest] = columns;
              return (
                <li key={getRowKey(row)} className="px-4 py-4">
                  <div className="min-w-0 font-bold text-ink">
                    {lead.render ? lead.render(row) : cellText(row, lead) || "—"}
                  </div>
                  {rest.length ? (
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                      {rest.map((c) => (
                        <div key={c.key} className="min-w-0">
                          <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{c.header}</dt>
                          <dd className="mt-0.5 break-words text-[13px] text-ink/80">
                            {c.render ? c.render(row) : cellText(row, c) || <span className="text-muted-light">—</span>}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {actions ? (
                    <div className="mt-3 flex justify-end border-t border-dashed border-border pt-3">{actions(row)}</div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer: paging */}
        {!loading && filtered.length > PAGE_SIZES[0] ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px] text-muted sm:px-5">
            <span className="tabular-nums">
              {currentPage * pageSize + 1}–{Math.min(filtered.length, (currentPage + 1) * pageSize)} of{" "}
              {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <label className="hidden items-center gap-2 sm:flex">
                Rows
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                  className="h-8 rounded-lg border border-border bg-paper px-2 text-[13px] font-bold text-ink focus:outline-none focus:ring-2 focus:ring-emerald/15"
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                aria-label="Previous page"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink hover:bg-paper disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[4.5rem] text-center tabular-nums">
                {currentPage + 1} / {pageCount}
              </span>
              <button
                type="button"
                aria-label="Next page"
                disabled={currentPage >= pageCount - 1}
                onClick={() => setPage(currentPage + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink hover:bg-paper disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
