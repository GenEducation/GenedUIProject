"use client";

import type { ReportCardData, ReportCardUI } from "../types";
import { masteryColor, formatDate } from "../utils";
import { Reveal } from "./Reveal";

// ─────────────────────────────────────────────────────────
// TEST ITEM (expandable to section-wise breakdown)
// ─────────────────────────────────────────────────────────

export function TestItem({ t, ui }: { t: ReportCardData["testSubmissions"][number]; ui: ReportCardUI }) {
  const print = ui.variant === "print";
  const results = Object.entries(t.section_results ?? {});
  const correct = results.reduce((sum, [, r]) => sum + (r.correct ?? 0), 0);
  const total = results.reduce((sum, [, r]) => sum + (r.total ?? 0), 0);
  const pass = t.overall_verdict === "PASS" || t.overall_verdict === "pass";
  const key = `test::${t.submission_id}`;
  const open = ui.isExpOpen(key);
  const hasBreakdown = results.length > 0;

  return (
    <div className="rc-test-item">
      <div className="rc-test-row" onClick={() => hasBreakdown && ui.toggleExp(key)} style={{ cursor: hasBreakdown ? "pointer" : "default" }}>
        <div>
          <div className="rc-test-title">{t.document_title}</div>
          <div className="rc-test-sub">{t.subject}{total > 0 ? ` · ${correct}/${total} correct` : ""}</div>
        </div>
        <div className="rc-test-score">{Math.round(t.overall_score * 100)}%</div>
        <span className={`rc-verdict ${pass ? "pass" : "fail"}`}>{pass ? "PASS" : "FAIL"}</span>
        <div className="rc-test-date">{formatDate(t.submitted_at)}</div>
        <span className="rc-test-plus">{hasBreakdown ? (open ? "−" : "+") : ""}</span>
      </div>
      {hasBreakdown && (
        <Reveal open={open} print={print}>
          <div className="rc-test-panel">
            {results.map(([section, r]) => {
              const s = typeof r.score === "number" ? r.score : (r.correct ?? 0) / (r.total ?? 1);
              return (
                <div className="rc-sec-bar-row" key={section}>
                  <span className="rc-sec-bar-name">{section}</span>
                  <div className="rc-bar-track" style={{ width: 60 }}>
                    <div className="rc-bar-fill" style={{ width: `${Math.round(s * 100)}%`, background: masteryColor(s) }} />
                  </div>
                  <span className="rc-sec-bar-count">{r.correct != null && r.total != null ? `${r.correct}/${r.total}` : ""}</span>
                  <span className="rc-lo-pct" style={{ color: masteryColor(s), textAlign: "right" }}>{Math.round(s * 100)}%</span>
                </div>
              );
            })}
          </div>
        </Reveal>
      )}
    </div>
  );
}
