"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { parentService, type LinkedStudent } from "../services/parentService";
import {
  describeLastSeen,
  hasNewActivity,
  markSeen,
  readSeen,
  type SeenMap,
} from "../utils/studentActivity";
import { ICON, NAV_ROW, NAV_ROW_ACTIVE } from "./home/theme";

interface ParentStudentSwitcherProps {
  parentId: string;
  currentStudentId: string;
  /** Approved children, current one included. */
  students: LinkedStudent[];
  avatars: Record<string, string>;
  onSwitch: (studentId: string) => void;
  onSeeAll: () => void;
}

const nameOf = (s: LinkedStudent) => s.name || `Student ID: ...${s.student_id.slice(-4)}`;

/**
 * "Switch Account" in the parent portal's sidebar nav.
 *
 * - Two children: one click flips to the other (their avatar sits at the end
 *   of the row).
 * - Three or more: opens a menu of every other child — those with new
 *   activity first, then by how recently they were viewed — with a way out to
 *   the full picker.
 *
 * A child has "new activity" when their latest session is newer than the
 * parent's last visit to them. It shows as a dot on their avatar and, for
 * three or more children, a count on the row.
 */
export function ParentStudentSwitcher({
  parentId,
  currentStudentId,
  students,
  avatars,
  onSwitch,
  onSeeAll,
}: ParentStudentSwitcherProps) {
  // Filled from storage by the effect below, not during render, so the first
  // render is the same wherever it happens.
  const [seen, setSeen] = useState<SeenMap>({});
  const [activity, setActivity] = useState<Record<string, string | null>>({});
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Viewing a child counts as seeing everything they've done so far — on the
  // way in and again on the way out, so work done meanwhile isn't flagged.
  useEffect(() => {
    if (!parentId || !currentStudentId) {
      setSeen(readSeen(parentId));
      return;
    }
    setSeen(markSeen(parentId, currentStudentId));
    return () => {
      markSeen(parentId, currentStudentId);
    };
  }, [parentId, currentStudentId]);

  const idsKey = students.map((s) => s.student_id).join(",");
  useEffect(() => {
    if (!idsKey) return;
    const ids = idsKey.split(",");
    let cancelled = false;
    Promise.all(ids.map((id) => parentService.fetchLatestActivity(id))).then((results) => {
      if (cancelled) return;
      setActivity(Object.fromEntries(ids.map((id, i) => [id, results[i]])));
    });
    return () => { cancelled = true; };
  }, [idsKey]);

  const others = useMemo(() => {
    const rest = students.filter((s) => s.student_id !== currentStudentId);
    const isNew = (s: LinkedStudent) => hasNewActivity(activity[s.student_id], seen[s.student_id]);
    return rest
      .map((student, index) => ({ student, index, isNew: isNew(student), lastSeen: seen[student.student_id] }))
      .sort(
        (a, b) =>
          Number(b.isNew) - Number(a.isNew) ||
          (b.lastSeen ?? 0) - (a.lastSeen ?? 0) ||
          a.index - b.index,
      );
  }, [students, currentStudentId, activity, seen]);

  // Close on outside click; Escape hands focus back to the chevron.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      toggleRef.current?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  if (others.length === 0) return null;

  const pick = (studentId: string) => {
    setOpen(false);
    onSwitch(studentId);
  };

  const icon = (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static icon
    <img src={ICON("nav_switch_account")} alt="" width={22} height={22} className="shrink-0" />
  );

  // ── Two children: flip ─────────────────────────────────────────────────────
  if (others.length === 1) {
    const [{ student, isNew }] = others;
    const label = `Switch to ${nameOf(student)}${isNew ? ", new activity" : ""}`;
    return (
      <button onClick={() => pick(student.student_id)} aria-label={label} title={label} className={NAV_ROW}>
        {icon}
        <span className="min-w-0 flex-1 truncate text-left">Switch Account</span>
        <MiniAvatar src={avatars[student.student_id]} isNew={isNew} />
      </button>
    );
  }

  // ── Three or more: a menu, most relevant child first ──────────────────────
  // Ordering puts children with new activity first, then the one viewed most
  // recently — so opening the menu and pressing Enter goes back to the last
  // child, Alt-Tab style.
  const newCount = others.filter((o) => o.isNew).length;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={toggleRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Switch Account${newCount ? `, ${newCount} with new activity` : ""}`}
        className={`${NAV_ROW} ${open ? NAV_ROW_ACTIVE : ""}`}
      >
        {icon}
        <span className="min-w-0 flex-1 truncate text-left">Switch Account</span>
        {newCount > 0 && (
          <span aria-hidden className="h-5 min-w-5 rounded-full bg-[var(--pp-green)] px-1.5 text-center text-[11px] font-bold leading-5 text-white">
            {newCount}
          </span>
        )}
        <ChevronDown size={16} className={`shrink-0 text-[var(--pp-ink-soft)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            role="menu"
            aria-label="Switch child"
            onKeyDown={onMenuKeyDown}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={{ transformOrigin: "top center" }}
            className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-[var(--pp-line)] bg-white p-2 text-[var(--pp-ink)] shadow-[0_18px_40px_-18px_rgba(19,41,61,0.45)]"
          >
            <p className="px-2.5 pb-2 pt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--pp-ink-soft)]">
              Switch to
            </p>
            {others.map(({ student, isNew, lastSeen }) => (
              <button
                key={student.student_id}
                role="menuitem"
                onClick={() => pick(student.student_id)}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left outline-none transition-colors hover:bg-[var(--pp-mint)]/60 focus-visible:bg-[var(--pp-mint)]/60"
              >
                <MiniAvatar src={avatars[student.student_id]} isNew={isNew} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{nameOf(student)}</span>
                  <span className={`block text-[11px] font-semibold ${isNew ? "text-[var(--pp-green-deep)]" : "text-[var(--pp-ink-soft)]"}`}>
                    {isNew ? "New activity" : describeLastSeen(lastSeen)}
                  </span>
                </span>
              </button>
            ))}
            <div className="mt-1 border-t border-[var(--pp-line)] pt-1">
              <button
                role="menuitem"
                onClick={() => { setOpen(false); onSeeAll(); }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-xs font-bold text-[var(--pp-ink-soft)] outline-none transition-colors hover:bg-[var(--pp-mint)]/60 focus-visible:bg-[var(--pp-mint)]/60"
              >
                <span className="flex w-9 justify-center"><LayoutGrid size={15} /></span>
                See all profiles
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiniAvatar({ src, isNew, size = "sm" }: { src?: string; isNew: boolean; size?: "sm" | "lg" }) {
  const box = size === "lg" ? "w-9 h-9" : "w-7 h-7 ring-2 ring-white";
  return (
    <span className="relative shrink-0">
      <span className={`block overflow-hidden rounded-full ${box}`}>
        {/* scaled a touch so the icon's baked-in white edge sits outside the clip */}
        {/* eslint-disable-next-line @next/next/no-img-element -- small static avatar */}
        <img src={src} alt="" className="h-full w-full scale-[1.035] object-cover" />
      </span>
      {isNew && (
        <span aria-hidden className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-[var(--pp-green)] ring-2 ring-white" />
      )}
    </span>
  );
}
