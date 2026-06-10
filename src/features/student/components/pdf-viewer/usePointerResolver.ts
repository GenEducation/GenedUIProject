"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  resolveTargetRect,
  pageRectToContent,
  findMatchingItemIndices,
  type PointerSpec,
  type Rect,
  type TextItemLike,
} from "./pointerGeometry";

interface UsePointerResolverParams {
  pdfDoc: PDFDocumentProxy | null;
  pointer: PointerSpec | null;
  /** Current render scale (viewport scale). */
  scale: number;
  /** Returns the rendered page wrapper element for a 1-based page number. */
  getPageEl: (pageNum: number) => HTMLElement | null;
  /** Bump to force a recompute once layout has settled (e.g. numPages, container width). */
  recomputeKey?: number;
}

interface ResolvedPointer {
  /** Target rect in the scroll-content container's coordinate space, or null. */
  rect: Rect | null;
  label?: string;
  visible: boolean;
}

const MAX_LAYOUT_RETRIES = 12;

/**
 * Resolves the active pointer spec into a concrete on-screen rect by combining
 * the pure geometry helpers with live pdfjs text content / viewport transforms
 * and the rendered page element's offset. Text content is cached per page.
 */
export function usePointerResolver({
  pdfDoc,
  pointer,
  scale,
  getPageEl,
  recomputeKey,
}: UsePointerResolverParams): ResolvedPointer {
  const [rect, setRect] = useState<Rect | null>(null);
  const textCache = useRef<Map<number, TextItemLike[]>>(new Map());

  // Drop cached text content when the document changes.
  useEffect(() => {
    textCache.current.clear();
  }, [pdfDoc]);

  // Place a page-local rect into content coordinates, retrying across frames
  // until the page element has been laid out.
  const placeWithRetry = useCallback(
    (pageNum: number, pageRect: Rect, isCancelled: () => boolean) => {
      let attempts = 0;
      const tryPlace = () => {
        if (isCancelled()) return;
        const el = getPageEl(pageNum);
        // offsetParent is null while the element is display:none / not laid out.
        if (el && el.offsetParent) {
          setRect(pageRectToContent(pageRect, el.offsetLeft, el.offsetTop));
          return;
        }
        if (attempts++ < MAX_LAYOUT_RETRIES) {
          requestAnimationFrame(tryPlace);
        } else {
          setRect(null);
        }
      };
      tryPlace();
    },
    [getPageEl]
  );

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    if (!pdfDoc || !pointer) {
      setRect(null);
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
        const target = pointer.target;
        const isText = target.kind === "text";

        // Resolve which page to point at. Text targets without an explicit page
        // are searched across the whole document for the first match.
        let targetPage = pointer.page ?? null;
        if (isText && targetPage == null) {
          const occurrence = target.occurrence ?? 0;
          for (let p = 1; p <= pdfDoc.numPages; p++) {
            const items = await getItems(p);
            if (cancelled) return;
            if (findMatchingItemIndices(items, target.text, occurrence).length > 0) {
              targetPage = p;
              break;
            }
          }
          if (targetPage == null) {
            setRect(null);
            return;
          }
        }
        if (targetPage == null) targetPage = 1; // non-text fallback

        const page = await pdfDoc.getPage(targetPage);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const items = isText ? await getItems(targetPage) : undefined;
        if (cancelled) return;

        const pageRect = resolveTargetRect({
          target,
          pageWidth: viewport.width,
          pageHeight: viewport.height,
          items,
          viewportTransform: viewport.transform,
          scale,
        });

        page.cleanup();

        if (cancelled) return;
        if (!pageRect) {
          setRect(null);
          return;
        }

        placeWithRetry(targetPage, pageRect, isCancelled);
      } catch {
        if (!cancelled) setRect(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pointer, scale, placeWithRetry, recomputeKey]);

  return { rect, label: pointer?.label, visible: rect != null };
}
