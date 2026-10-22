"use client";

import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  listWakewordModels,
  getWakewordReport,
  downloadWakewordModel,
  WakewordModel,
  WakewordReport,
} from "../adminService";
import { DataTable, Column } from "./DataTable";
import { Button } from "@/components/ui/Button";
import { FormModal } from "./ui/FormModal";
import { StatusPill, statusTone } from "./ui/StatusPill";

function fmtBytes(n: number | null): string {
  if (!n) return "—";
  return n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function WakeWordModelsView() {
  const [rows, setRows] = useState<WakewordModel[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Report modal state.
  const [reportFor, setReportFor] = useState<WakewordModel | null>(null);
  const [report, setReport] = useState<WakewordReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");

  useEffect(() => {
    listWakewordModels()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load wake-word models"))
      .finally(() => setLoading(false));
  }, []);

  const openReport = async (m: WakewordModel) => {
    setReportFor(m);
    setReport(null);
    setReportError("");
    setReportLoading(true);
    try {
      setReport(await getWakewordReport(m.id));
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setReportLoading(false);
    }
  };

  const columns: Column<WakewordModel>[] = [
    { key: "phrase", header: "Phrase" },
    {
      key: "user",
      header: "Owner",
      accessor: (m) => m.user_email ?? m.device_id ?? "—",
      filterable: true,
    },
    { key: "model_size", header: "Size", filterable: true },
    {
      key: "status",
      header: "Status",
      filterable: true,
      render: (m) => (
        <StatusPill
          tone={statusTone(m.status === "SUCCEEDED" ? "READY" : m.status === "PROVISIONING" ? "RUNNING" : m.status)}
          dot
        >
          {m.status}
        </StatusPill>
      ),
    },
    { key: "model_num_bytes", header: "Model", accessor: (m) => fmtBytes(m.model_num_bytes) },
    {
      key: "created_at",
      header: "Created",
      accessor: (m) => (m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"),
    },
  ];

  return (
    <>
      <DataTable
        title="Wake-word Models"
        noun="training jobs"
        rows={rows}
        columns={columns}
        getRowKey={(m) => m.id}
        loading={loading}
        error={error}
        actions={(m) => (
          <div className="flex items-center justify-end gap-2">
            {m.has_report && (
              <button
                onClick={() => openReport(m)}
                className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border-[1.5px] border-[var(--btn-neutral-border)] px-3 text-[12.5px] font-bold text-ink hover:bg-[var(--btn-neutral-hover)]"
              >
                <FileText size={14} /> Report
              </button>
            )}
            {m.model_num_bytes ? (
              <button
                onClick={() => downloadWakewordModel(m.id, m.model_name)}
                className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border-[1.5px] border-emerald/30 px-3 text-[12.5px] font-bold text-emerald hover:bg-emerald-50"
              >
                <Download size={14} /> ONNX
              </button>
            ) : null}
          </div>
        )}
      />

      <FormModal
        open={Boolean(reportFor)}
        title="Training report"
        subtitle={reportFor ? `${reportFor.phrase} · ${reportFor.model_name}` : undefined}
        size="lg"
        onClose={() => setReportFor(null)}
        error={reportError || undefined}
        footer={
          <div className="flex justify-end border-t border-border bg-paper px-5 py-4 sm:px-6">
            <Button variant="tertiary" onClick={() => setReportFor(null)}>
              Close
            </Button>
          </div>
        }
      >
        {reportLoading ? (
          <p className="text-sm text-muted">Loading report…</p>
        ) : reportError ? null : report?.report_md ? (
          <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:text-ink prose-a:text-emerald">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.report_md}</ReactMarkdown>
          </div>
        ) : report?.report_json ? (
          <pre className="overflow-auto rounded-xl bg-paper p-4 font-mono text-xs text-ink/80">
            {JSON.stringify(report.report_json, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-muted">No report content.</p>
        )}
      </FormModal>
    </>
  );
}
