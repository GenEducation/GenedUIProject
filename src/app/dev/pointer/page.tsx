"use client";

/**
 * Dev-only harness for the virtual teaching pointer. Mounts the real PdfViewer
 * with a local test PDF (no auth/backend) so the pointer overlay + coordinate
 * resolution can be exercised manually or by the e2e test. 404s in production.
 *
 * The PdfViewer is shared by both the chat and voice screens, so verifying the
 * pointer here verifies it for both surfaces.
 */
import dynamic from "next/dynamic";
import type { PointerSpec } from "@/features/student/components/pdf-viewer/pointerGeometry";

const PdfViewer = dynamic(
  () => import("@/features/student/components/pdf-viewer").then((m) => m.PdfViewer),
  { ssr: false }
);

declare global {
  interface Window {
    __genedPointer?: { set: (s: PointerSpec) => void; clear: () => void };
  }
}

export default function DevPointerHarness() {
  if (process.env.NODE_ENV === "production") return null;

  const fire = (spec: PointerSpec) => window.__genedPointer?.set(spec);

  const btn: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid #D6D3F0",
    background: "#EDE9FE",
    color: "#5B4DC7",
    cursor: "pointer",
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 8, display: "flex", gap: 8, flexWrap: "wrap", background: "#fff", borderBottom: "1px solid #eee" }}>
        <button data-testid="ptr-text" style={btn} onClick={() => fire({ page: 1, target: { kind: "text", text: "Ocean Depths" }, label: "The title" })}>
          Point: text
        </button>
        <button data-testid="ptr-phrase" style={btn} onClick={() => fire({ page: 1, target: { kind: "text", text: "maritime theme" }, label: "A phrase" })}>
          Point: phrase
        </button>
        <button data-testid="ptr-figure" style={btn} onClick={() => fire({ page: 1, target: { kind: "figure", bbox: [0.2, 0.5, 0.8, 0.7] }, label: "A figure" })}>
          Point: figure
        </button>
        <button data-testid="ptr-clear" style={btn} onClick={() => window.__genedPointer?.clear()}>
          Clear
        </button>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <PdfViewer pdfUrl="/test-textbook.pdf" />
      </div>
    </div>
  );
}
