"use client";

import ReactMarkdown from "react-markdown";
import { Sparkles, User, Target, TrendingUp } from "lucide-react";

export const MD_CLASSES = `rc-markdown prose prose-sm max-w-none
  prose-h3:font-serif prose-h3:text-[var(--navy)] prose-h3:font-medium prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2 prose-h3:first:mt-0
  prose-h4:text-[var(--navy)] prose-h4:font-semibold prose-h4:text-xs prose-h4:mt-3 prose-h4:mb-1
  prose-p:text-[var(--ink-2)] prose-p:my-1.5
  prose-li:text-[var(--ink-2)] prose-li:my-0.5
  prose-strong:text-[var(--navy)] prose-ul:my-1 prose-ul:pl-4`;

// ─────────────────────────────────────────────────────────
// STRUCTURED SESSION REPORT RENDERER
// ─────────────────────────────────────────────────────────

export function SessionReportViewer({ reportText }: { reportText: string }) {
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
