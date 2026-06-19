export interface PdfPointerTarget {
  kind: "text" | "bbox" | "point" | "figure";
  text?: string;
  textEnd?: string;
  /** Normalized page-local coordinates [x0, y0, x1, y1] in 0..1 range */
  bbox?: [number, number, number, number];
  x?: number;
  y?: number;
  figureId?: string;
  occurrence?: number;
}

export interface PdfPointerSpec {
  /** 1-based page number */
  page?: number;
  target: PdfPointerTarget;
  label?: string;
  /** Auto-dismiss after this many ms */
  ttlMs?: number;
}

export interface PdfState {
  documentTitle: string | null;
  pdfUrl: string | null;
  isLoading: boolean;
  error: string | null;
  activePointer: PdfPointerSpec | null;
  /** True when a pointer arrived but the PDF viewer is not currently mounted */
  pointerPending: boolean;
}
