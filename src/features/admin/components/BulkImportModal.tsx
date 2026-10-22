"use client";

import { useRef, useState } from "react";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormModal } from "./ui/FormModal";
import { StatusPill, type PillTone } from "./ui/StatusPill";
import { SECONDARY_ACTION } from "./ui/fields";
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

const STATUS_TONE: Record<string, PillTone> = {
  valid: "info",
  created: "success",
  skipped: "pending",
  error: "danger",
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

  const footer = (
    <div className="flex flex-wrap justify-end gap-2.5 border-t border-border bg-paper px-5 py-4 sm:px-6">
      {committed ? (
        <>
          <Button variant="outline" onClick={downloadResults} leadingIcon={<Download size={15} />}>
            Download results
          </Button>
          <Button onClick={onClose}>Done</Button>
        </>
      ) : (
        <>
          <Button variant="tertiary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={commit} disabled={!preview || preview.valid === 0}>
            {`Create ${preview?.valid ?? 0} ${noun}`}
          </Button>
        </>
      )}
    </div>
  );

  return (
    <FormModal
      title={`Bulk import ${noun}`}
      subtitle={contextLabel ? <>Into <strong className="text-ink">{contextLabel}</strong></> : undefined}
      size="full"
      onClose={onClose}
      error={error}
      footer={footer}
    >
      <p className="text-[13px] leading-relaxed text-muted">
        Upload an .xlsx/.csv. Usernames are auto-generated from email. Blank passwords default to{" "}
        <code className="rounded bg-soft-surface px-1 py-0.5 font-mono text-[12px] text-ink">welcometogened</code>.
        {context ? " New accounts link to the selected " + context.type + "." : ""}
      </p>

      {/* File picker */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-paper px-4 py-7 text-center transition-colors hover:border-emerald/40 hover:bg-emerald-50/50"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-emerald shadow-[0_1px_2px_rgba(18,45,48,.06)]">
          {file ? <FileSpreadsheet size={20} /> : <Upload size={20} />}
        </span>
        <span className="text-sm font-bold text-ink">{file ? file.name : "Choose a spreadsheet"}</span>
        <span className="text-[12px] text-muted">{file ? "Click to choose a different file" : ".xlsx or .csv"}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => downloadImportTemplate(role)} className={SECONDARY_ACTION}>
          <Download size={14} /> Download template
        </button>
        <label className="flex min-h-9 cursor-pointer items-center gap-2 text-[13px] font-semibold text-ink">
          <input
            type="checkbox"
            checked={sendWelcome}
            onChange={(e) => setSendWelcome(e.target.checked)}
            className="h-4 w-4 accent-[var(--emerald)]"
          />
          Send welcome emails
        </label>
      </div>

      {/* Summary counts */}
      {summary ? (
        <div className="flex flex-wrap gap-2">
          {committed ? (
            <>
              <StatusPill tone="brand">{committed.created} created</StatusPill>
              <StatusPill tone="pending">{committed.skipped} skipped</StatusPill>
              <StatusPill tone="danger">{committed.failed} failed</StatusPill>
            </>
          ) : (
            <>
              <StatusPill tone="info">{summary.valid} valid</StatusPill>
              <StatusPill tone="pending">{summary.skipped} will skip</StatusPill>
              <StatusPill tone="danger">{summary.invalid} errors</StatusPill>
            </>
          )}
        </div>
      ) : null}

      {/* Preview / results table */}
      {summary ? (
        <div className="max-h-[45vh] overflow-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-left text-[12.5px]">
            <thead className="sticky top-0 bg-paper text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Email</th>
                <th className="px-3 py-2.5">Username</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Linked</th>
                <th className="px-3 py-2.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {summary.rows.map((r) => (
                <tr key={r.row}>
                  <td className="px-3 py-2 tabular-nums text-muted">{r.row}</td>
                  <td className="px-3 py-2 font-semibold text-ink">{r.email}</td>
                  <td className="px-3 py-2 text-ink/75">{r.username ?? "—"}</td>
                  <td className="px-3 py-2">
                    <StatusPill tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</StatusPill>
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {[r.linked_partner, r.linked_teacher].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-danger-ink">{r.messages.join("; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </FormModal>
  );
}
