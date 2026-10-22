"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  icon?: ReactNode;
}

/**
 * A button that opens a short list of choices. For actions that would
 * otherwise be a row of buttons too wide for the space (a phone row, a page
 * header). Closes on a choice, an outside click, or Escape.
 */
export function MenuButton({
  label,
  trigger,
  items,
  align = "right",
  className = "",
  triggerClassName = "",
}: {
  /** Accessible name of the trigger. */
  label: string;
  /** The trigger's contents — the trigger itself is this component's button. */
  trigger: ReactNode;
  triggerClassName?: string;
  items: MenuItem[];
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={`absolute top-full z-40 mt-1.5 min-w-[190px] overflow-hidden rounded-xl border border-border bg-white p-1 shadow-[0_12px_32px_rgba(18,45,48,.14)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-bold transition-colors ${
                item.tone === "danger" ? "text-danger-ink hover:bg-danger-bg" : "text-ink hover:bg-paper"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
