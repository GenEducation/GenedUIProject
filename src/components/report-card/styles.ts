// Bespoke editorial "report document" design system for the student report
// card. One stylesheet string, injected once by the container. Screen + print.

export const RC_STYLES = `
  :root {
    --navy:#042E5C; --emerald:#059F6D; --bg:#F7F6F2; --border:#E4E1D8; --text:#1B2430; --muted:#6B7280;
    --surface:#ffffff; --surface-2:#FBFAF6; --rule:#EDEAE0; --ink-2:#334155;
    --adv-fg:#047857; --adv-bg:#ECFDF5; --adv-bd:#A7F3D0;
    --pro-fg:#1D4ED8; --pro-bg:#EFF6FF; --pro-bd:#BFDBFE;
    --app-fg:#B45309; --app-bg:#FFFBEB; --app-bd:#FDE68A;
    --dev-fg:#BE123C; --dev-bg:#FFF1F2; --dev-bd:#FECDD3;
    --r:10px; --r-sm:6px; --r-lg:16px;
    --sans:'Inter',sans-serif; --display:'Source Serif 4',Charter,Georgia,serif; --mono:'JetBrains Mono',monospace;
    --shadow: 0 1px 2px rgba(4,46,92,.04), 0 8px 24px -12px rgba(4,46,92,.10);
  }
  .report-root { background: var(--bg); font-family: var(--sans); color: var(--text); font-size: 15px; line-height: 1.55; }
  .rc-wrap { max-width: 1080px; margin: 0 auto; padding: 0 28px 60px; }

  /* header */
  .rc-head { padding: 36px 0 26px; border-bottom: 1px solid var(--border); }
  .rc-head-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
  .rc-brand-row { display: flex; align-items: center; gap: 10px; }
  .rc-brand-mark { width: 28px; height: 28px; border-radius: 7px; background: var(--navy); color: #fff; display: flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 700; font-size: 15px; }
  .rc-brand-name { font-family: var(--mono); font-size: 12px; letter-spacing: .06em; color: var(--navy); font-weight: 600; }
  .rc-report-no { font-family: var(--mono); font-size: 11px; color: var(--muted); }
  .rc-eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--emerald); font-weight: 600; margin: 20px 0 10px; }
  .rc-head h1 { font-family: var(--display); font-weight: 600; font-size: 32px; line-height: 1.2; margin: 0 0 12px; color: var(--navy); }
  .rc-head h1 em { font-style: italic; color: var(--emerald); }
  .rc-deck { font-size: 15px; color: var(--muted); max-width: 640px; margin: 0 0 20px; }
  .rc-meta-row { display: flex; gap: 26px; flex-wrap: wrap; font-size: 12.5px; }
  .rc-meta-item { display: flex; flex-direction: column; gap: 2px; }
  .rc-meta-item .k { font-family: var(--mono); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
  .rc-meta-item .v { font-weight: 600; color: var(--navy); }

  /* mastery-band legend */
  .rc-band-legend { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 18px; padding-top: 16px; border-top: 1px dashed var(--rule); }
  .rc-band-legend .item { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--muted); }
  .rc-band-legend .dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .rc-band-legend .lbl { font-weight: 600; color: var(--text); }

  /* summary band */
  .rc-summary { margin-top: 22px; background: linear-gradient(160deg,var(--navy),#06407D); border-radius: var(--r-lg); padding: 26px 26px 22px; color: #fff; box-shadow: var(--shadow); }
  .rc-summary-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 26px; }
  .rc-summary-lead-label { font-family: var(--mono); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: #8FB4DE; margin-bottom: 8px; }
  .rc-summary-lead { font-family: var(--display); font-size: 18px; line-height: 1.5; font-weight: 500; }
  .rc-summary-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; align-content: start; }
  .rc-sstat { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); border-radius: var(--r); padding: 11px 13px; }
  .rc-sstat .num { font-family: var(--display); font-size: 21px; font-weight: 700; }
  .rc-sstat .lbl { font-size: 10.5px; color: #B9D0E8; margin-top: 2px; }
  .rc-subject-dials { display: flex; gap: 12px; margin-top: 18px; flex-wrap: wrap; }
  .rc-dial { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); border-radius: 999px; padding: 6px 14px 6px 6px; }
  .rc-dial svg { width: 36px; height: 36px; }
  .rc-dial-txt .name { font-size: 12.5px; font-weight: 600; }
  .rc-dial-txt .band { font-size: 10.5px; color: #B9D0E8; display: inline-flex; align-items: center; gap: 3px; }
  .rc-dial-trend { color: #5EEAD4; font-weight: 700; }

  /* section framework */
  .rc-section { padding: 40px 0; border-bottom: 1px solid var(--border); }
  .rc-section:last-of-type { border-bottom: none; }
  .rc-sec-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 6px; }
  .rc-sec-n { font-family: var(--mono); font-size: 12px; color: var(--emerald); font-weight: 700; }
  .rc-sec-head h2 { font-family: var(--display); font-size: 22px; font-weight: 600; margin: 0; color: var(--navy); }
  .rc-sec-sub { color: var(--muted); font-size: 13px; margin: 0 0 20px; max-width: 620px; }

  /* subject cards */
  .rc-subject-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); margin-bottom: 16px; overflow: hidden; box-shadow: var(--shadow); }
  .rc-sc-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 20px; border-bottom: 1px solid var(--rule); cursor: pointer; background: var(--surface-2); }
  .rc-sc-head:hover { background: #F5F3EC; }
  .rc-sc-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .rc-sc-accent { width: 5px; height: 34px; border-radius: 3px; flex-shrink: 0; }
  .rc-sc-title { font-family: var(--display); font-size: 17px; font-weight: 600; color: var(--navy); }
  .rc-sc-headline { font-size: 12px; color: var(--muted); margin-top: 2px; font-style: italic; }
  .rc-sc-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
  .rc-chip { font-family: var(--mono); font-size: 10.5px; font-weight: 600; padding: 4px 10px; border-radius: 999px; border: 1px solid; letter-spacing: .02em; white-space: nowrap; }
  .rc-chip.advanced { color: var(--adv-fg); background: var(--adv-bg); border-color: var(--adv-bd); }
  .rc-chip.proficient { color: var(--pro-fg); background: var(--pro-bg); border-color: var(--pro-bd); }
  .rc-chip.approaching { color: var(--app-fg); background: var(--app-bg); border-color: var(--app-bd); }
  .rc-chip.developing { color: var(--dev-fg); background: var(--dev-bg); border-color: var(--dev-bd); }
  .rc-chip.sm { font-size: 10px; padding: 3px 8px; }
  .rc-sc-score { font-family: var(--display); font-weight: 700; font-size: 20px; color: var(--navy); min-width: 44px; text-align: right; }
  .rc-sc-body { padding: 18px 20px 20px; }

  .rc-chapter-row { display: grid; grid-template-columns: 1fr auto 110px; gap: 14px; align-items: center; padding: 11px 0; border-bottom: 1px solid var(--rule); }
  .rc-chapter-row:last-child { border-bottom: none; }
  .rc-ch-title { font-weight: 600; font-size: 13.5px; color: var(--text); }
  .rc-ch-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .rc-ch-mastery { font-family: var(--mono); font-size: 12px; font-weight: 600; color: var(--navy); text-align: right; }
  .rc-bar-track { height: 6px; background: var(--rule); border-radius: 99px; overflow: hidden; width: 110px; position: relative; }
  .rc-bar-fill { height: 100%; border-radius: 99px; }
  .rc-bar-track.thin { height: 3px; margin-top: 4px; }
  .rc-ch-hint { font-size: 11px; color: var(--muted); font-style: italic; padding: 2px 0 8px; }

  /* expanders */
  .rc-expander { margin-top: 14px; border: 1px solid var(--rule); border-radius: var(--r); overflow: hidden; }
  .rc-expander-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--surface-2); border: none; padding: 11px 16px; cursor: pointer; text-align: left; font-family: var(--sans); font-size: 12.5px; font-weight: 600; color: var(--navy); }
  .rc-expander-btn:hover { background: #F2F0E8; }
  .rc-expander-btn .plus { font-family: var(--mono); font-size: 15px; color: var(--emerald); transition: transform .2s; display: inline-block; }
  .rc-expander-panel { padding: 16px 18px 18px; border-top: 1px solid var(--rule); background: #fff; }

  .rc-clamp { font-size: 13.5px; color: var(--ink-2); line-height: 1.6; }
  .rc-clamp.collapsed { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .rc-more-btn { background: none; border: none; color: var(--emerald); font-weight: 600; font-size: 12.5px; cursor: pointer; padding: 6px 0 0; font-family: var(--sans); }

  .rc-dim-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(200px,1fr)); gap: 10px; margin-top: 12px; }
  .rc-dim-card { background: var(--surface-2); border: 1px solid var(--rule); border-radius: var(--r-sm); padding: 10px 12px; }
  .rc-dim-head { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 600; gap: 6px; }
  .rc-dim-delta { font-family: var(--mono); font-size: 10.5px; font-weight: 700; padding: 1px 6px; border-radius: 5px; white-space: nowrap; }
  .rc-dim-delta.up { color: var(--adv-fg); background: var(--adv-bg); }
  .rc-dim-delta.down { color: var(--dev-fg); background: var(--dev-bg); }
  .rc-dim-obs { font-size: 11.5px; color: var(--muted); margin-top: 6px; line-height: 1.5; }

  .rc-log-row { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px dashed var(--rule); font-size: 12.5px; }
  .rc-log-row:last-child { border-bottom: none; }
  .rc-log-idx { font-family: var(--mono); color: var(--muted); width: 20px; flex-shrink: 0; }
  .rc-log-stage { font-weight: 600; color: var(--navy); margin-bottom: 2px; }
  .rc-log-obs { color: var(--muted); font-size: 12px; margin: 0; padding-left: 16px; }

  .rc-spark-wrap { margin-top: 4px; }
  .rc-spark-grid-label { font-family: var(--mono); font-size: 8.5px; fill: #9AA6B2; }
  .rc-spark-legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 10.5px; color: var(--muted); margin-top: 6px; }
  .rc-spark-legend span { display: inline-flex; align-items: center; gap: 4px; }
  .rc-spark-legend i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

  /* topic mastery */
  .rc-topic-strip { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
  .rc-topic-line { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .rc-topic-line .cap { font-family: var(--mono); font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); flex-shrink: 0; min-width: 66px; }
  .rc-topic-chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .rc-cg-row { display: grid; grid-template-columns: 1fr auto 96px; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--rule); }
  .rc-cg-row:last-child { border-bottom: none; }
  .rc-cg-toggle { display: flex; align-items: center; gap: 8px; background: none; border: none; cursor: pointer; font-family: var(--sans); text-align: left; padding: 0; min-width: 0; }
  .rc-cg-toggle .plus { font-family: var(--mono); color: var(--emerald); font-size: 14px; width: 12px; }
  .rc-cg-name { font-weight: 600; font-size: 13px; color: var(--navy); }
  .rc-cg-panel { padding: 6px 0 10px 20px; }
  .rc-concept-name { font-family: var(--mono); font-size: 9.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin: 10px 0 6px; }
  .rc-lo-row { display: grid; grid-template-columns: 10px 1fr auto auto; gap: 10px; align-items: center; padding: 5px 0; }
  .rc-lo-dot { width: 8px; height: 8px; border-radius: 50%; }
  .rc-lo-name { font-size: 12.5px; color: var(--text); }
  .rc-lo-just { font-size: 11px; color: var(--muted); line-height: 1.45; margin: 2px 0 0; grid-column: 2 / -1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .rc-lo-pct { font-family: var(--mono); font-size: 11.5px; font-weight: 600; }
  .rc-lo-meta { font-family: var(--mono); font-size: 10px; color: var(--muted); white-space: nowrap; }

  /* tests */
  .rc-test-item { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); margin-bottom: 8px; overflow: hidden; box-shadow: var(--shadow); }
  .rc-test-row { display: grid; grid-template-columns: 1fr auto auto auto auto; gap: 16px; align-items: center; padding: 13px 16px; cursor: pointer; }
  .rc-test-row:hover { background: var(--surface-2); }
  .rc-test-title { font-weight: 600; font-size: 13.5px; }
  .rc-test-sub { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
  .rc-test-score { font-family: var(--display); font-weight: 700; font-size: 18px; color: var(--navy); }
  .rc-test-date { font-family: var(--mono); font-size: 11px; color: var(--muted); }
  .rc-verdict { font-family: var(--mono); font-size: 10.5px; font-weight: 700; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
  .rc-verdict.pass { color: var(--adv-fg); background: var(--adv-bg); }
  .rc-verdict.fail { color: var(--dev-fg); background: var(--dev-bg); }
  .rc-test-plus { font-family: var(--mono); color: var(--emerald); font-size: 15px; }
  .rc-test-panel { padding: 4px 16px 14px; border-top: 1px solid var(--rule); background: var(--surface-2); }
  .rc-test-agg { font-family: var(--mono); font-size: 11.5px; color: var(--muted); margin: -8px 0 14px; }
  .rc-sec-bar-row { display: grid; grid-template-columns: 1fr 60px 90px auto; gap: 10px; align-items: center; padding: 6px 0; font-size: 12px; }
  .rc-sec-bar-name { color: var(--text); font-weight: 500; }
  .rc-sec-bar-count { font-family: var(--mono); font-size: 10.5px; color: var(--muted); text-align: right; }

  /* focus areas */
  .rc-focus-row { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--rule); align-items: flex-start; }
  .rc-focus-row:last-child { border-bottom: none; }
  .rc-pri { font-family: var(--mono); font-size: 9.5px; font-weight: 700; padding: 3px 8px; border-radius: 5px; flex-shrink: 0; margin-top: 2px; letter-spacing: .05em; white-space: nowrap; }
  .rc-pri.high { background: var(--dev-bg); color: var(--dev-fg); }
  .rc-pri.medium { background: var(--app-bg); color: var(--app-fg); }
  .rc-pri.low { background: var(--pro-bg); color: var(--pro-fg); }
  .rc-focus-area { font-weight: 600; font-size: 13px; }
  .rc-focus-rat { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
  .rc-focus-tag { font-size: 10.5px; color: var(--navy); font-family: var(--mono); margin-top: 4px; }

  .rc-pat-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(240px,1fr)); gap: 12px; margin-top: 16px; }
  .rc-pat-card { border-radius: var(--r); padding: 14px 16px; border: 1px solid; }
  .rc-pat-card.good { background: var(--adv-bg); border-color: var(--adv-bd); }
  .rc-pat-card.warn { background: var(--app-bg); border-color: var(--app-bd); }
  .rc-pat-name { font-weight: 700; font-size: 12.5px; margin-bottom: 4px; }
  .rc-pat-desc { font-size: 12px; color: var(--ink-2); line-height: 1.5; }
  .rc-pat-subjects { font-family: var(--mono); font-size: 10px; color: var(--muted); margin-top: 6px; }
  .rc-partial-note { font-size: 12px; color: var(--muted); font-style: italic; margin: 0 0 16px; }

  .rc-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .rc-list-card { background: var(--surface-2); border: 1px solid var(--rule); border-radius: var(--r); padding: 14px 16px; }
  .rc-list-card h4 { margin: 0 0 10px; font-size: 12px; font-family: var(--mono); text-transform: uppercase; letter-spacing: .05em; }
  .rc-list-card.strength h4 { color: var(--adv-fg); }
  .rc-list-card.weakness h4 { color: var(--dev-fg); }
  .rc-list-card ul { margin: 0; padding-left: 18px; font-size: 12.5px; color: var(--ink-2); }
  .rc-list-card li { margin-bottom: 6px; line-height: 1.5; }

  .rc-hero { background: linear-gradient(160deg,#FBFAF6,#F2EFE5); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 24px 26px; margin-bottom: 20px; }
  .rc-hero blockquote { font-family: var(--display); font-style: italic; font-size: 19px; color: var(--navy); margin: 0 0 10px; line-height: 1.5; }

  .rc-markdown { font-size: 13px; line-height: 1.7; color: var(--ink-2); }

  /* pending trend rows */
  .rc-pending-row { display: flex; align-items: center; gap: 8px; padding: 11px 16px; border: 1px dashed var(--rule); border-radius: var(--r); margin-top: 12px; font-size: 12.5px; color: var(--muted); opacity: .8; }
  .rc-pending-row .ico { font-size: 14px; }

  /* per-section empty state */
  .rc-empty-sec { border: 1.5px dashed var(--border); background: var(--surface-2); border-radius: var(--r-lg); padding: 28px 26px; display: flex; gap: 18px; align-items: flex-start; }
  .rc-empty-ico { width: 40px; height: 40px; border-radius: 50%; background: #fff; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--emerald); }
  .rc-empty-msg { font-family: var(--display); font-size: 16px; color: var(--text); margin: 0 0 8px; }
  .rc-empty-eyebrow { font-family: var(--mono); font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin-bottom: 3px; }
  .rc-empty-when { font-size: 12.5px; color: var(--muted); line-height: 1.5; max-width: 56ch; }
  .rc-empty-cta { margin-top: 12px; background: var(--navy); color: #fff; border: none; border-radius: 999px; padding: 8px 18px; font-family: var(--sans); font-weight: 600; font-size: 12.5px; cursor: pointer; }
  .rc-empty-cta:hover { background: #06407D; }

  /* brand-new hero + how-it-builds checklist */
  .rc-empty { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 40px 32px; text-align: center; margin-top: 24px; }
  .rc-empty p { font-family: var(--display); font-size: 17px; color: var(--muted); max-width: 60ch; margin: 0 auto; }
  .rc-howto { max-width: 640px; margin: 22px auto 0; text-align: left; }
  .rc-howto-title { font-family: var(--mono); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--emerald); font-weight: 600; margin-bottom: 12px; text-align: center; }
  .rc-howto-step { display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; border-bottom: 1px dashed var(--rule); }
  .rc-howto-step:last-child { border-bottom: none; }
  .rc-howto-n { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--emerald); color: var(--emerald); font-family: var(--mono); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .rc-howto-txt { font-size: 13px; color: var(--text); line-height: 1.5; }
  .rc-howto-txt b { color: var(--navy); }
  .rc-cta-center { text-align: center; margin-top: 22px; }

  /* what unlocks next */
  .rc-unlocks { background: linear-gradient(160deg,#FBFAF6,#F3F0E7); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 20px 24px; margin-top: 8px; }
  .rc-unlocks-title { font-family: var(--mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--emerald); font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
  .rc-unlock-row { display: flex; align-items: baseline; gap: 10px; padding: 8px 0; border-bottom: 1px dashed var(--rule); }
  .rc-unlock-row:last-child { border-bottom: none; }
  .rc-unlock-lock { color: var(--muted); flex-shrink: 0; }
  .rc-unlock-label { font-weight: 600; font-size: 13px; color: var(--navy); }
  .rc-unlock-detail { font-size: 12px; color: var(--muted); margin-left: auto; font-family: var(--mono); white-space: nowrap; }

  .rc-foot { padding: 36px 0 10px; text-align: center; }
  .rc-print-btn { background: var(--navy); color: #fff; border: none; border-radius: 999px; padding: 13px 28px; font-family: var(--sans); font-weight: 600; font-size: 13.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: var(--shadow); }
  .rc-print-btn:hover:not(:disabled) { background: #06407D; }
  .rc-print-btn:disabled { cursor: not-allowed; opacity: .6; }
  .rc-foot-note { font-size: 11px; color: var(--muted); margin-top: 10px; font-family: var(--mono); }

  @media (max-width: 820px) {
    .rc-summary-grid { grid-template-columns: 1fr; }
    .rc-summary-stats { grid-template-columns: repeat(2,1fr); }
    .rc-two-col { grid-template-columns: 1fr; }
    .rc-chapter-row { grid-template-columns: 1fr auto; }
    .rc-bar-track { display: none; }
    .rc-bar-track.thin { display: block; width: 100%; }
    .rc-cg-row { grid-template-columns: 1fr auto; }
    .rc-test-row { grid-template-columns: 1fr auto; gap: 8px; }
    .rc-pat-grid { grid-template-columns: 1fr; }
    .rc-unlock-detail { margin-left: 0; }
  }

  /* Page-break sentinel — invisible on screen, hard break in print */
  .pb { display: none; }
  @keyframes rc-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  @media print {
    .rc-print-btn, .rc-foot, .rc-unlocks, .print-hide { display: none !important; }
    html, body { background: white !important; margin: 0 !important; padding: 0 !important; height: auto !important; overflow: visible !important; }
    .rc-wrap { max-width: 100% !important; padding: 0 !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    .pb { display: block !important; break-before: page !important; page-break-before: always !important; height: 0 !important; margin: 0 !important; padding: 0 !important; border: none !important; background: none !important; }
    .rc-section { overflow: visible !important; border-bottom: none !important; padding: 24px 0 !important; }
    .rc-subject-card, .rc-test-item, .rc-pat-card, .rc-dim-card, .rc-expander, .rc-chapter-row, .rc-focus-row, .rc-empty-sec {
      break-inside: avoid; page-break-inside: avoid; overflow: visible !important;
    }
    .rc-sc-body, .rc-expander-panel, .rc-test-panel { display: block !important; }
    .rc-two-col { display: block !important; }
    .rc-two-col > div { max-width: 100% !important; margin-bottom: 16px !important; }
    .rc-summary { box-shadow: none !important; }
  }
`;

// Print-portal CSS: injected only while generating a PDF. Hides every direct
// child of <body> except the portal, so the report prints on a clean page
// regardless of the surrounding student/parent/teacher app shell.
export const RC_PRINT_PORTAL_STYLES = `
  #rc-print-root { position: absolute; left: -10000px; top: 0; width: 1080px; background: #fff; }
  body.rc-printing #rc-print-root { position: static; left: 0; }
  @media print {
    body.rc-printing > *:not(#rc-print-root) { display: none !important; }
    body.rc-printing #rc-print-root { position: static !important; left: 0 !important; width: 100% !important; }
    @page { size: A4; margin: 14mm 12mm 18mm; }
    .rc-print-footer { position: fixed; bottom: 6mm; left: 0; right: 0; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #6B7280; }
  }
  .rc-print-footer { display: none; }
`;
