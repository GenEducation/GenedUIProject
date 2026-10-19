"use client";

import type { ReportCardData, ReportCardUI } from "../types";
import { masteryColor, bandClass, formatDate, deriveTopicInsights } from "../utils";
import { Reveal } from "./Reveal";

// ─────────────────────────────────────────────────────────
// TOPIC MASTERY (skill tree, collapsed by default)
// ─────────────────────────────────────────────────────────

export function TopicMastery({ subject, data, ui }: { subject: string; data: ReportCardData; ui: ReportCardUI }) {
  const print = ui.variant === "print";
  const insights = deriveTopicInsights(data.skillTree, subject);
  if (insights.cgs.length === 0) return null;

  const key = `${subject}::topics`;
  const open = ui.isExpOpen(key);

  return (
    <div className="rc-expander rc-expander--tm" style={{ marginTop: "14px" }}>
      <button className="rc-expander-btn" onClick={() => ui.toggleExp(key)}>
        <span>🧠 Skill Mastery — {insights.cgs.length} topic group{insights.cgs.length !== 1 ? "s" : ""}</span>
        <span className="plus" style={{ transform: open ? "rotate(45deg)" : "none" }}>+</span>
      </button>
      <Reveal open={open} print={print}>
        <div className="rc-expander-panel">
          {(insights.strong.length > 0 || insights.weak.length > 0) && (
            <div className="rc-topic-strip">
              {insights.strong.length > 0 && (
                <div className="rc-topic-line">
                  <span className="cap">Strong</span>
                  <span className="rc-topic-chips">
                    {insights.strong.map((t, i) => (
                      <span key={i} className={`rc-chip sm ${bandClass(t.level * 100)}`}>{t.name}</span>
                    ))}
                  </span>
                </div>
              )}
              {insights.weak.length > 0 && (
                <div className="rc-topic-line">
                  <span className="cap">Needs work</span>
                  <span className="rc-topic-chips">
                    {insights.weak.map((t, i) => (
                      <span key={i} className={`rc-chip sm ${bandClass(t.level * 100)}`}>{t.name}</span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          )}

          {insights.cgs.map((cg) => {
            const cgKey = `${subject}::cg::${cg.cg_id}`;
            const cgOpen = ui.isExpOpen(cgKey);
            const cgScore = Math.round(cg.avg_mastery * 100);
            return (
              <div key={cg.cg_id}>
                <div className="rc-cg-row">
                  <button className="rc-cg-toggle" onClick={() => ui.toggleExp(cgKey)}>
                    <span className="plus">{cgOpen ? "−" : "+"}</span>
                    <span className="rc-cg-name">{cg.cg_name}</span>
                  </button>
                  <span className="rc-lo-pct" style={{ color: masteryColor(cg.avg_mastery) }}>{cgScore}%</span>
                  <div className="rc-bar-track">
                    <div className="rc-bar-fill" style={{ width: `${cgScore}%`, background: masteryColor(cg.avg_mastery) }} />
                  </div>
                </div>
                <Reveal open={cgOpen} print={print}>
                  <div className="rc-cg-panel">
                    {(cg.concepts ?? []).map((concept) => (
                      <div key={concept.c_id}>
                        <div className="rc-concept-name">{concept.c_name}</div>
                        {(concept.los ?? []).map((lo) => (
                          <div className="rc-lo-row" key={lo.skill_id}>
                            <span className="rc-lo-dot" style={{ background: masteryColor(lo.mastery_level) }} />
                            <span className="rc-lo-name">{lo.skill_name}</span>
                            <span className="rc-lo-pct" style={{ color: masteryColor(lo.mastery_level) }}>
                              {Math.round(lo.mastery_level * 100)}%
                            </span>
                            <span className="rc-lo-meta">
                              ×{lo.assessment_count}{lo.last_assessed_at ? ` · ${formatDate(lo.last_assessed_at)}` : ""}
                            </span>
                            {lo.justification && <p className="rc-lo-just">{lo.justification}</p>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>
            );
          })}
        </div>
      </Reveal>
    </div>
  );
}
