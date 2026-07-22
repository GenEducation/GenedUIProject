"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ReportCardBody } from "./ReportCardBody";
import { RC_PRINT_PORTAL_STYLES } from "./styles";
import type { ReportCardData, ReportCardUI, ReportRole } from "./types";

const PORTAL_ID = "rc-print-root";
const STYLE_ID = "rc-print-portal-styles";

/** Client-side "Download PDF": renders a print-optimised copy of the report
 *  into a <body>-level portal, waits for fonts/layout, then opens the browser
 *  print dialog (Save as PDF). Works identically inside the student, parent,
 *  and teacher shells because the portal is a direct child of <body>. */
export function usePrintPdf({ data, role, filename }: { data: ReportCardData; role: ReportRole; filename: string }) {
  const [active, setActive] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Ensure the portal target + print styles exist once.
  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = RC_PRINT_PORTAL_STYLES;
      document.head.appendChild(style);
    }
    let el = document.getElementById(PORTAL_ID) as HTMLElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = PORTAL_ID;
      document.body.appendChild(el);
    }
    setRoot(el);
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const triggerPrint = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setActive(true);

    // Let the portal mount, then wait for fonts + a settled layout. We use
    // setTimeout rather than requestAnimationFrame for the settle waits because
    // rAF is paused in background/inactive tabs, which would hang the flow. The
    // font wait is bounded so a slow or blocked font CDN can never hang the PDF
    // button — fall through after 1.5s and print with whatever fonts loaded.
    await new Promise((r) => setTimeout(r, 60));
    try {
      const fontsReady = (document as any).fonts?.ready ?? Promise.resolve();
      await Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))]);
    } catch {
      /* fonts API unavailable — proceed */
    }
    await new Promise((r) => setTimeout(r, 60));

    const prevTitle = document.title;
    document.title = filename;
    document.body.classList.add("rc-printing");

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      document.body.classList.remove("rc-printing");
      document.title = prevTitle;
      window.removeEventListener("afterprint", cleanup);
      setActive(false);
      setIsGenerating(false);
      cleanupRef.current = null;
    };
    cleanupRef.current = cleanup;
    window.addEventListener("afterprint", cleanup);

    try {
      window.print();
    } finally {
      // Safari/edge cases where afterprint never fires.
      setTimeout(cleanup, 1000);
    }
  }, [isGenerating, filename]);

  const printUi: ReportCardUI = {
    variant: "print",
    role,
    isSubjectOpen: () => true,
    toggleSubject: () => {},
    isExpOpen: () => true,
    toggleExp: () => {},
    isClampOpen: () => true,
    toggleClamp: () => {},
    canDownload: false,
    isPdfGenerating: false,
  };

  const printPortal =
    active && root
      ? createPortal(
          React.createElement("div", { className: "report-root" }, React.createElement(ReportCardBody, { data, ui: printUi })),
          root
        )
      : null;

  return { isGenerating, triggerPrint, printPortal };
}
