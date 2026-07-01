"use client";

import { motion } from "framer-motion";
import { ChevronRight, Search } from "lucide-react";
import React, { useMemo, useState } from "react";

interface ChapterOptionPickerProps {
  options: string[];
  onSelect: (option: string) => void;
}

interface ParsedOption {
  /** The original, unparsed string — this is what gets sent back to the AI. */
  raw: string;
  /** Leading "Chapter N" number, if present. */
  num: string | null;
  /** Title to display (remainder after "Chapter N", or the full string). */
  title: string;
}

// Brand tokens (kept consistent with ChatMessageBubble / StudentChatMain).
const PURPLE = "#5B4DC7";
const SOFT = "#EDE9FE";
const TEXT = "#1A202C";
const MUTED = "#94A3B8";
const BORDER = "#E2E8F0";
const HOVER = "#FBFAFF";

const CHAPTER_RE = /^Chapter\s+(\d+)\s+(.*)$/i;

function parseOption(raw: string): ParsedOption {
  const m = raw.match(CHAPTER_RE);
  if (m) return { raw, num: m[1], title: m[2].trim() };
  return { raw, num: null, title: raw };
}

function NumberBadge({ num, active, small }: { num: string; active?: boolean; small?: boolean }) {
  const size = small ? 24 : 30;
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: small ? 7 : 9,
        background: active ? PURPLE : SOFT,
        color: active ? "#FFFFFF" : PURPLE,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: small ? 11 : 13,
        flexShrink: 0,
        fontFamily: "'Nunito', sans-serif",
        transition: "all 0.15s",
      }}
    >
      {num}
    </span>
  );
}

export function ChapterOptionPicker({ options, onSelect }: ChapterOptionPickerProps) {
  const parsed = useMemo(() => options.map(parseOption), [options]);
  const useSearch = options.length > 8;
  const [query, setQuery] = useState("");

  if (useSearch) {
    const q = query.toLowerCase().trim();
    const matches = q
      ? parsed.filter(
          (o) => o.title.toLowerCase().includes(q) || (o.num !== null && o.num === q)
        )
      : parsed;

    return (
      <div className="w-full">
        <div
          className="flex items-center gap-2"
          style={{ background: "#FFFFFF", border: `1.5px solid ${BORDER}`, borderRadius: 13, padding: "9px 14px", marginBottom: 8 }}
        >
          <Search size={15} style={{ color: MUTED, flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a chapter name or number…"
            aria-label="Search chapters"
            style={{ border: "none", outline: "none", flex: 1, fontSize: 13.5, fontFamily: "'DM Sans', sans-serif", color: TEXT, background: "transparent" }}
          />
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {matches.length === 0 ? (
            <div style={{ fontSize: 12.5, color: MUTED, fontStyle: "italic", padding: "10px 12px" }}>
              No chapter matches that.
            </div>
          ) : (
            matches.map((o) => (
              <button
                key={o.raw}
                onClick={() => onSelect(o.raw)}
                className="w-full flex items-center gap-2.5 transition-colors group"
                style={{ padding: "9px 12px", borderRadius: 11, background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = SOFT; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, fontFamily: "'Nunito', sans-serif", width: 22, flexShrink: 0 }}>
                  {o.num ?? ""}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: "'DM Sans', sans-serif" }}>
                  {o.title}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // Stacked-cards branch (≤ 8 options)
  return (
    <div className="w-full max-h-[320px] overflow-y-auto flex flex-col gap-2">
      {parsed.map((o, i) => (
        <motion.button
          key={o.raw}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.04, 0.32), type: "spring", stiffness: 400, damping: 30 }}
          onClick={() => onSelect(o.raw)}
          className="w-full flex items-center gap-3"
          style={{ background: "#FFFFFF", border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "11px 14px", cursor: "pointer", textAlign: "left", transition: "border-color 0.15s, background 0.15s" }}
          onMouseEnter={(e) => { const t = e.currentTarget as HTMLButtonElement; t.style.borderColor = PURPLE; t.style.background = HOVER; }}
          onMouseLeave={(e) => { const t = e.currentTarget as HTMLButtonElement; t.style.borderColor = BORDER; t.style.background = "#FFFFFF"; }}
        >
          {o.num !== null && <NumberBadge num={o.num} />}
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: TEXT, fontFamily: "'DM Sans', sans-serif" }}>
            {o.title}
          </span>
          <ChevronRight size={16} style={{ color: "#CBD5E1", flexShrink: 0 }} />
        </motion.button>
      ))}
    </div>
  );
}
