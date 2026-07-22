"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { BookOpen, FileText, Brain, Activity, ChevronDown, Lock, User, Target, TrendingUp, Award, Sparkles, Clock } from "lucide-react";
import type { ReportCardData, ReportCardUI, SubjectData } from "./types";
import {
  SUBJECT_ACCENTS, masteryColor, bandFor, bandClass, formatDate, ringArc,
  buildChapterArc, deriveTopicInsights, deriveUnlocks, testAggregate,
  subjectAdapted, pendingTrendSubjects, SPARK_COLORS, type SparkLevel,
} from "./utils";

// ─────────────────────────────────────────────────────────
// STRUCTURED SESSION REPORT RENDERER
// ─────────────────────────────────────────────────────────

function SessionReportViewer({ reportText }: { reportText: string }) {
  if (!reportText) return null;

  // Helper to parse key-value lines
  const getValue = (pattern: RegExp, text: string) => {
    const match = text.match(pattern);
    return match ? match[1].trim() : null;
  };

  // Extract Summary
  const summaryMatch = reportText.match(/### Summary of Current Session \((.*?)\)\n([\s\S]*?)(?=\n### |$)/);
  const completionBadge = summaryMatch ? summaryMatch[1] : null;
  const summaryBody = summaryMatch ? summaryMatch[2].trim() : "";

  // Extract Student Traits
  const traitsSection = reportText.match(/### Student Traits & Engagement\n([\s\S]*?)(?=\n### |$)/)?.[1] || "";
  const mood = getValue(/- \*\*Mood\*\*: (.*)/, traitsSection);
  const engagement = getValue(/- \*\*Engagement\*\*: (.*)/, traitsSection);
  const questioning = getValue(/- \*\*Questioning Style\*\*: (.*)/, traitsSection);
  const evidence = getValue(/- \*\*Evidence\*\*: (.*)/, traitsSection);

  // Extract Pedagogical Points
  const pedagogySection = reportText.match(/### Pedagogical Key Points\n([\s\S]*?)(?=\n### |$)/)?.[1] || "";
  const pedagogyBlocks: { title: string; friction?: string; breakthrough?: string; misconception?: string }[] = [];
  const pRegex = /#### (.*?)\n([\s\S]*?)(?=(#### |$))/g;
  let pMatch;
  while ((pMatch = pRegex.exec(pedagogySection)) !== null) {
    const blockText = pMatch[2];
    pedagogyBlocks.push({
      title: pMatch[1].trim(),
      friction: getValue(/- \*\*Friction Points\*\*: (.*)/, blockText) || undefined,
      breakthrough: getValue(/- \*\*Breakthroughs\*\*: (.*)/, blockText) || undefined,
      misconception: getValue(/- \*\*Misconceptions\*\*: (.*)/, blockText) || undefined,
    });
  }

  // Extract Concept Trajectory
  const trajSection = reportText.match(/### Concept Trajectory\n([\s\S]*?)(?=\n### |$)/)?.[1] || "";
  const trajLines: { concept: string; transition: string; desc: string }[] = [];
  const tRegex = /- \*\*(.*?)\*\*: (.*?) — (.*)/g;
  let tMatch;
  while ((tMatch = tRegex.exec(trajSection)) !== null) {
    trajLines.push({
      concept: tMatch[1].trim(),
      transition: tMatch[2].trim(),
      desc: tMatch[3].trim(),
    });
  }

  // Extract Updated Overall Summary
  const overallSummary = reportText.match(/### Updated Overall Summary\n([\s\S]*?)(?=\n### |$)/)?.[1]?.trim();

  // If text structure doesn't match standard headings, fall back gracefully to Markdown
  const isStructured = summaryMatch || traitsSection || pedagogyBlocks.length > 0 || trajLines.length > 0;

  if (!isStructured) {
    return (
      <div className={MD_CLASSES}>
        <ReactMarkdown>{reportText}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="rc-session-report">
      {/* Session Summary Header */}
      <div className="rc-sr-header">
        <div className="rc-sr-header-top">
          <div className="rc-sr-title">
            <Sparkles size={13} />
            <span>Session Overview</span>
          </div>
          {completionBadge && <span className="rc-sr-badge">{completionBadge}</span>}
        </div>
        {summaryBody && <p className="rc-sr-summary-text">{summaryBody}</p>}
      </div>

      {/* Student Traits & Engagement */}
      {(mood || engagement || questioning || evidence) && (
        <div>
          <div className="rc-sr-section-title">
            <User size={13} />
            <span>Learner Traits &amp; Engagement</span>
          </div>
          <div className="rc-sr-traits-grid">
            {mood && (
              <div className="rc-sr-trait-card">
                <div className="rc-sr-trait-label">Mood</div>
                <div className="rc-sr-trait-value">{mood}</div>
              </div>
            )}
            {engagement && (
              <div className="rc-sr-trait-card">
                <div className="rc-sr-trait-label">Engagement</div>
                <div className="rc-sr-trait-value">{engagement}</div>
              </div>
            )}
            {questioning && (
              <div className="rc-sr-trait-card">
                <div className="rc-sr-trait-label">Questioning Style</div>
                <div className="rc-sr-trait-value">{questioning}</div>
              </div>
            )}
          </div>
          {evidence && (
            <div className="rc-sr-evidence">
              <p className="rc-sr-evidence-quote">{evidence}</p>
              <div className="rc-sr-evidence-cap">Observed evidence</div>
            </div>
          )}
        </div>
      )}

      {/* Pedagogical Key Points */}
      {pedagogyBlocks.length > 0 && (
        <div>
          <div className="rc-sr-section-title">
            <Target size={13} />
            <span>Pedagogical Key Points</span>
          </div>
          {pedagogyBlocks.map((block, idx) => (
            <div className="rc-sr-pedagogy-card" key={idx}>
              <div className="rc-sr-pedagogy-head">{block.title}</div>
              <div className="rc-sr-pedagogy-details">
                {block.friction && (
                  <div className="rc-sr-point-item">
                    <span className="rc-sr-point-tag friction">Friction</span>
                    <span>{block.friction}</span>
                  </div>
                )}
                {block.breakthrough && (
                  <div className="rc-sr-point-item">
                    <span className="rc-sr-point-tag breakthrough">Breakthrough</span>
                    <span>{block.breakthrough}</span>
                  </div>
                )}
                {block.misconception && (
                  <div className="rc-sr-point-item">
                    <span className="rc-sr-point-tag misconception">Misconception</span>
                    <span>{block.misconception}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Concept Trajectory */}
      {trajLines.length > 0 && (
        <div>
          <div className="rc-sr-section-title">
            <TrendingUp size={13} />
            <span>Concept Trajectory</span>
          </div>
          {trajLines.map((traj, idx) => (
            <div className="rc-sr-trajectory-card" key={idx}>
              <div className="rc-sr-traj-head">
                <span>{traj.concept}</span>
                <span className="rc-sr-traj-badge">{traj.transition}</span>
              </div>
              <div className="rc-sr-traj-desc">{traj.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* Overall Chapter Progress Summary */}
      {overallSummary && (
        <div className="rc-sr-final">
          <div className="rc-sr-final-cap">Cumulative Chapter Assessment</div>
          <p>{overallSummary}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SHARED HELPERS — collapse to plain markup in print variant
// ─────────────────────────────────────────────────────────

function Reveal({ open, print, children }: { open: boolean; print: boolean; children: React.ReactNode }) {
  if (print) return open ? <div>{children}</div> : null;
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22 }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Chevron({ open, print }: { open: boolean; print: boolean }) {
  if (print) return <ChevronDown size={18} style={{ color: "var(--muted)" }} />;
  return (
    <motion.span
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: "flex", color: "var(--muted)" }}
    >
      <ChevronDown size={18} />
    </motion.span>
  );
}

/** A single labelled dial: an SVG ring with the number centered inside and the
 *  caption below the circle. Shared by the mastery + coverage chapter gauges. */
function Dial({ pct, color, label }: { pct: number; color: string; label: string }) {
  const r = 20;
  const ring = ringArc(r, pct);
  return (
    <div className="rc-ch-dial">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--rule)" strokeWidth="5" />
        <circle
          cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={ring.circ.toFixed(1)} strokeDashoffset={ring.offset.toFixed(1)} transform="rotate(-90 26 26)"
        />
        <text x="26" y="31" textAnchor="middle" fontFamily="var(--display)" fontWeight="700" fontSize="16" fill="var(--navy)">{pct}</text>
      </svg>
      <div className="rc-ch-dial-label">{label}</div>
    </div>
  );
}

/** Chapter gauge: twin dials — mastery (band-colored) and coverage/completion
 *  (subject accent) — side by side, each captioned below the circle. */
function ChapterGauge({ masteryPct, coveragePct, accent }: { masteryPct: number; coveragePct: number; accent: string }) {
  return (
    <div className="rc-ch-dials">
      <Dial pct={masteryPct} color={masteryColor(masteryPct / 100)} label="MASTERY" />
      <Dial pct={coveragePct} color={accent} label="COVERAGE" />
    </div>
  );
}

const MD_CLASSES = `rc-markdown prose prose-sm max-w-none
  prose-h3:font-serif prose-h3:text-[var(--navy)] prose-h3:font-medium prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2 prose-h3:first:mt-0
  prose-h4:text-[var(--navy)] prose-h4:font-semibold prose-h4:text-xs prose-h4:mt-3 prose-h4:mb-1
  prose-p:text-[var(--ink-2)] prose-p:my-1.5
  prose-li:text-[var(--ink-2)] prose-li:my-0.5
  prose-strong:text-[var(--navy)] prose-ul:my-1 prose-ul:pl-4`;

// ─────────────────────────────────────────────────────────
// PER-SECTION EMPTY STATE
// ─────────────────────────────────────────────────────────

function SectionEmpty({
  icon, message, when, cta, onCta, print,
}: {
  icon: React.ReactNode;
  message: string;
  when: string;
  cta?: string;
  onCta?: () => void;
  print: boolean;
}) {
  if (print) {
    // A complete document, not an app — one muted line.
    return <p style={{ fontSize: "13px", color: "var(--muted)", fontStyle: "italic" }}>{message}</p>;
  }
  return (
    <div className="rc-empty-sec">
      <div className="rc-empty-ico">{icon}</div>
      <div>
        <p className="rc-empty-msg">{message}</p>
        <div className="rc-empty-eyebrow">Unlocks when</div>
        <div className="rc-empty-when">{when}</div>
        {cta && onCta && (
          <button className="rc-empty-cta" onClick={onCta}>{cta}</button>
        )}
      </div>
    </div>
  );
}

function SectionHead({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <>
      <div className="rc-sec-head"><span className="rc-sec-n">{n}</span><h2>{title}</h2></div>
      <p className="rc-sec-sub">{sub}</p>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// TOPIC MASTERY (skill tree, collapsed by default)
// ─────────────────────────────────────────────────────────

function TopicMastery({ subject, data, ui }: { subject: string; data: ReportCardData; ui: ReportCardUI }) {
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

// ─────────────────────────────────────────────────────────
// SUBJECT CARD (chapters + learning arc + topic mastery)
// ─────────────────────────────────────────────────────────

function SubjectCard({ subj, si, data, ui }: { subj: SubjectData; si: number; data: ReportCardData; ui: ReportCardUI }) {
  const print = ui.variant === "print";
  const isOpen = ui.isSubjectOpen(subj.subject);
  const accent = SUBJECT_ACCENTS[si % SUBJECT_ACCENTS.length];
  const score = Math.round(subj.overall_score * 100);
  // Subjects section only: hide 0%-completion chapters (noise). Global counts
  // (summary tile, deriveUnlocks) still read data.chapters and are unaffected.
  const subjChapters = data.chapters.filter((c) => c.subject === subj.subject && c.completion_percentage > 0);
  const adapted = subjectAdapted(data.subjectEvolutions, subj.subject);
  const obsLimit = print ? 1 : 3;

  return (
    <div className="rc-subject-card">
      <div className="rc-sc-head" onClick={() => ui.toggleSubject(subj.subject)}>
        <div className="rc-sc-left">
          <div className="rc-sc-accent" style={{ background: accent }} />
          <div style={{ minWidth: 0 }}>
            <div className="rc-sc-title">{subj.subject}</div>
            <div className="rc-sc-headline">
              {subjChapters.length} chapter{subjChapters.length !== 1 ? "s" : ""} · {subj.session_count} session{subj.session_count !== 1 ? "s" : ""}
              {adapted ? " · trending up ↗" : ""}
            </div>
          </div>
        </div>
        <div className="rc-sc-right">
          <span className={`rc-chip ${bandClass(score)}`}>{bandFor(score)}</span>
          <span className="rc-sc-score">{score}%</span>
          <Chevron open={isOpen} print={print} />
        </div>
      </div>

      <Reveal open={isOpen} print={print}>
        <div className="rc-sc-body">
          {subjChapters.length === 0 && (
            <p style={{ fontSize: "13px", color: "var(--muted)" }}>No chapters recorded yet.</p>
          )}
          {subjChapters.map((ch) => {
            const chScore = Math.round(ch.mastery_score * 100);
            const evo = data.chapterEvolutions.find(
              (e) => e.subject === subj.subject && e.document_title === ch.document_title
            );
            const chapterKey = `${subj.subject}::${ch.document_title}`;
            const arcOpen = ui.isExpOpen(`${chapterKey}::arc`);
            const logOpen = ui.isExpOpen(`${chapterKey}::log`);
            const reportOpen = ui.isExpOpen(`${chapterKey}::report`);
            const arc = buildChapterArc(evo);

            return (
              <div key={chapterKey}>
                <div className="rc-chapter-row" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "16px", alignItems: "center" }}>
                  <div>
                    <div className="rc-ch-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>{ch.document_title}</span>
                      {ch.status && (
                        <span style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: ch.status === "completed" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                          color: ch.status === "completed" ? "#048a5d" : "#b36b00",
                          border: `1px solid ${ch.status === "completed" ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`
                        }}>
                          {ch.status === "completed" ? "Completed" : "In Progress"}
                        </span>
                      )}
                    </div>
                    <div className="rc-ch-subline">
                      <span className="rc-ch-band" style={{ color: masteryColor(ch.mastery_score) }}>{bandFor(chScore)}</span>
                      <span className="rc-ch-time">
                        <Clock size={12} />
                        {ch.time_minutes != null
                          ? `${Math.round(ch.time_minutes)} min · ${ch.time_sessions ?? ch.study_count} session${(ch.time_sessions ?? ch.study_count) !== 1 ? "s" : ""}`
                          : `${ch.study_count} session${ch.study_count !== 1 ? "s" : ""}`}
                      </span>
                    </div>
                  </div>

                  <ChapterGauge masteryPct={chScore} coveragePct={Math.round(ch.completion_percentage)} accent={accent} />
                </div>

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
                            {arc.dimensions.map((d: any, i: number) => {
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
              </div>
            );
          })}

          <TopicMastery subject={subj.subject} data={data} ui={ui} />
        </div>
      </Reveal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TEST ITEM (expandable to section-wise breakdown)
// ─────────────────────────────────────────────────────────

function TestItem({ t, ui }: { t: ReportCardData["testSubmissions"][number]; ui: ReportCardUI }) {
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

// ─────────────────────────────────────────────────────────
// MAIN BODY
// ─────────────────────────────────────────────────────────

export function ReportCardBody({ data, ui }: { data: ReportCardData; ui: ReportCardUI }) {
  const print = ui.variant === "print";
  const {
    subjects, chapters, testSubmissions, progressReport, subjectEvolutions,
    displayName, firstName, displayGrade, displayBoard, totalSessions, overallAvg,
    generatedAt, reportPeriod,
  } = data;

  const aiInsights = progressReport?.report_json || {};
  const isBrandNew = totalSessions === 0 && subjects.length === 0 && !progressReport;
  const strengths: string[] = (aiInsights as any)?.universal_strengths ?? [];
  const weaknesses: string[] = (aiInsights as any)?.universal_weaknesses ?? [];
  const focusAreas: any[] = (aiInsights as any)?.focus_areas ?? [];
  const patterns: any[] = (aiInsights as any)?.cross_subject_patterns ?? [];
  const agg = testAggregate(testSubmissions);
  const pendingSubjects = pendingTrendSubjects(subjects, subjectEvolutions);
  const unlocks = deriveUnlocks(data);
  const insightCoverage = progressReport?.subject_count ?? 0;

  const bandLegend = [
    { lbl: "Developing", range: "< 40", color: "#EF4444" },
    { lbl: "Approaching", range: "40–59", color: "#F59E0B" },
    { lbl: "Proficient", range: "60–79", color: "#10B981" },
    { lbl: "Advanced", range: "80+", color: "#059F6D" },
  ];

  return (
    <div className="rc-wrap">
      {/* ── HEADER ── */}
      <header className="rc-head" id="rc-summary">
        <div className="rc-head-top">
          <div className="rc-eyebrow" style={{ margin: 0 }}>Learner Report · {reportPeriod}</div>
          <div className="rc-report-no">AR-{generatedAt.replace(/\s/g, "").toUpperCase()}</div>
        </div>
        <h1>{progressReport?.headline ? <>{displayName} — <em>{progressReport.headline}</em></> : <>{displayName} — Learning Report</>}</h1>
        <p className="rc-deck">{progressReport?.overall_assessment ?? `A snapshot of ${firstName}'s learning progress so far.`}</p>
        <div className="rc-meta-row">
          <div className="rc-meta-item"><span className="k">Student</span><span className="v">{displayName}</span></div>
          <div className="rc-meta-item"><span className="k">Grade · Board</span><span className="v">{displayGrade ?? "—"} · {displayBoard ?? "—"}</span></div>
          <div className="rc-meta-item"><span className="k">Sessions</span><span className="v">{totalSessions}</span></div>
          <div className="rc-meta-item"><span className="k">Issued</span><span className="v">{generatedAt}</span></div>
        </div>

        {!isBrandNew && (
          <>
            <div className="rc-summary">
              <div className="rc-summary-grid">
                <div>
                  <div className="rc-summary-lead-label">The Short Version</div>
                  <div className="rc-summary-lead">
                    {progressReport?.overall_assessment
                      ? progressReport.overall_assessment
                      : subjects.length > 0
                      ? `${firstName} is currently ${subjects.map((s) => `${bandFor(s.overall_score * 100).toLowerCase()} in ${s.subject}`).join(", ")}.`
                      : "Insights will appear here as sessions accumulate."}
                  </div>
                </div>
                <div className="rc-summary-stats">
                  <div className="rc-sstat"><div className="num">{totalSessions}</div><div className="lbl">Sessions</div></div>
                  <div className="rc-sstat"><div className="num">{chapters.length}</div><div className="lbl">Chapters</div></div>
                  <div className="rc-sstat"><div className="num">{testSubmissions.length}</div><div className="lbl">Tests</div></div>
                  <div className="rc-sstat"><div className="num">{Math.round(overallAvg * 100)}%</div><div className="lbl">Avg. Mastery</div></div>
                </div>
              </div>
              {subjects.length > 0 && (
                <div className="rc-subject-dials">
                  {subjects.map((s) => {
                    const score = Math.round(s.overall_score * 100);
                    const r = 16;
                    const circ = 2 * Math.PI * r;
                    const offset = circ * (1 - score / 100);
                    const adapted = subjectAdapted(subjectEvolutions, s.subject);
                    return (
                      <div className="rc-dial" key={s.subject}>
                        <svg viewBox="0 0 40 40">
                          <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="4" />
                          <circle cx="20" cy="20" r={r} fill="none" stroke="#5EEAD4" strokeWidth="4" strokeDasharray={circ.toFixed(1)} strokeDashoffset={offset.toFixed(1)} strokeLinecap="round" transform="rotate(-90 20 20)" />
                          <text x="20" y="24" textAnchor="middle" fontFamily="var(--display)" fontWeight="700" fontSize="14" fill="#fff">{score}</text>
                        </svg>
                        <div className="rc-dial-txt">
                          <div className="name">{s.subject}</div>
                          <div className="band">{bandFor(score)}{adapted && <span className="rc-dial-trend">↗</span>}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rc-band-legend">
              {bandLegend.map((b) => (
                <span className="item" key={b.lbl}>
                  <span className="dot" style={{ background: b.color }} />
                  <span className="lbl">{b.lbl}</span>&nbsp;<span>{b.range}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </header>

      {isBrandNew ? (
        <div className="rc-empty">
          <p>No sessions yet. {firstName}&apos;s report will appear here after the first learning session — every score and insight below is generated from real session activity, so there&apos;s nothing to show until then.</p>
          <div className="rc-howto">
            <div className="rc-howto-title">How this report builds</div>
            {[
              { t: <><b>1 session</b> → subject &amp; chapter scores appear</> },
              { t: <><b>2+ sessions on a chapter</b> → its learning-arc analysis unlocks</> },
              { t: <><b>2+ chapters in a subject</b> → subject learning trends</> },
              { t: <><b>An analysed subject</b> → cross-subject AI insights</> },
            ].map((s, i) => (
              <div className="rc-howto-step" key={i}>
                <div className="rc-howto-n">{i + 1}</div>
                <div className="rc-howto-txt">{s.t}</div>
              </div>
            ))}
          </div>
          {ui.role === "student" && ui.onStartSession && !print && (
            <div className="rc-cta-center">
              <button className="rc-empty-cta" onClick={ui.onStartSession}>Start your first session</button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ── 01 SUBJECTS & CHAPTERS ── */}
          <div className="pb" />
          <section className="rc-section" id="rc-subjects">
            <SectionHead n="01" title="Subjects & Chapters" sub="Tap a subject to see chapter-level mastery, the learning arc across sessions, skill dimensions, and topic mastery." />
            {subjects.length === 0 ? (
              <SectionEmpty
                print={print}
                icon={<BookOpen size={18} />}
                message={`Subject scores are being built from ${firstName}'s sessions.`}
                when="Chapter-level mastery appears once a chapter session completes."
              />
            ) : (
              subjects.map((subj, si) => <SubjectCard key={subj.subject} subj={subj} si={si} data={data} ui={ui} />)
            )}
          </section>

          {/* ── 02 CHAPTER TESTS ── */}
          <div className="pb" />
          <section className="rc-section" id="rc-tests">
            <SectionHead n="02" title="Chapter Tests" sub={testSubmissions.length > 0 ? `${testSubmissions.length} test${testSubmissions.length !== 1 ? "s" : ""} submitted this term.` : "ZPD-calibrated tests with section-by-section breakdowns."} />
            {testSubmissions.length === 0 ? (
              <SectionEmpty
                print={print}
                icon={<FileText size={18} />}
                message="No chapter tests taken yet."
                when="Take a chapter test from any completed chapter to see scores and a section-by-section breakdown here."
              />
            ) : (
              <>
                {agg && agg.total >= 2 && (
                  <div className="rc-test-agg">Average {Math.round(agg.avg * 100)}% · {agg.passed}/{agg.total} passed</div>
                )}
                {testSubmissions.map((t) => <TestItem key={t.submission_id} t={t} ui={ui} />)}
              </>
            )}
          </section>

          {/* ── 03 AI LEARNING INSIGHTS ── */}
          <div className="pb" />
          <section className="rc-section" id="rc-insights">
            <SectionHead n="03" title="AI Learning Insights" sub="Cross-subject patterns synthesised from all sessions this term." />
            {!progressReport ? (
              <SectionEmpty
                print={print}
                icon={<Brain size={18} />}
                message="AI insights are generated once there's enough signal."
                when="Complete 2+ sessions on a chapter to unlock its analysis; cross-subject insights synthesise once at least one subject is fully analysed."
              />
            ) : (
              <>
                {subjects.length > 0 && insightCoverage > 0 && insightCoverage < subjects.length && (
                  <p className="rc-partial-note">Based on {insightCoverage} of {subjects.length} subjects — the rest unlock as sessions accumulate.</p>
                )}
                {progressReport.headline && (
                  <div className="rc-hero">
                    <blockquote>&quot;{progressReport.headline}&quot;</blockquote>
                    {progressReport.overall_assessment && (
                      <>
                        <p className={`rc-clamp ${print || ui.isClampOpen("overall") ? "" : "collapsed"}`}>{progressReport.overall_assessment}</p>
                        {!print && (
                          <button className="rc-more-btn" onClick={() => ui.toggleClamp("overall")}>
                            {ui.isClampOpen("overall") ? "Show less" : "Read full analysis"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {(strengths.length > 0 || weaknesses.length > 0) && (
                  <div className="rc-two-col">
                    {strengths.length > 0 && (
                      <div className="rc-list-card strength">
                        <h4>Universal Strengths</h4>
                        <ul>{strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </div>
                    )}
                    {weaknesses.length > 0 && (
                      <div className="rc-list-card weakness">
                        <h4>Areas to Improve</h4>
                        <ul>{weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
                      </div>
                    )}
                  </div>
                )}

                {focusAreas.length > 0 && (() => {
                  const faOpen = ui.isExpOpen("focus-areas");
                  return (
                    <div className="rc-expander" style={{ marginTop: "20px" }}>
                      <button className="rc-expander-btn" onClick={() => ui.toggleExp("focus-areas")}>
                        <span>🎯 Focus areas for next term ({focusAreas.length})</span>
                        <span className="plus" style={{ transform: faOpen ? "rotate(45deg)" : "none" }}>+</span>
                      </button>
                      <Reveal open={faOpen} print={print}>
                        <div className="rc-expander-panel">
                          {focusAreas.map((fa, i) => {
                            const pri = (fa.priority ?? "medium").toLowerCase();
                            return (
                              <div className="rc-focus-row" key={i}>
                                <span className={`rc-pri ${pri}`}>{pri.toUpperCase()}</span>
                                <div>
                                  <div className="rc-focus-area">{fa.area}</div>
                                  {(fa.suggested_approach || fa.rationale) && (
                                    <div className="rc-focus-rat">{fa.suggested_approach ?? fa.rationale}</div>
                                  )}
                                  {fa.subject && <div className="rc-focus-tag">{fa.subject}</div>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Reveal>
                    </div>
                  );
                })()}

                {patterns.length > 0 && (
                  <div className="rc-pat-grid">
                    {patterns.map((p, i) => (
                      <div className={`rc-pat-card ${p.is_positive ? "good" : "warn"}`} key={i}>
                        <div className="rc-pat-name">{p.is_positive ? "✓" : "⚠"} {p.pattern_name}</div>
                        <div className="rc-pat-desc">{p.summary ?? p.description}</div>
                        {p.subjects && <div className="rc-pat-subjects">{Array.isArray(p.subjects) ? p.subjects.join(" · ") : p.subjects}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* ── 04 SUBJECT LEARNING TRENDS ── */}
          <div className="pb" />
          <section className="rc-section" id="rc-trends">
            <SectionHead n="04" title="Subject Learning Trends" sub="How each subject evolved chapter to chapter." />
            {subjectEvolutions.length === 0 ? (
              <SectionEmpty
                print={print}
                icon={<Activity size={18} />}
                message="Subject trend analysis appears after studying 2+ chapters in a subject."
                when="Keep going in each subject — trends compare performance chapter to chapter."
              />
            ) : (
              <>
                {subjectEvolutions.map((evo) => {
                  const sj = evo.analysis_json ?? ({} as any);
                  const s: string[] = sj.universal_strengths ?? sj.subject_strengths ?? [];
                  const w: string[] = sj.universal_weaknesses ?? sj.subject_weaknesses ?? [];
                  const pats: any[] = sj.cross_chapter_patterns ?? [];
                  const recs: any[] = sj.recommendations ?? [];
                  const key = `trend::${evo.subject}`;
                  const isOpen = ui.isExpOpen(key);
                  const clampKey = `trend-clamp::${evo.subject}`;
                  const clampOpen = print || ui.isClampOpen(clampKey);
                  return (
                    <div className="rc-expander" key={evo.subject} style={{ marginTop: "12px" }}>
                      <button className="rc-expander-btn" onClick={() => ui.toggleExp(key)}>
                        <span>📘 {evo.subject} — {evo.chapter_count} chapter{evo.chapter_count !== 1 ? "s" : ""}{evo.overall_adapted ? " · trending up" : ""}</span>
                        <span className="plus" style={{ transform: isOpen ? "rotate(45deg)" : "none" }}>+</span>
                      </button>
                      <Reveal open={isOpen} print={print}>
                        <div className="rc-expander-panel">
                          {evo.headline && (
                            <p style={{ fontFamily: "var(--display)", fontStyle: "italic", color: "var(--navy)", fontSize: "15px", margin: "0 0 10px" }}>&quot;{evo.headline}&quot;</p>
                          )}
                          {evo.subject_skill_trajectory && (
                            <>
                              <p className={`rc-clamp ${clampOpen ? "" : "collapsed"}`} style={{ WebkitLineClamp: clampOpen ? "unset" : 2 } as any}>{evo.subject_skill_trajectory}</p>
                              {!print && (
                                <button className="rc-more-btn" onClick={() => ui.toggleClamp(clampKey)}>
                                  {ui.isClampOpen(clampKey) ? "Show less" : "Read more"}
                                </button>
                              )}
                            </>
                          )}
                          {(s.length > 0 || w.length > 0) && (
                            <div className="rc-two-col" style={{ marginTop: "14px" }}>
                              {s.length > 0 && <div className="rc-list-card strength"><h4>Strengths</h4><ul>{s.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
                              {w.length > 0 && <div className="rc-list-card weakness"><h4>Weaknesses</h4><ul>{w.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
                            </div>
                          )}
                          {recs.length > 0 && (
                            <div style={{ marginTop: "14px" }}>
                              <h4 style={{ margin: "0 0 6px", font: "600 10.5px/1 var(--mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>Recommendations</h4>
                              <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12.5px", color: "var(--ink-2)", lineHeight: 1.65 }}>
                                {recs.map((r, i) => <li key={i}>{typeof r === "string" ? r : (r.action ?? r.recommendation ?? r.text ?? "")}</li>)}
                              </ul>
                            </div>
                          )}
                          {pats.length > 0 && (
                            <div className="rc-dim-grid" style={{ marginTop: "14px" }}>
                              {pats.slice(0, 4).map((p: any, i: number) => (
                                <div className="rc-dim-card" key={i}>
                                  <div className="rc-dim-head"><span>{p.pattern_name}</span></div>
                                  <div className="rc-dim-obs">{p.summary ?? p.description}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </Reveal>
                    </div>
                  );
                })}
                {!print && pendingSubjects.map((s) => (
                  <div className="rc-pending-row" key={s.subject}>
                    <span className="ico">📘</span>
                    <span>{s.subject} — trend analysis pending · unlocks after 2+ chapters</span>
                  </div>
                ))}
              </>
            )}
          </section>

          {/* ── FOOTER (screen only) ── */}
          {!print && (
            <>
              {unlocks.length > 0 && (
                <div className="rc-unlocks">
                  <div className="rc-unlocks-title"><Lock size={11} /> What unlocks next</div>
                  {unlocks.map((u, i) => (
                    <div className="rc-unlock-row" key={i}>
                      <span className="rc-unlock-lock">○</span>
                      <span className="rc-unlock-label">{u.label}</span>
                      <span className="rc-unlock-detail">{u.detail}</span>
                    </div>
                  ))}
                </div>
              )}
              <footer className="rc-foot">
                {ui.canDownload && (
                  <>
                    <button className="rc-print-btn" onClick={ui.onPrint} disabled={ui.isPdfGenerating}>
                      {ui.isPdfGenerating ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "rc-spin 1s linear infinite" }}>
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                          Preparing PDF…
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" />
                          </svg>
                          Download PDF
                        </>
                      )}
                    </button>
                    <div className="rc-foot-note">Opens your browser&apos;s print dialog — choose “Save as PDF”.</div>
                  </>
                )}
                <div className="rc-foot-note">GenEducation Report Card v2</div>
              </footer>
            </>
          )}

          {print && (
            <div className="rc-print-footer">{displayName} · GenEducation Learner Report · {generatedAt}</div>
          )}
        </>
      )}
    </div>
  );
}
