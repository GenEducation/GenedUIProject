// The printable report card (ReportCardPrint). One stylesheet, class-prefixed `rcp-`, injected beside the portal styles.
// Colours are the screen card's palette; page breaks keep a chapter row, a heading and a note together on one page.
export const RC_PRINT_REPORT_STYLES = `
  .rcp { --ink:#122D30; --soft:#5E7477; --line:#E1EAE6; --mint:#DCEBE7; --brand:#075E63; --citron:#D9F279; --wash:#F7F9F5;
    --good:#2F7D4F; --warn:#B4531A; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: var(--ink); font-size: 12px; line-height: 1.45;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
  .rcp h1, .rcp h2, .rcp h3, .rcp h4, .rcp p, .rcp ul { margin: 0; }
  .rcp ul { padding: 0; list-style: none; }
  .rcp-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; padding-bottom: 12px; border-bottom: 3px solid var(--brand); }
  .rcp-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--brand); }
  .rcp-name { font-size: 26px; font-weight: 800; letter-spacing: -.02em; margin-top: 2px; }
  .rcp-meta { color: var(--soft); font-size: 12.5px; margin-top: 2px; }
  .rcp-when { text-align: right; color: var(--soft); font-size: 11px; }
  .rcp-when b { display: block; color: var(--ink); font-size: 13px; }
  .rcp-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 14px; }
  .rcp-kpi { border: 1px solid var(--line); border-radius: 10px; padding: 9px 12px; background: var(--wash); break-inside: avoid; }
  .rcp-kpi b { display: block; font-size: 19px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .rcp-kpi span { font-size: 10.5px; color: var(--soft); }
  .rcp-sec { margin-top: 18px; }
  .rcp-sec > h2 { font-size: 14px; font-weight: 800; padding-bottom: 5px; border-bottom: 1px solid var(--line); margin-bottom: 9px; break-after: avoid; }
  .rcp-note { border: 1px solid var(--line); border-left: 4px solid var(--brand); border-radius: 10px; padding: 11px 14px; break-inside: avoid; }
  .rcp-headline { font-size: 14px; font-weight: 700; line-height: 1.35; }
  .rcp-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
  .rcp-box { border: 1px solid var(--line); border-radius: 10px; padding: 9px 12px; break-inside: avoid; }
  .rcp-box--good { background: #F1F8F3; } .rcp-box--warn { background: #FFF6EE; } .rcp-box--steps { margin-top: 10px; background: var(--wash); }
  .rcp-box h3 { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 5px; }
  .rcp-box--good h3 { color: var(--good); } .rcp-box--warn h3 { color: var(--warn); } .rcp-box--steps h3 { color: var(--brand); }
  .rcp-box li { margin-top: 5px; } .rcp-box li:first-of-type { margin-top: 0; }
  .rcp-because { display: block; color: var(--soft); font-size: 10px; margin-top: 1px; }
  .rcp-fine { color: var(--soft); font-size: 10px; margin-top: 7px; }
  .rcp-chart { display: block; width: 100%; height: 76px; }
  .rcp-bar { fill: var(--brand); } .rcp-bar--none { fill: var(--line); } .rcp-axis { stroke: var(--line); stroke-width: 1; }
  .rcp-tick { font-size: 8px; fill: var(--soft); }
  .rcp-spark { stroke: var(--brand); stroke-width: 2; fill: none; } .rcp-dot { fill: var(--brand); }
  .rcp-subject { margin-top: 16px; }
  .rcp-subject-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 12px; border-radius: 10px; background: var(--mint); break-after: avoid; break-inside: avoid; }
  .rcp-subject-head h3 { font-size: 15px; font-weight: 800; }
  .rcp-subject-head p { font-size: 11px; color: var(--soft); }
  .rcp-subject-head .rcp-mastery { font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; text-align: right; }
  .rcp-subject-head .rcp-mastery small { display: block; font-size: 10px; font-weight: 600; color: var(--soft); }
  .rcp-subject-note { margin-top: 8px; font-size: 12px; break-inside: avoid; }
  .rcp-subject-note b { font-weight: 700; }
  .rcp-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .rcp-table th { text-align: left; font-size: 9.5px; text-transform: uppercase; letter-spacing: .05em; color: var(--soft); padding: 3px 6px; border-bottom: 1px solid var(--line); }
  .rcp-table td { padding: 5px 6px; vertical-align: top; border-bottom: 1px solid var(--line); }
  .rcp-table tr { break-inside: avoid; }
  .rcp-table .rcp-num { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .rcp-table .rcp-skills td { border-bottom: 1px solid var(--line); padding: 0 6px 6px 30px; color: var(--soft); font-size: 10.5px; }
  .rcp-chip { display: inline-block; border: 1px solid var(--line); border-radius: 999px; padding: 0 7px; margin: 2px 4px 0 0; color: var(--ink); background: #fff; }
  .rcp-chip--flag { border-color: #E8B98F; background: #FFF6EE; }
  .rcp-mix li { margin-top: 5px; break-inside: avoid; }
  .rcp-tag { display: inline-block; border-radius: 999px; padding: 0 7px; font-size: 10px; font-weight: 700; margin-right: 6px; }
  .rcp-tag--open { background: #FFF0E0; color: var(--warn); } .rcp-tag--done { background: #E5F3EA; color: var(--good); }
  .rcp-foot { margin-top: 20px; padding-top: 8px; border-top: 1px solid var(--line); color: var(--soft); font-size: 10px; }
`;
