import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getDeviceReportRaw } from "../adminService";

interface RawDocumentSectionProps {
  deviceKey: string;
}

export function RawDocumentSection({ deviceKey }: RawDocumentSectionProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadRaw = async (evidence: boolean) => {
    setLoading(true);
    setError("");
    try {
      const res = await getDeviceReportRaw(deviceKey, evidence);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load raw document");
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = () => {
    void loadRaw(includeEvidence);
  };

  const handleToggleEvidence = (checked: boolean) => {
    setIncludeEvidence(checked);
    if (data !== null) {
      void loadRaw(checked);
    }
  };

  const handleCopy = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        The full stored gened-health JSON document. Evidence (command stdout and file contents)
        is excluded by default for bandwidth and performance.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-ink/80 cursor-pointer">
          <input
            type="checkbox"
            checked={includeEvidence}
            onChange={(e) => handleToggleEvidence(e.target.checked)}
            className="rounded border-border bg-soft-surface text-emerald focus:ring-0"
          />
          Include raw command evidence (?evidence=true)
        </label>

        <div className="flex items-center gap-2">
          {data ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              leadingIcon={copied ? <Check size={13} /> : <Copy size={13} />}
            >
              {copied ? "Copied" : "Copy JSON"}
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="secondary"
            onClick={handleFetch}
            disabled={loading}
            loading={loading}
          >
            {data ? "Reload document" : "Load raw document"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-danger/30 bg-danger-bg p-3 text-xs text-danger-ink">
          {error}
        </div>
      ) : null}

      {data ? (
        <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-canvas p-3 font-mono text-[11px] leading-relaxed text-ink">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
