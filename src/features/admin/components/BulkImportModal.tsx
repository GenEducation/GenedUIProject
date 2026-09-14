"use client";

import { useRef, useState } from "react";
import { X, Upload, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  downloadImportTemplate,
  importUsers,
  ImportContext,
  ImportRole,
  ImportSummary,
} from "../adminService";

interface Props {
  role: ImportRole;
  context?: ImportContext;
  contextLabel?: string; // e.g. "NEW SCHOOL" or "Anita Iyer"
  onClose: () => void;
  onDone?: () => void;
}

const STATUS_STYLE: Record<string, string> = {
  valid: "bg-sky-500/15 text-sky-300",
  created: "bg-[#059F6D]/15 text-[#059F6D]",
  skipped: "bg-amber-500/15 text-amber-300",
  error: "bg-rose-500/15 text-rose-300",
};

export function BulkImportModal({ role, context, contextLabel, onClose, onDone }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [committed, setCommitted] = useState<ImportSummary | null>(null);
  const [sendWelcome, setSendWelcome] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const summary = committed ?? preview;
  const noun = role.toLowerCase() + "s";

  const onPick = async (f: File | null) => {
    setError("");
    setCommitted(null);
    setPreview(null);
    setFile(f);
    if (!f) return;
    setLoading(true);
    try {
      setPreview(await importUsers(f, { role, dryRun: true, context }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read file");
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const res = await importUsers(file, { role, dryRun: false, sendWelcome, context });
      setCommitted(res);
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadResults = () => {
    if (!committed) return;
    const rows = [
      ["row", "email", "username", "status", "initial_password", "linked_partner", "linked_teacher", "messages"],
      ...committed.rows.map((r) => [
        r.row,
        r.email ?? "",
        r.username ?? "",
        r.status,
        r.generated_password ?? "",
        r.linked_partner ?? "",
        r.linked_teacher ?? "",
        r.messages.join("; "),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `import_results_${role.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#13283a] p-6 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold">
            Bulk import {noun}
            {contextLabel ? <span className="text-white/50"> → {contextLabel}</span> : null}
          </h2>
          <Button iconOnly size="sm" variant="tertiary" tone="onDark" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
        <p className="text-xs text-white/40 mb-4">
          Upload an .xlsx/.csv. Usernames are auto-generated from email. Blank passwords default to{" "}
          <code className="text-white/60">welcometogened</code>.
          {context ? " New accounts link to the selected " + context.type + "." : ""}
        </p>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={() => downloadImportTemplate(role)}
            className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
          >
            <Download size={14} /> Template
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
          >
            <Upload size={14} /> {file ? "Change file" : "Choose file"}
          </button>
          {file ? (
            <span className="flex items-center gap-1.5 text-xs text-white/50">
              <FileSpreadsheet size={14} /> {file.name}
            </span>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
          <label className="ml-auto flex items-center gap-2 text-xs text-white/60 cursor-pointer">
            <input
              type="checkbox"
              checked={sendWelcome}
              onChange={(e) => setSendWelcome(e.target.checked)}
              className="accent-[#059F6D]"
            />
            Send welcome emails
          </label>
        </div>

        {error ? (
          <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
            {error}
          </div>
        ) : null}

        {/* Summary counts */}
        {summary ? (
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {committed ? (
              <>
                <Pill className="bg-[#059F6D]/15 text-[#059F6D]">{committed.created} created</Pill>
                <Pill className="bg-amber-500/15 text-amber-300">{committed.skipped} skipped</Pill>
                <Pill className="bg-rose-500/15 text-rose-300">{committed.failed} failed</Pill>
              </>
            ) : (
              <>
                <Pill className="bg-sky-500/15 text-sky-300">{summary.valid} valid</Pill>
                <Pill className="bg-amber-500/15 text-amber-300">{summary.skipped} will skip</Pill>
                <Pill className="bg-rose-500/15 text-rose-300">{summary.invalid} errors</Pill>
              </>
            )}
          </div>
        ) : null}

        {/* Preview / results table */}
        {summary ? (
          <div className="flex-1 overflow-auto rounded-lg border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#0E1F2B] text-white/40">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Username</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Linked</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map((r) => (
                  <tr key={r.row} className="border-t border-white/5">
                    <td className="px-3 py-1.5 text-white/40">{r.row}</td>
                    <td className="px-3 py-1.5">{r.email}</td>
                    <td className="px-3 py-1.5 text-white/70">{r.username ?? "—"}</td>
                    <td className="px-3 py-1.5">
                      <span className={`rounded px-1.5 py-0.5 ${STATUS_STYLE[r.status] ?? ""}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-white/50">
                      {[r.linked_partner, r.linked_teacher].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-3 py-1.5 text-rose-300/80">{r.messages.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Footer actions */}
        <div className="mt-4 flex justify-end gap-3">
          {committed ? (
            <>
              <Button
                variant="outline"
                tone="onDark"
                onClick={downloadResults}
                leadingIcon={<Download size={15} />}
              >
                Download results
              </Button>
              <Button variant="primary" tone="onDark" onClick={onClose}>
                Done
              </Button>
            </>
          ) : (
            <>
              <Button variant="tertiary" tone="onDark" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                tone="onDark"
                loading={loading}
                onClick={commit}
                disabled={!preview || preview.valid === 0}
              >
                {`Create ${preview?.valid ?? 0} ${noun}`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={`rounded-md px-2 py-1 font-semibold ${className}`}>{children}</span>;
}
