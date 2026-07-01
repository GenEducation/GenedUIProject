"use client";

import { useEffect, useState } from "react";
import { Download, FileText, X } from "lucide-react";
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

const STATUS_STYLES: Record<string, string> = {
  SUCCEEDED: "bg-[#059F6D]/15 text-[#059F6D]",
  RUNNING: "bg-sky-500/15 text-sky-300",
  PROVISIONING: "bg-sky-500/15 text-sky-300",
  PENDING: "bg-amber-500/15 text-amber-300",
  FAILED: "bg-rose-500/15 text-rose-300",
  CANCELLED: "bg-white/10 text-white/50",
};

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
        <span
          className={`rounded-md px-2 py-0.5 text-xs ${STATUS_STYLES[m.status] ?? "bg-white/10 text-white/50"}`}
        >
          {m.status}
        </span>
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
                className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/5"
              >
                <FileText size={14} /> Report
              </button>
            )}
            {m.model_num_bytes ? (
              <button
                onClick={() => downloadWakewordModel(m.id, m.model_name)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#059F6D]/40 px-2.5 py-1.5 text-xs text-[#059F6D] hover:bg-[#059F6D]/10"
              >
                <Download size={14} /> ONNX
              </button>
            ) : null}
          </div>
        )}
      />

      {reportFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setReportFor(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-white/10 bg-[#0E1F2B] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-white">Training Report</h2>
                <p className="text-xs text-white/40">
                  {reportFor.phrase} · {reportFor.model_name}
                </p>
              </div>
              <button
                onClick={() => setReportFor(null)}
                className="rounded-md p-1.5 text-white/50 hover:bg-white/5 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-auto px-6 py-5">
              {reportLoading ? (
                <p className="text-sm text-white/40">Loading report…</p>
              ) : reportError ? (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
                  {reportError}
                </div>
              ) : report?.report_md ? (
                <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-a:text-[#059F6D]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.report_md}</ReactMarkdown>
                </div>
              ) : report?.report_json ? (
                <pre className="overflow-auto rounded-lg bg-white/[0.03] p-4 text-xs text-white/70">
                  {JSON.stringify(report.report_json, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-white/40">No report content.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
