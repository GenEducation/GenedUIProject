"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, RefreshCw, TriangleAlert } from "lucide-react";

import { usePolling } from "@/hooks/usePolling";
import { getLabStats } from "../adminService";
import { fetchAllDevices, FLEET_FETCH_CAP } from "../devices/fetchAllDevices";
import type { AdminDeviceListItem, AdminLabStats } from "../devices/types";
import { Column, DataTable } from "./DataTable";
import {
  BySchoolChart,
  ChartCard,
  CHART_COLORS,
  DonutChart,
  FirmwareChart,
  type FirmwareRow,
  type StackedRow,
} from "./DeviceCharts";
import { Select } from "@/components/ui/Select";
import {
  ConnBadge,
  connLabel,
  deriveConn,
  deriveService,
  isHeartbeatStale,
  relativeTime,
  ServiceChip,
  serviceLabel,
  type ConnState,
} from "./deviceHealth";

interface FleetData {
  stats: AdminLabStats | null;
  devices: AdminDeviceListItem[];
  total: number;
  truncated: boolean;
}

/** Worst first — an admin opening this page is looking for problems. */
const CONN_RANK: Record<ConnState, number> = {
  NEEDS_ATTENTION: 0,
  STALE: 1,
  OFFLINE: 2,
  ONLINE: 3,
  REVOKED: 4,
};

type SortKey = "severity" | "last_seen" | "label" | "school";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "severity", label: "Sort: Problems first" },
  { value: "last_seen", label: "Sort: Least recently seen" },
  { value: "label", label: "Sort: Device name" },
  { value: "school", label: "Sort: School" },
];

function StatCard({
  label,
  value,
  sub,
  accent = "neutral",
  active,
  onClick,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: "neutral" | "good" | "warn" | "bad";
  active?: boolean;
  onClick?: () => void;
}) {
  const valueColor = {
    neutral: "text-white",
    good: "text-[#059F6D]",
    warn: "text-amber-300",
    bad: "text-rose-300",
  }[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-xl border p-4 text-left transition-colors ${
        active
          ? "border-[#059F6D]/60 bg-[#059F6D]/10"
          : "border-white/10 bg-white/[0.03] enabled:hover:bg-white/[0.06]"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/40">
        {label}
      </div>
      {sub ? <div className="mt-0.5 text-[11px] text-white/30">{sub}</div> : null}
    </button>
  );
}

export function DevicesView() {
  const router = useRouter();
  const [showRevoked, setShowRevoked] = useState(false);
  const [sort, setSort] = useState<SortKey>("severity");
  /** Set by clicking a KPI tile; filters the table to that cohort. */
  const [tile, setTile] = useState<string>("");

  const load = useCallback(async (): Promise<FleetData> => {
    // Revoked units are fetched up front so the "Show revoked" toggle is instant
    // and the revoked KPI reconciles against rows without a second round trip.
    const [statsResult, fleet] = await Promise.all([
      getLabStats().catch(() => null),
      fetchAllDevices({ include_revoked: true }),
    ]);
    return {
      stats: statsResult,
      devices: fleet.devices,
      total: fleet.total,
      truncated: fleet.truncated,
    };
  }, []);

  const { data, error, isLoading, isRefreshing, lastUpdatedAt, refresh } = usePolling(load);

  const devices = useMemo(() => data?.devices ?? [], [data]);
  const stats = data?.stats ?? null;

  // Counts computed from the rows on screen. These must reconcile with the
  // server's stats payload; where they can't (staleness), the tile wins.
  const local = useMemo(() => {
    const live = devices.filter((d) => !d.revoked_at);
    return {
      total: live.length,
      online: live.filter((d) => deriveConn(d) === "ONLINE").length,
      offline: live.filter((d) => d.health_status === "OFFLINE").length,
      needsAttention: live.filter((d) => d.health_status === "NEEDS_ATTENTION").length,
      stale: live.filter((d) => isHeartbeatStale(d)).length,
      revoked: devices.length - live.length,
      serviceRequired: live.filter((d) => deriveService(d) === "SERVICE_REQUIRED").length,
      unknown: live.filter((d) => deriveService(d) === "UNKNOWN").length,
      passing: live.filter((d) => deriveService(d) === "OK").length,
    };
  }, [devices]);

  const totalDevices = stats?.total_devices ?? local.total;
  const onlineCount = stats?.by_health_status?.ONLINE ?? local.online;
  const onlinePct = totalDevices > 0 ? Math.round((onlineCount / totalDevices) * 100) : 0;
  const serviceRequiredCount = stats?.service_required ?? local.serviceRequired;
  const unknownCount = stats?.self_test_unknown ?? local.unknown;
  const passingCount = stats
    ? Math.max(stats.total_devices - serviceRequiredCount - unknownCount, 0)
    : local.passing;

  const rows = useMemo(() => {
    let out = devices.filter((d) => (showRevoked ? true : !d.revoked_at));

    if (tile) {
      out = out.filter((d) => {
        switch (tile) {
          case "online":
            return deriveConn(d) === "ONLINE";
          case "offline":
            return !d.revoked_at && d.health_status === "OFFLINE";
          case "needs_attention":
            return !d.revoked_at && d.health_status === "NEEDS_ATTENTION";
          case "stale":
            return isHeartbeatStale(d);
          case "revoked":
            return !!d.revoked_at;
          case "service_required":
            return !d.revoked_at && deriveService(d) === "SERVICE_REQUIRED";
          case "unknown":
            return !d.revoked_at && deriveService(d) === "UNKNOWN";
          case "passing":
            return !d.revoked_at && deriveService(d) === "OK";
          default:
            return true;
        }
      });
    }

    const byLabel = (a: AdminDeviceListItem, b: AdminDeviceListItem) =>
      a.device_label.localeCompare(b.device_label, undefined, { numeric: true });

    return [...out].sort((a, b) => {
      switch (sort) {
        case "last_seen": {
          const ta = a.last_heartbeat_at ? Date.parse(a.last_heartbeat_at) : 0;
          const tb = b.last_heartbeat_at ? Date.parse(b.last_heartbeat_at) : 0;
          return ta - tb;
        }
        case "label":
          return byLabel(a, b);
        case "school":
          return (a.partner_organization ?? "").localeCompare(b.partner_organization ?? "") || byLabel(a, b);
        case "severity":
        default: {
          const rank = CONN_RANK[deriveConn(a)] - CONN_RANK[deriveConn(b)];
          if (rank !== 0) return rank;
          const svc =
            Number(deriveService(b) === "SERVICE_REQUIRED") -
            Number(deriveService(a) === "SERVICE_REQUIRED");
          if (svc !== 0) return svc;
          return byLabel(a, b);
        }
      }
    });
  }, [devices, showRevoked, tile, sort]);

  // ── Chart series (no server aggregate exists for these) ──────
  const connSlices = useMemo(
    () => [
      { name: "Online", value: local.online, color: CHART_COLORS.good },
      { name: "Stale", value: local.stale, color: CHART_COLORS.warn },
      { name: "Needs attention", value: local.needsAttention, color: CHART_COLORS.bad },
      { name: "Offline", value: local.offline, color: CHART_COLORS.muted },
      { name: "Revoked", value: local.revoked, color: "rgba(255,255,255,0.12)" },
    ],
    [local],
  );

  // Derived from the server totals when available, so the three slices always
  // sum to the fleet size the KPI tiles show.
  const serviceSlices = useMemo(
    () => [
      { name: "Passing", value: passingCount, color: CHART_COLORS.good },
      { name: "Service required", value: serviceRequiredCount, color: CHART_COLORS.bad },
      { name: "Unknown", value: unknownCount, color: CHART_COLORS.warn },
    ],
    [passingCount, serviceRequiredCount, unknownCount],
  );

  const bySchool: StackedRow[] = useMemo(() => {
    const map = new Map<string, StackedRow>();
    for (const d of devices) {
      if (d.revoked_at) continue;
      const label = d.partner_organization ?? "Unassigned";
      const row = map.get(label) ?? { label, healthy: 0, unhealthy: 0 };
      if (deriveConn(d) === "ONLINE") row.healthy += 1;
      else row.unhealthy += 1;
      map.set(label, row);
    }
    return [...map.values()]
      .sort((a, b) => b.healthy + b.unhealthy - (a.healthy + a.unhealthy))
      .slice(0, 10);
  }, [devices]);

  const firmware: FirmwareRow[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of devices) {
      if (d.revoked_at) continue;
      const key = d.firmware_version ?? "Unknown";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const modal = entries.find(([label]) => label !== "Unknown")?.[0];
    return entries
      .slice(0, 8)
      .map(([label, count]) => ({ label, count, isCurrent: label === modal }));
  }, [devices]);

  const columns: Column<AdminDeviceListItem>[] = useMemo(
    () => [
      {
        key: "device_label",
        header: "Device",
        accessor: (d) => `${d.device_label} ${d.hardware_id}`,
        render: (d) => (
          <div>
            <div className="font-medium text-white">{d.device_label}</div>
            <div className="font-mono text-[11px] text-white/35">{d.hardware_id}</div>
          </div>
        ),
      },
      {
        key: "partner_organization",
        header: "School",
        accessor: (d) => d.partner_organization ?? "—",
        filterable: true,
      },
      { key: "lab_name", header: "Lab", accessor: (d) => d.lab_name ?? "—", filterable: true },
      {
        key: "status",
        header: "Status",
        accessor: (d) => connLabel(d),
        filterable: true,
        render: (d) => <ConnBadge device={d} />,
      },
      {
        key: "self_test",
        header: "Self-test",
        accessor: (d) => serviceLabel(d),
        filterable: true,
        render: (d) => <ServiceChip device={d} />,
      },
      {
        key: "last_heartbeat_at",
        header: "Last seen",
        accessor: (d) => relativeTime(d.last_heartbeat_at),
        render: (d) => (
          <span className={isHeartbeatStale(d) ? "text-amber-300" : undefined}>
            {relativeTime(d.last_heartbeat_at)}
          </span>
        ),
      },
      {
        key: "firmware_version",
        header: "Firmware",
        accessor: (d) => d.firmware_version ?? "—",
        filterable: true,
      },
      {
        key: "last_ip",
        header: "Last IP",
        accessor: (d) => d.last_ip ?? "—",
        render: (d) => <span className="font-mono text-xs">{d.last_ip ?? "—"}</span>,
      },
    ],
    [],
  );

  const toggleTile = (key: string) => setTile((cur) => (cur === key ? "" : key));

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
          <p className="text-sm text-white/40">
            {stats
              ? `${stats.total_devices} devices · ${stats.total_labs} labs · ${stats.partners_with_labs} schools`
              : `${local.total} devices`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30">
            {lastUpdatedAt ? `Updated ${relativeTime(lastUpdatedAt.toISOString())}` : "Loading…"}
          </span>
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : undefined} />
            Refresh
          </button>
        </div>
      </div>

      {data?.truncated ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            Showing {devices.length} of {data.total} devices — this fleet exceeds the{" "}
            {FLEET_FETCH_CAP}-device client-side limit. Counts and charts below cover only the
            devices loaded.
          </span>
        </div>
      ) : null}

      {/* Connectivity — can we reach it? */}
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">
        Connectivity
      </p>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Fleet size" value={totalDevices} sub={`${local.revoked} revoked`} />
        <StatCard
          label="Online"
          value={onlineCount}
          sub={`${onlinePct}% of fleet`}
          accent="good"
          active={tile === "online"}
          onClick={() => toggleTile("online")}
        />
        <StatCard
          label="Offline"
          value={stats?.by_health_status?.OFFLINE ?? local.offline}
          active={tile === "offline"}
          onClick={() => toggleTile("offline")}
        />
        <StatCard
          label="Needs attention"
          value={stats?.by_health_status?.NEEDS_ATTENTION ?? local.needsAttention}
          accent="bad"
          active={tile === "needs_attention"}
          onClick={() => toggleTile("needs_attention")}
        />
        <StatCard
          label="Stale heartbeat"
          value={stats?.stale_heartbeat ?? local.stale}
          sub="Reads online, not reporting"
          accent="warn"
          active={tile === "stale"}
          onClick={() => toggleTile("stale")}
        />
        <StatCard
          label="Revoked"
          value={stats?.revoked_devices ?? local.revoked}
          active={tile === "revoked"}
          onClick={() => {
            setShowRevoked(true);
            toggleTile("revoked");
          }}
        />
      </div>

      {/* Serviceability — is the hardware sound? */}
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">
        Serviceability
      </p>
      {/* Same 6-column rhythm as the connectivity row, two columns per tile. */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 [&>*]:lg:col-span-2">
        <StatCard
          label="Self-test passing"
          value={passingCount}
          accent="good"
          active={tile === "passing"}
          onClick={() => toggleTile("passing")}
        />
        <StatCard
          label="Service required"
          value={serviceRequiredCount}
          sub="A component failed"
          accent="bad"
          active={tile === "service_required"}
          onClick={() => toggleTile("service_required")}
        />
        <StatCard
          label="Self-test unknown"
          value={unknownCount}
          sub="Never reported — not healthy"
          accent="warn"
          active={tile === "unknown"}
          onClick={() => toggleTile("unknown")}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Connectivity"
          subtitle="Can we reach the device?"
          empty={devices.length === 0}
        >
          <DonutChart data={connSlices} />
        </ChartCard>
        <ChartCard
          title="Serviceability"
          subtitle="Latest self-test verdict"
          empty={devices.length === 0}
        >
          <DonutChart data={serviceSlices} />
        </ChartCard>
        <ChartCard
          title="Devices by school"
          subtitle="Top 10 by fleet size"
          empty={bySchool.length === 0}
        >
          <BySchoolChart data={bySchool} />
        </ChartCard>
        <ChartCard
          title="Firmware spread"
          subtitle="Green is the most common version"
          empty={firmware.length === 0}
        >
          <FirmwareChart data={firmware} />
        </ChartCard>
      </div>

      <DataTable
        title="All devices"
        noun="devices"
        rows={rows}
        columns={columns}
        getRowKey={(d) => d.id}
        loading={isLoading}
        error={error}
        headerRight={
          <div className="flex items-center gap-3">
            {tile ? (
              <button
                onClick={() => setTile("")}
                className="rounded-lg border border-[#059F6D]/50 bg-[#059F6D]/10 px-3 py-2 text-xs text-[#059F6D] hover:bg-[#059F6D]/20"
              >
                Clear tile filter
              </button>
            ) : null}
            <label className="flex items-center gap-2 text-xs text-white/50">
              <input
                type="checkbox"
                checked={showRevoked}
                onChange={(e) => setShowRevoked(e.target.checked)}
              />
              Show revoked
            </label>
            <Select
              theme="dark"
              aria-label="Sort devices"
              className="min-w-[170px]"
              value={sort}
              onChange={(v) => setSort(v as SortKey)}
              options={SORTS.map((s) => ({ value: s.value, label: s.label }))}
            />
          </div>
        }
        actions={(d) => (
          <button
            onClick={() => router.push(`/admin/devices/${encodeURIComponent(d.id)}`)}
            className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/5"
          >
            View <ChevronRight size={14} />
          </button>
        )}
      />
    </div>
  );
}
