"use client";

/**
 * The mode-independent fleet table: every physical device, one row each.
 *
 * WHY THIS IS NOT `DataTable`. `DataTable` filters, searches and sorts the array
 * it is handed, which is correct when the caller holds the whole dataset. Here
 * the server holds it and sends one page, so a client-side search box would
 * silently search only the 25 rows on screen and an operator would conclude a
 * device does not exist. Every control below sends a query instead.
 *
 * WHY IT IS NOT THE LAB TABLE EITHER. The table above this one lists Lab
 * ENROLLMENTS, so it can only ever show SCHOOL_LAB units and it keys on
 * tenancy — school, lab, spare, revoked. This one lists HARDWARE: PERSONAL
 * devices, units still in their box, and legacy devices with no canonical
 * registry row at all. Both are kept because both questions get asked.
 *
 * THE ONE RULE THIS COMPONENT ENFORCES: it computes nothing. Connectivity,
 * freshness, the verdict and the attention flag all arrive decided, and every
 * threshold arrives with them (`fresh_after_seconds`, `report_interval_seconds`,
 * `grace_seconds`). There is no local constant to drift out of step with the
 * backend — which is exactly what the Lab surface's hardcoded 10-minute
 * staleness window did against a 15-minute server.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, RefreshCw, Search, TriangleAlert } from "lucide-react";

import { Select } from "@/components/ui/Select";
import { getFleetDeviceStats, listFleetRegistryDevices } from "../adminService";
import {
  ATTENTION_LABELS,
  CONNECTIVITY_REASONS,
  CONNECTIVITY_SHORT,
  CONNECTIVITY_STYLES,
  DiagnosticBadge,
  FRESHNESS_SHORT,
  FRESHNESS_STYLES,
  PROVENANCE_SHORT,
  RECORD_HINTS,
  RECORD_LABELS,
  cadenceLabel,
} from "../devices/canonicalBadges";
import type {
  FleetDeviceQuery,
  FleetDeviceRow,
  FleetSort,
  FleetStats,
  PaginatedFleet,
} from "../devices/types";
import { relativeTime } from "./deviceHealth";

const PILL = "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs whitespace-nowrap";

const SORTS: { value: FleetSort; label: string }[] = [
  { value: "attention", label: "Sort: Problems first" },
  { value: "last_seen", label: "Sort: Least recently seen" },
  { value: "verdict", label: "Sort: Worst verdict" },
  { value: "freshness", label: "Sort: Oldest data" },
  { value: "connectivity", label: "Sort: Unreachable first" },
  { value: "identity", label: "Sort: Serial" },
];

/**
 * Filter option lists. Every `value: ""` entry means "do not send this filter",
 * which is NOT the same as sending a false — `needs_attention=false` is a real
 * query for "only the calm ones".
 */
const CONNECTIVITY_OPTIONS = [
  { value: "", label: "Connectivity: any" },
  { value: "ONLINE", label: "Online" },
  { value: "OFFLINE", label: "Offline" },
  { value: "UNKNOWN", label: "Unknown" },
];

const FRESHNESS_OPTIONS = [
  { value: "", label: "Data age: any" },
  { value: "FRESH", label: "Fresh" },
  { value: "STALE", label: "Stale" },
  { value: "NEVER_REPORTED", label: "Never reported" },
];

const VERDICT_OPTIONS = [
  { value: "", label: "Verdict: any" },
  { value: "FAIL", label: "FAIL" },
  { value: "WARN", label: "WARN" },
  { value: "UNKNOWN", label: "UNKNOWN" },
  { value: "PASS", label: "PASS" },
  { value: "NONE", label: "No report yet" },
];

const RECORD_OPTIONS = [
  { value: "", label: "Record: any" },
  { value: "CANONICAL", label: "Registered" },
  { value: "LEGACY_LAB", label: "Lab only" },
  { value: "LEGACY_PERSONAL", label: "MQTT only" },
];

const PROVENANCE_OPTIONS = [
  { value: "", label: "Provenance: any" },
  { value: "PRE_PROVISIONED", label: "Pre-registered" },
  { value: "SELF_REGISTERED", label: "Self-registered" },
  { value: "ENROLLED", label: "Enrolled" },
];

const ATTENTION_OPTIONS = [
  { value: "", label: "Attention: any" },
  { value: "true", label: "Needs attention" },
  { value: "false", label: "No attention needed" },
];

function Tile({
  label,
  value,
  sub,
  accent = "neutral",
  floor = false,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: "neutral" | "good" | "warn" | "bad";
  /**
   * The server capped its scan, so this count is a lower bound. Rendered as
   * "N+" because a tile that shows a bare number IS a claim to have counted the
   * fleet, and an operator cannot tell a capped 6 from a complete one.
   */
  floor?: boolean;
}) {
  const valueColor = {
    neutral: "text-white",
    good: "text-[#059F6D]",
    warn: "text-amber-300",
    bad: "text-rose-300",
  }[accent];

  return (
    <div
      data-fleet-tile={label}
      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
    >
      <div className={`text-2xl font-bold ${valueColor}`}>
        {floor ? `${value}+` : value}
      </div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/40">
        {label}
      </div>
      {sub ? <div className="mt-0.5 text-[11px] text-white/30">{sub}</div> : null}
    </div>
  );
}

/** Reachability. Separate from everything else, and never inferred from report age. */
function ConnectivityCell({ row }: { row: FleetDeviceRow }) {
  const { connectivity: c } = row;
  const reason = c.reason ? CONNECTIVITY_REASONS[c.reason] ?? c.reason : null;

  return (
    <div>
      <span
        aria-label={`Connectivity: ${c.state}`}
        title={reason ?? undefined}
        className={`${PILL} ${CONNECTIVITY_STYLES[c.state]}`}
      >
        {CONNECTIVITY_SHORT[c.state]}
      </span>
      <div className="mt-0.5 text-[11px] text-white/30">
        {c.source === "NONE" ? "no presence channel" : c.source}
      </div>
    </div>
  );
}

/**
 * Verdict and data age together in one cell but as two separate chips.
 *
 * Adjacent, never merged. "PASS but three hours old" is a working device with a
 * broken reporting pipeline, and one combined chip would have to pick a side and
 * would lose whichever it dropped.
 */
function DiagnosticCell({ row }: { row: FleetDeviceRow }) {
  return (
    <div className="flex flex-col gap-1">
      {row.diagnostic_verdict ? (
        <DiagnosticBadge
          status={row.diagnostic_verdict}
          label={`Verdict: ${row.diagnostic_verdict}`}
        />
      ) : (
        <span className="text-[11px] text-white/30">No report yet</span>
      )}
      <span
        aria-label={`Data age: ${row.diagnostic_freshness}`}
        title={cadenceLabel(row.report_interval_seconds)}
        className={`${PILL} ${FRESHNESS_STYLES[row.diagnostic_freshness]}`}
      >
        {FRESHNESS_SHORT[row.diagnostic_freshness]}
      </span>
      {row.report_age_seconds !== null ? (
        <span className="text-[11px] text-white/30">
          {relativeTime(row.received_at)}
        </span>
      ) : null}
    </div>
  );
}

function AttentionCell({ row }: { row: FleetDeviceRow }) {
  if (!row.needs_attention) {
    return <span className="text-[11px] text-white/25">—</span>;
  }
  return (
    <div className="flex flex-col gap-1">
      {row.attention_reasons.map((reason) => (
        <span
          key={reason}
          className={`${PILL} bg-rose-500/15 text-rose-300`}
          data-attention-reason={reason}
        >
          <TriangleAlert size={12} />
          {ATTENTION_LABELS[reason] ?? reason}
        </span>
      ))}
    </div>
  );
}

/**
 * Identity. The serial is canonical and everything else on this cell is an alias.
 *
 * A legacy row genuinely has no serial, so it says "no serial yet" rather than
 * showing a `hardware_id` in the serial's place — presenting a mutable alias as
 * identity is the specific mistake the whole registry exists to prevent.
 */
function IdentityCell({ row }: { row: FleetDeviceRow }) {
  const alias = row.reported_device_id ?? row.lab_hardware_id ?? row.derived_device_key;
  return (
    <div className="min-w-0">
      <div className="truncate font-medium text-white">
        {row.label ?? alias ?? row.serial ?? "Unnamed device"}
      </div>
      <div className="font-mono text-[11px] text-white/35">
        {row.serial ?? (
          <span
            className="not-italic text-amber-200/70"
            title={RECORD_HINTS[row.record]}
          >
            no serial yet
          </span>
        )}
      </div>
      {row.serial && alias && alias !== row.label ? (
        <div className="truncate font-mono text-[11px] text-white/25">{alias}</div>
      ) : null}
    </div>
  );
}

export function FleetTable() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [record, setRecord] = useState("");
  const [provenance, setProvenance] = useState("");
  const [connectivity, setConnectivity] = useState("");
  const [freshness, setFreshness] = useState("");
  const [verdict, setVerdict] = useState("");
  const [attention, setAttention] = useState("");
  const [includeRevoked, setIncludeRevoked] = useState(false);
  const [sort, setSort] = useState<FleetSort>("attention");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PaginatedFleet | null>(null);
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * The search term this debounce has already applied.
   *
   * Without it the timer fires once on mount and resets the page, so an operator
   * who pages forward within the debounce window is silently yanked back to page
   * 1. Comparing against the applied value makes the reset happen only when the
   * term genuinely changed -- which is the case that should reset it.
   */
  const appliedSearch = useRef("");

  // Debounced so each keystroke is not a request. What is debounced is the round
  // trip, not the correctness: the server still does all the matching.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = q.trim();
      if (next === appliedSearch.current) return;
      appliedSearch.current = next;
      setSearch(next);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const query: FleetDeviceQuery = useMemo(
    () => ({
      ...(search ? { q: search } : {}),
      ...(record ? { record: record as FleetDeviceQuery["record"] } : {}),
      ...(provenance
        ? { provenance: provenance as FleetDeviceQuery["provenance"] }
        : {}),
      ...(connectivity
        ? { connectivity: connectivity as FleetDeviceQuery["connectivity"] }
        : {}),
      ...(freshness ? { freshness: freshness as FleetDeviceQuery["freshness"] } : {}),
      ...(verdict ? { verdict: verdict as FleetDeviceQuery["verdict"] } : {}),
      // "" means do not filter; "false" is a real query for the calm devices.
      ...(attention ? { needs_attention: attention === "true" } : {}),
      include_revoked: includeRevoked,
      sort,
      page,
    }),
    [
      search,
      record,
      provenance,
      connectivity,
      freshness,
      verdict,
      attention,
      includeRevoked,
      sort,
      page,
    ],
  );

  /**
   * Monotonic request id. A slower response to an older query must never
   * overwrite a newer one — without this, typing in the search box can leave the
   * table showing results for a prefix of what is in the input.
   */
  const generation = useRef(0);

  const load = useCallback(
    async (isRefresh: boolean) => {
      const mine = ++generation.current;
      if (isRefresh) setRefreshing(true);
      try {
        const [rows, tiles] = await Promise.all([
          listFleetRegistryDevices(query),
          // Unfiltered and fleet-wide, so a filter change does not move the
          // tiles. Tolerated as null rather than failing the table with it.
          getFleetDeviceStats().catch(() => null),
        ]);
        if (mine !== generation.current) return;
        setData(rows);
        if (tiles) setStats(tiles);
        setError("");
      } catch (e) {
        if (mine !== generation.current) return;
        setError(e instanceof Error ? e.message : "Failed to load the fleet");
      } finally {
        if (mine === generation.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [query],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.page_size ?? 25;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Fleet — all devices</h2>
          <p className="text-sm text-white/40">
            Every physical unit, in any mode: lab, personal, pre-registered and
            not-yet-reporting.
            {data ? ` ${cadenceLabel(data.report_interval_seconds)}.` : ""}
          </p>
        </div>
        <button
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : undefined} />
          Refresh
        </button>
      </div>

      {/*
        Each payload carries its own truncation flag and they legitimately
        disagree: the list query pushes the search into SQL, so a narrow term
        returns an exact answer, while the stats query is fleet-wide by design
        and stays capped. Reading only `data.truncated` would therefore show six
        capped tiles as exact counts the moment someone typed in the search box.
      */}
      {data?.truncated || stats?.truncated ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            This fleet is larger than the server will scan in one request, so the
            counts marked “+” are floors rather than totals. Narrow the search to
            get an exact answer for the table.
          </span>
        </div>
      ) : null}

      {stats ? (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <Tile
            label="Fleet size"
            value={stats.total}
            sub={`${stats.revoked} revoked enrollment${stats.revoked === 1 ? "" : "s"}`}
            floor={stats.truncated}
          />
          <Tile
            label="Needs attention"
            value={stats.needs_attention}
            sub="Diagnostic only"
            accent={stats.needs_attention > 0 ? "bad" : "good"}
            floor={stats.truncated}
          />
          <Tile
            label="Online"
            value={stats.by_connectivity.ONLINE ?? 0}
            sub="Confirmed by a transport"
            accent="good"
            floor={stats.truncated}
          />
          {/*
            Offline gets its own tile precisely BECAUSE needs_attention excludes
            connectivity. A classroom is offline every evening, so folding it
            into attention would flag the fleet nightly and mean nothing — but
            that decision is only safe if the count stays visible on its own.
          */}
          <Tile
            label="Offline"
            value={stats.by_connectivity.OFFLINE ?? 0}
            sub="Not counted as attention"
            accent="warn"
            floor={stats.truncated}
          />
          <Tile
            label="Unknown reach"
            value={stats.by_connectivity.UNKNOWN ?? 0}
            sub="No presence channel"
            accent="warn"
            floor={stats.truncated}
          />
          <Tile
            label="Never reported"
            value={stats.by_freshness.NEVER_REPORTED ?? 0}
            sub="Boxed or legacy firmware"
            floor={stats.truncated}
          />
          <Tile
            label="No serial yet"
            value={
              (stats.by_record.LEGACY_LAB ?? 0) + (stats.by_record.LEGACY_PERSONAL ?? 0)
            }
            sub="Awaiting first gened-health"
            accent="warn"
            floor={stats.truncated}
          />
        </div>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              aria-label="Search the fleet"
              placeholder="Serial, device id, hardware id or label"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-transparent py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/25"
            />
          </div>
          <Select
            theme="dark"
            aria-label="Filter by connectivity"
            value={connectivity}
            onChange={(v) => {
              setConnectivity(v);
              setPage(1);
            }}
            options={CONNECTIVITY_OPTIONS}
          />
          <Select
            theme="dark"
            aria-label="Filter by data age"
            value={freshness}
            onChange={(v) => {
              setFreshness(v);
              setPage(1);
            }}
            options={FRESHNESS_OPTIONS}
          />
          <Select
            theme="dark"
            aria-label="Filter by verdict"
            value={verdict}
            onChange={(v) => {
              setVerdict(v);
              setPage(1);
            }}
            options={VERDICT_OPTIONS}
          />
          <Select
            theme="dark"
            aria-label="Filter by attention"
            value={attention}
            onChange={(v) => {
              setAttention(v);
              setPage(1);
            }}
            options={ATTENTION_OPTIONS}
          />
          <Select
            theme="dark"
            aria-label="Filter by record"
            value={record}
            onChange={(v) => {
              setRecord(v);
              setPage(1);
            }}
            options={RECORD_OPTIONS}
          />
          <Select
            theme="dark"
            aria-label="Filter by provenance"
            value={provenance}
            onChange={(v) => {
              setProvenance(v);
              setPage(1);
            }}
            options={PROVENANCE_OPTIONS}
          />
          <Select
            theme="dark"
            aria-label="Sort the fleet"
            className="min-w-[190px]"
            value={sort}
            onChange={(v) => {
              setSort(v as FleetSort);
              setPage(1);
            }}
            options={SORTS}
          />
          <label className="flex items-center gap-2 text-xs text-white/50">
            <input
              type="checkbox"
              checked={includeRevoked}
              onChange={(e) => {
                setIncludeRevoked(e.target.checked);
                setPage(1);
              }}
            />
            Show revoked
          </label>
        </div>

        {error ? (
          <p className="p-6 text-sm text-rose-300">{error}</p>
        ) : loading ? (
          <p className="p-6 text-sm text-white/40">Loading the fleet…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-white/40">No devices match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-white/35">
                <tr className="border-b border-white/10">
                  <th className="px-3 py-2 font-medium">Device</th>
                  <th className="px-3 py-2 font-medium">Mode</th>
                  <th className="px-3 py-2 font-medium">Registry</th>
                  <th className="px-3 py-2 font-medium">Connectivity</th>
                  <th className="px-3 py-2 font-medium">Last seen</th>
                  <th className="px-3 py-2 font-medium">Diagnostic</th>
                  <th className="px-3 py-2 font-medium">Firmware</th>
                  <th className="px-3 py-2 font-medium">Attention</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.fleet_key}
                    data-fleet-row={row.fleet_key}
                    className="border-b border-white/5 align-top last:border-0"
                  >
                    <td className="max-w-[220px] px-3 py-3">
                      <IdentityCell row={row} />
                      {row.revoked ? (
                        <span className={`${PILL} mt-1 bg-white/10 text-white/30`}>
                          Enrollment revoked
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      {row.last_reported_mode ? (
                        <span className="text-xs text-white/70">
                          {row.last_reported_mode}
                        </span>
                      ) : (
                        <span
                          className="text-[11px] text-white/25"
                          title="Mode is read from a gened-health report. This device has not sent one, and it is never inferred from which table the record lives in."
                        >
                          not reported
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-xs text-white/70">
                        {row.provenance ? PROVENANCE_SHORT[row.provenance] : "—"}
                      </div>
                      <div
                        className="mt-0.5 text-[11px] text-white/30"
                        title={RECORD_HINTS[row.record]}
                      >
                        {RECORD_LABELS[row.record]}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <ConnectivityCell row={row} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-xs text-white/70">
                        {relativeTime(row.last_seen_at)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-white/30">
                        {row.last_seen_source ?? "never"}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <DiagnosticCell row={row} />
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-white/60">
                      {row.firmware_version ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <AttentionCell row={row} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      {/*
                        Only Lab-enrolled units have a detail page today: it loads
                        from the Lab endpoint and keys on lab_devices.id. A
                        PERSONAL or pre-registered device has no such record, so
                        the link is omitted rather than pointed at a route that
                        would 404.
                      */}
                      {row.lab?.lab_device_id ? (
                        <button
                          onClick={() =>
                            router.push(
                              `/admin/devices/${encodeURIComponent(row.lab!.lab_device_id)}`,
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/5"
                        >
                          View <ChevronRight size={14} />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-3 text-xs text-white/40">
          <span>
            {total === 0
              ? "No devices"
              : `Showing ${from}–${to} of ${data?.truncated ? `${total}+` : total}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-white/15 px-2.5 py-1.5 text-white/70 enabled:hover:bg-white/5 disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {page} of {lastPage}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              className="rounded-md border border-white/15 px-2.5 py-1.5 text-white/70 enabled:hover:bg-white/5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
