import React from "react";
import type { ProvenancePanel as ProvenancePanelType } from "../reportTypes";
import { Reported } from "../Reported";
import { Field } from "../Field";
import { NestedFields } from "../MetricTree";

interface ProvenancePanelProps {
  panel: ProvenancePanelType;
}

export function ProvenancePanel({ panel }: ProvenancePanelProps) {
  if (panel.error) {
    return <p className="text-sm text-danger-ink">{panel.error}</p>;
  }

  const otaInterlock =
    panel.ota_interlock?.value && typeof panel.ota_interlock.value === "object"
      ? (panel.ota_interlock.value as Record<string, unknown>)
      : null;

  const codeDrift =
    panel.code_drift?.value && typeof panel.code_drift.value === "object"
      ? (panel.code_drift.value as Record<string, unknown>)
      : null;

  const gitTrees =
    panel.git_trees?.value && typeof panel.git_trees.value === "object"
      ? (panel.git_trees.value as Record<string, unknown>)
      : null;

  const crashBudget =
    panel.crash_budget?.value && typeof panel.crash_budget.value === "object"
      ? (panel.crash_budget.value as Record<string, unknown>)
      : null;

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-light">
            Declared Mode
          </dt>
          <dd className="mt-1 text-sm font-semibold text-ink">
            <Reported reading={panel.mode} />
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-light">
            Mode Source
          </dt>
          <dd className="mt-1 text-sm font-mono text-ink">
            <Reported reading={panel.mode_source} mono />
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-light">
            Firmware Stamp
          </dt>
          <dd className="mt-1 text-sm font-mono text-ink">
            <Reported reading={panel.firmware_stamp} mono />
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-light">
            Tool Version
          </dt>
          <dd className="mt-1 text-sm font-mono text-ink">
            <Reported reading={panel.tool_version} mono />
          </dd>
        </div>
      </dl>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Field
          label="Database Stored Mode"
          value={panel.stored?.mode ?? "—"}
        />
        <Field
          label="Database Stored Firmware"
          value={panel.stored?.firmware_version ?? "—"}
          mono
        />
        <Field
          label="Deployed Version"
          value={panel.deployed_version?.value ? String(panel.deployed_version.value) : "—"}
          mono
        />
        <Field
          label="Mode File Present"
          value={panel.mode_file_present?.value !== null && panel.mode_file_present?.value !== undefined ? String(panel.mode_file_present.value) : "—"}
        />
      </dl>

      {/* OTA Interlock Prediction */}
      {otaInterlock ? (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            OTA Interlock Prediction
          </h3>
          <div className="rounded-lg border border-border bg-paper p-3 text-xs">
            <NestedFields obj={otaInterlock} />
          </div>
        </div>
      ) : null}

      {/* Code Drift */}
      {codeDrift ? (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            Runtime Code Drift
          </h3>
          <div className="rounded-lg border border-border bg-paper p-3 text-xs">
            <NestedFields obj={codeDrift} />
          </div>
        </div>
      ) : null}

      {/* Git Trees */}
      {gitTrees ? (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            Git Trees
          </h3>
          <div className="rounded-lg border border-border bg-paper p-3 text-xs">
            <NestedFields obj={gitTrees} />
          </div>
        </div>
      ) : null}

      {/* Crash Budget */}
      {crashBudget ? (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            Crash Budget
          </h3>
          <div className="rounded-lg border border-border bg-paper p-3 text-xs">
            <NestedFields obj={crashBudget} />
          </div>
        </div>
      ) : null}

      {/* Source notes */}
      {panel.sources ? (
        <div className="mt-2 border-t border-border pt-2 text-[10px] text-muted-light space-y-0.5">
          {Object.entries(panel.sources).map(([chk, src]) =>
            src.detail ? (
              <p key={chk}>
                <span className="font-mono text-muted-light">{chk}:</span> {src.detail}
              </p>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}
