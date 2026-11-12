"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { asError } from "@/utils/errors";
import { sourcesService } from "../services/sourcesService";
import type { ActivityReview } from "../types/sources";

export function ActivityEvidencePanel({ sourceId }: { sourceId: string }) {
  const [rows, setRows] = useState<ActivityReview[]>([]);
  const [error, setError] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const load = () => sourcesService.activityReviews(sourceId).then(setRows).catch((e) => {
    setError(asError(e).message ?? "Activity evidence could not be loaded.");
  });
  useEffect(() => { void load(); }, [sourceId]);

  const override = async (row: ActivityReview, objective: number, verdict: "met" | "not_met" | "not_judged") => {
    const key = `${row.evaluation_id}:${objective}`;
    const reason = reasons[key]?.trim();
    if (!reason) { setError("Write a reason before overriding a verdict."); return; }
    try {
      await sourcesService.overrideActivityVerdict(sourceId, row.evaluation_id, objective, verdict, reason);
      setError("");
      await load();
    } catch (e) { setError(asError(e).message ?? "The override could not be saved."); }
  };

  return (
    <section aria-label="Learner activity evidence" className="mt-8 border-t border-[#122D30]/10 pt-6">
      <h3 className="text-base font-black text-[#122D30]">Learner activity evidence</h3>
      <p className="mt-1 text-sm text-[#122D30]/65">Audit both blind judgments and the exact learner words they used.</p>
      {error && <p role="alert" className="mt-3 text-sm font-bold text-red-700">{error}</p>}
      {rows.length === 0 && <p className="mt-4 text-sm text-[#122D30]/55">No activity attempts to review yet.</p>}
      <div className="mt-4 space-y-4">
        {rows.map((row) => (
          <article key={row.evaluation_id} className="rounded-2xl border border-[#122D30]/10 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-[#122D30]/50">{row.mode.replace("_", " ")}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[#122D30]">{row.answer || "[response erased]"}</p>
            {row.agreed.map((verdict, objective) => {
              const key = `${row.evaluation_id}:${objective}`;
              const left = row.evaluator.evaluation?.verdicts.find((v) => v.objective === objective);
              const right = row.verifier.evaluation?.verdicts.find((v) => v.objective === objective);
              return <div key={key} className="mt-4 rounded-xl bg-[#F4F7F5] p-3">
                <p className="text-sm font-bold">Objective {objective + 1}: {verdict.replace("_", " ")}</p>
                <p className="mt-1 text-xs text-[#122D30]/65">Evaluator: {left?.verdict ?? "unavailable"} — “{left?.quote || "no quote"}”</p>
                <p className="text-xs text-[#122D30]/65">Verifier: {right?.verdict ?? "unavailable"} — “{right?.quote || "no quote"}”</p>
                <textarea aria-label={`Override reason for objective ${objective + 1}`} value={reasons[key] ?? ""}
                  onChange={(e) => setReasons((old) => ({ ...old, [key]: e.target.value }))}
                  className="mt-3 min-h-16 w-full rounded-lg border border-[#122D30]/15 bg-white p-2 text-sm"
                  placeholder="Reason for a human override" />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void override(row, objective, "met")}>Mark met</Button>
                  <Button size="sm" variant="secondary" onClick={() => void override(row, objective, "not_met")}>Mark not met</Button>
                  <Button size="sm" variant="secondary" onClick={() => void override(row, objective, "not_judged")}>Remove evidence</Button>
                </div>
              </div>;
            })}
          </article>
        ))}
      </div>
    </section>
  );
}
