"use client";

import type { ChapterMasteryItem, EvolutionAnalysisData, ReportCardUI } from "../types";
import { buildChapterArc, SPARK_COLORS, type SparkLevel } from "../utils";
import { Reveal } from "./Reveal";
import { SessionReportViewer } from "./SessionReportViewer";

// ─────────────────────────────────────────────────────────
// CHAPTER ANALYSIS — unlock hints, the session report, and the learning arc
// (sparkline, skill dimensions, session log). Shared by the print layout and
// the on-screen chapter rows.
// ─────────────────────────────────────────────────────────

export function ChapterAnalysis({
  ch, evo, chapterKey, ui,
}: {
  ch: ChapterMasteryItem;
  evo: EvolutionAnalysisData | undefined;
  /** Prefix for this chapter's expander keys in `ui`. */
  chapterKey: string;
  ui: ReportCardUI;
}) {
  const print = ui.variant === "print";
  const obsLimit = print ? 1 : 3;
  const arcOpen = ui.isExpOpen(`${chapterKey}::arc`);
  const logOpen = ui.isExpOpen(`${chapterKey}::log`);
  const reportOpen = ui.isExpOpen(`${chapterKey}::report`);
  const arc = buildChapterArc(evo);

  return (
    <>
    {!evo && !ch.chapter_report && ch.study_count < 2 && (
      <p className="rc-ch-hint">Learning arc unlocks after 2+ sessions on this chapter.</p>
    )}
    {!evo && !ch.chapter_report && ch.study_count >= 2 && (
      <p className="rc-ch-hint">Analysis pending — the learning arc is being generated.</p>
    )}

    {/* Direct Chapter Report Expander (available immediately whenever chapter_report exists, even without full multi-session evolution arc) */}
    {ch.chapter_report && !evo && (
      <div className="rc-expander rc-expander--sr" style={{ marginTop: "10px" }}>
        <button className="rc-expander-btn" onClick={() => ui.toggleExp(`${chapterKey}::report`)}>
          <span>📄 Latest Session Report — {ch.document_title}</span>
          <span className="plus" style={{ transform: reportOpen ? "rotate(45deg)" : "none" }}>+</span>
        </button>
        <Reveal open={reportOpen} print={print}>
          <div className="rc-expander-panel">
            <SessionReportViewer reportText={ch.chapter_report} />
          </div>
        </Reveal>
      </div>
    )}

    {evo && (
      <div className="rc-expander" style={{ marginTop: "10px" }}>
        <button className="rc-expander-btn" onClick={() => ui.toggleExp(`${chapterKey}::arc`)}>
          <span>📈 Learning arc &amp; skill dimensions — {ch.document_title}</span>
          <span className="plus" style={{ transform: arcOpen ? "rotate(45deg)" : "none" }}>+</span>
        </button>
        <Reveal open={arcOpen} print={print}>
          <div className="rc-expander-panel">
            {evo.headline && (
              <p style={{ fontFamily: "var(--display)", fontStyle: "italic", color: "var(--pro-fg)", fontSize: "14.5px", margin: "0 0 10px" }}>{evo.headline}</p>
            )}
            {arc.mappedLog.length > 1 && (
              <div className="rc-spark-wrap">
                <svg viewBox="0 0 480 100" width="100%" height="100" preserveAspectRatio="none">
                  {arc.gridLines.map((g, i) => (
                    <g key={i}>
                      <line x1="20" y1={g.y} x2="460" y2={g.y} stroke="#EDEAE0" strokeWidth="1" strokeDasharray="2 3" />
                      <text x="4" y={g.y + 3} className="rc-spark-grid-label">{g.label.slice(0, 3)}</text>
                    </g>
                  ))}
                  {arc.areaPath && <path d={arc.areaPath} fill="rgba(29,78,216,.06)" stroke="none" />}
                  <path d={arc.path} fill="none" stroke="#1D4ED8" strokeWidth="2.5" />
                  {arc.points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="4" fill={SPARK_COLORS[p.level]} />
                  ))}
                </svg>
                <div className="rc-spark-legend">
                  {(["beginning", "developing", "approaching", "proficient", "advanced"] as SparkLevel[]).map((l) => (
                    <span key={l}><i style={{ background: SPARK_COLORS[l] }} />{l.charAt(0).toUpperCase() + l.slice(1)}</span>
                  ))}
                </div>
              </div>
            )}
            {arc.dimensions.length > 0 && (
              <div className="rc-dim-grid">
                {arc.dimensions.map((d, i) => {
                  const delta = typeof d.delta === "number" ? Math.round(d.delta * 100) : null;
                  const name = d.dimension_name ?? d.dimension ?? d.name ?? "";
                  const obs = d.key_observation ?? d.analysis ?? d.desc ?? "";
                  return (
                    <div className="rc-dim-card" key={i}>
                      <div className="rc-dim-head">
                        <span>{name}</span>
                        {delta != null && delta !== 0 && (
                          <span className={`rc-dim-delta ${delta > 0 ? "up" : "down"}`}>{delta > 0 ? "+" : ""}{delta}</span>
                        )}
                      </div>
                      {obs && <div className="rc-dim-obs">{obs}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {arc.sessionLog.length > 0 && (
              <div className="rc-expander" style={{ marginTop: "14px" }}>
                <button className="rc-expander-btn" onClick={() => ui.toggleExp(`${chapterKey}::log`)}>
                  <span>🗒 Session log ({arc.sessionLog.length} session{arc.sessionLog.length !== 1 ? "s" : ""})</span>
                  <span className="plus" style={{ transform: logOpen ? "rotate(45deg)" : "none" }}>+</span>
                </button>
                <Reveal open={logOpen} print={print}>
                  <div className="rc-expander-panel">
                    {arc.mappedLog.map((s, i) => (
                      <div className="rc-log-row" key={i}>
                        <span className="rc-log-idx">{s.n}</span>
                        <div style={{ flex: 1 }}>
                          <div className="rc-log-stage">{s.stage}</div>
                          {s.obs.length > 0 && (
                            <ul className="rc-log-obs">
                              {s.obs.slice(0, obsLimit).map((o: string, j: number) => <li key={j}>{o}</li>)}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>
            )}

            {ch.chapter_report && (
              <div className="rc-expander rc-expander--sr" style={{ marginTop: "10px" }}>
                <button className="rc-expander-btn" onClick={() => ui.toggleExp(`${chapterKey}::report`)}>
                  <span>📄 Full chapter report</span>
                  <span className="plus" style={{ transform: reportOpen ? "rotate(45deg)" : "none" }}>+</span>
                </button>
                <Reveal open={reportOpen} print={print}>
                  <div className="rc-expander-panel">
                    <SessionReportViewer reportText={ch.chapter_report} />
                  </div>
                </Reveal>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    )}
    </>
  );
}
