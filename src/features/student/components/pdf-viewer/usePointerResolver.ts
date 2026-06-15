"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  resolveTargetRect,
  pageRectToContent,
  deviceRectToNorm,
  normRectToPageRect,
  findMatchingItemIndices,
  type PointerSpec,
  type Rect,
  type NormRect,
  type TextItemLike,
} from "./pointerGeometry";

interface UsePointerResolverParams {
  pdfDoc: PDFDocumentProxy | null;
  pointer: PointerSpec | null;
  /** Returns the rendered page wrapper element for a 1-based page number. */
  getPageEl: (pageNum: number) => HTMLElement | null;
  /** Bump to force a re-place once layout has settled (e.g. numPages, container width). */
  recomputeKey?: number;
}

interface ResolvedPointer {
  /** Target rect in the scroll-content container's coordinate space, or null. */
  rect: Rect | null;
  label?: string;
  visible: boolean;
}

interface ResolvedTarget {
  /** 1-based page the pointer lands on. */
  page: number;
  /** Scale- and layout-independent target rect (fractions of the page). */
  norm: NormRect;
}

const MAX_LAYOUT_RETRIES = 12;

/**
 * Resolves the active pointer spec into a concrete on-screen rect in two
 * decoupled stages:
 *
 *  1. Resolution (async, scale-free): combine the pure geometry helpers with
 *     pdfjs text content / viewport transforms to produce a *normalized* target
 *     rect (fractions of the page) plus the page it lives on. This never reads
 *     the live layout, so it can't tear against an in-flight resize.
 *
 *  2. Placement (synchronous, layout-driven): multiply the normalized rect by
 *     the target page element's *live* rendered box and shift by its offset.
 *     Re-runs on any layout change via a ResizeObserver on that element, so the
 *     highlight stays glued to the text through zoom / panel-resize.
 *
 * Text content is cached per page.
 */
export function usePointerResolver({
  pdfDoc,
  pointer,
  getPageEl,
  recomputeKey,
}: UsePointerResolverParams): ResolvedPointer {
  const [rect, setRect] = useState<Rect | null>(null);
  const [target, setTarget] = useState<ResolvedTarget | null>(null);
  const textCache = useRef<Map<number, TextItemLike[]>>(new Map());

  // Drop cached text content when the document changes.
  useEffect(() => {
    textCache.current.clear();
  }, [pdfDoc]);

  // ── Stage 1: resolve the pointer spec into a normalized, scale-free target ──
  useEffect(() => {
    let cancelled = false;

    if (!pdfDoc || !pointer) {
      setTarget(null);
      return;
    }

    // Fetch + cache a page's text items.
    const getItems = async (pageNum: number): Promise<TextItemLike[]> => {
      const cached = textCache.current.get(pageNum);
      if (cached) return cached;
      const pg = await pdfDoc.getPage(pageNum);
      const tc = await pg.getTextContent();
      pg.cleanup();
      const items = tc.items.filter(
        (it: any) => typeof it?.str === "string"
      ) as TextItemLike[];
      textCache.current.set(pageNum, items);
      return items;
    };

    (async () => {
      try {
        const t = pointer.target;
        const isText = t.kind === "text";

        // Resolve which page to point at. Text targets without an explicit page
        // are searched across the whole document for the first match.
        let targetPage = pointer.page ?? null;
        if (isText && targetPage == null) {
          const occurrence = t.occurrence ?? 0;
          for (let p = 1; p <= pdfDoc.numPages; p++) {
            const items = await getItems(p);
            if (cancelled) return;
            if (findMatchingItemIndices(items, t.text, occurrence).length > 0) {
              targetPage = p;
              break;
            }
          }
          if (targetPage == null) {
            setTarget(null);
            return;
          }
        }
        if (targetPage == null) targetPage = 1; // non-text fallback

        const page = await pdfDoc.getPage(targetPage);
        if (cancelled) return;
        // Resolve at scale 1 so the normalization base matches the page's
        // intrinsic dimensions; placement re-scales against the live box.
        const viewport = page.getViewport({ scale: 1 });
        const items = isText ? await getItems(targetPage) : undefined;
        if (cancelled) return;

        const pageRect = resolveTargetRect({
          target: t,
          pageWidth: viewport.width,
          pageHeight: viewport.height,
          items,
          viewportTransform: viewport.transform,
          scale: 1,
        });

        page.cleanup();

        if (cancelled) return;
        if (!pageRect) {
          setTarget(null);
          return;
        }

        setTarget({
          page: targetPage,
          norm: deviceRectToNorm(pageRect, viewport.width, viewport.height),
        });
      } catch {
        if (!cancelled) setTarget(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pointer]);

  // ── Stage 2: place the normalized target using the live page box ────────────
  // Re-runs when the target changes, and stays glued to the text across layout
  // changes via ResizeObservers on the page element and its container.
  // `recomputeKey` is a final fallback nudge after the surrounding layout shifts.
  useEffect(() => {
    if (target == null) {
      setRect(null);
      return;
    }

    let cancelled = false;

    const place = () => {
      const el = getPageEl(target.page);
      // offsetParent is null while the element is display:none / not laid out.
      if (!el || !el.offsetParent) return false;
      const pageRect = normRectToPageRect(target.norm, el.offsetWidth, el.offsetHeight);
      setRect(pageRectToContent(pageRect, el.offsetLeft, el.offsetTop));
      return true;
    };

    // Initial placement: retry across frames until the page has been laid out.
    let attempts = 0;
    const tryPlace = () => {
      if (cancelled) return;
      if (place()) return;
      if (attempts++ < MAX_LAYOUT_RETRIES) {
        requestAnimationFrame(tryPlace);
      } else {
        setRect(null);
      }
    };
    tryPlace();

    // Keep the highlight glued to the text across layout changes:
    //  • the page element resizes on zoom / fit-width (size change), and
    //  • its offsetParent (the scroll-content container) resizes when the split
    //    divider is dragged at a FIXED zoom — that re-centers the page, shifting
    //    its offset without changing its size, which is the case that left the
    //    box stranded to the side of the text.
    // PdfPage's wrapper size updates synchronously with the scale prop, so the
    // observer fires on every layout tick with the correct box + offset.
    const el = getPageEl(target.page);
    let ro: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => place());
      ro.observe(el);
      if (el.offsetParent instanceof Element) ro.observe(el.offsetParent);
    }

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [target, getPageEl, recomputeKey]);

  return { rect, label: pointer?.label, visible: rect != null };
}
