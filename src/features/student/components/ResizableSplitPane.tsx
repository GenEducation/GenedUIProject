"use client";

import { useRef, useState, useEffect, useCallback, ReactNode } from "react";

interface ResizableSplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftPercent?: number;
  minLeftPx?: number;
  minRightPx?: number;
  storageKey?: string;
}

export function ResizableSplitPane({
  left,
  right,
  defaultLeftPercent = 55,
  minLeftPx = 80,
  minRightPx = 80,
  storageKey,
}: ResizableSplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const getInitialPercent = () => {
    if (storageKey && typeof window !== "undefined") {
      const saved = localStorage.getItem(`split_pane_${storageKey}`);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed > 0 && parsed < 100) return parsed;
      }
    }
    return defaultLeftPercent;
  };

  const [leftPercent, setLeftPercent] = useState<number>(getInitialPercent);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalWidth = rect.width;
      const offsetX = e.clientX - rect.left;

      const minLeft = (minLeftPx / totalWidth) * 100;
      const maxLeft = ((totalWidth - minRightPx) / totalWidth) * 100;
      const newPercent = Math.min(Math.max((offsetX / totalWidth) * 100, minLeft), maxLeft);

      setLeftPercent(newPercent);
    },
    [minLeftPx, minRightPx]
  );

  const onMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (storageKey) {
      localStorage.setItem(`split_pane_${storageKey}`, String(leftPercent));
    }
  }, [storageKey, leftPercent]);

  useEffect(() => {
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const onDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden h-full">
      <div style={{ width: `${leftPercent}%`, minWidth: minLeftPx, overflow: "hidden" }} className="flex flex-col">
        {left}
      </div>

      {/* Divider */}
      <div
        onMouseDown={onDividerMouseDown}
        className="flex-shrink-0 group relative flex items-center justify-center"
        style={{ width: 6, cursor: "col-resize", background: "#E2E8F0", zIndex: 10 }}
      >
        <div
          className="absolute inset-y-0 flex items-center justify-center transition-colors"
          style={{ width: 6 }}
        >
          <div
            className="group-hover:bg-[#5B4DC7] transition-colors rounded-full"
            style={{ width: 2, height: 32, background: "#CBD5E0" }}
          />
        </div>
      </div>

      <div style={{ flex: 1, minWidth: minRightPx, overflow: "hidden" }} className="flex flex-col">
        {right}
      </div>
    </div>
  );
}
