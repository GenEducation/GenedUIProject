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
      <p className="text-xs text-white/40">
        The full stored gened-health JSON document. Evidence (command stdout and file contents)
        is excluded by default for bandwidth and performance.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
          <input
            type="checkbox"
            checked={includeEvidence}
            onChange={(e) => handleToggleEvidence(e.target.checked)}
            className="rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-0"
          />
          Include raw command evidence (?evidence=true)
        </label>

        <div className="flex items-center gap-2">
          {data ? (
            <Button
              size="sm"
              variant="outline"
              tone="onDark"
              onClick={handleCopy}
              leadingIcon={copied ? <Check size={13} /> : <Copy size={13} />}
            >
              {copied ? "Copied" : "Copy JSON"}
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="secondary"
            tone="onDark"
            onClick={handleFetch}
            disabled={loading}
            loading={loading}
          >
            {data ? "Reload document" : "Load raw document"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          {error}
        </div>
      ) : null}

      {data ? (
        <pre className="max-h-96 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-white/80">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
