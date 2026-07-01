"use client";

import { Loader2, LogOut, User, ClipboardCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useStudentStore, isVoiceSession, sessionRoutePath } from "../store/useStudentStore";
import React, { useState, useRef, useCallback, useEffect } from "react";

const C = {
  sidebarBg: "#1C2333",
  genPurple: "#5B4DC7",
  genBlue: "#4A90D9",
  sparkle: "#8B7FE8",
  sidebarText: "rgba(200,209,220,1)",
  sidebarMuted: "rgba(255,255,255,0.25)",
  sidebarActive: "#FFFFFF",
  sidebarBorder: "rgba(255,255,255,0.06)",
  sidebarHover: "rgba(255,255,255,0.06)",
  sidebarActiveBg: "rgba(255,255,255,0.10)",
};

const NAV_ITEMS = [
  { id: "home",      icon: "🏠", label: "Home",     path: "/student" },
  { id: "practice",  icon: "🎯", label: "Practice",  path: "/student/assessments" },
  { id: "me",        icon: "😊", label: "Me",        path: "/student/profile" },
];

const MIN_WIDTH = 200;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 260;

const SUBJECT_META: Record<string, { emoji: string; color: string }> = {
  english:     { emoji: "📖", color: "#4A90D9" },
  mathematics: { emoji: "🧮", color: "#2D6A4F" },
  math:        { emoji: "🧮", color: "#2D6A4F" },
  science:     { emoji: "🔬", color: "#D4820A" },
  hindi:       { emoji: "✏️", color: "#7B5EA7" },
};

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getSubjectMeta(subject?: string, title?: string) {
  const hay = ((subject ?? "") + " " + (title ?? "")).toLowerCase();
  for (const [key, val] of Object.entries(SUBJECT_META)) {
    if (hay.includes(key)) return val;
  }
  return { emoji: "📚", color: "#8B7FE8" };
}

// ── Profile Popup ─────────────────────────────────────────────────────────────
function ProfilePopup({
  profile,
  onLogout,
  onClose,
}: {
  profile: { username?: string; grade?: number; plan?: string } | null;
  onLogout: () => void;
  onClose: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const initial = (profile?.username ?? "U").charAt(0).toUpperCase();

  const menuItems = [
    { icon: <User size={14} />,         label: "Profile",    path: "/student/profile" },
    { icon: <ClipboardCheck size={14}/>,label: "Tests",      path: "/student/assessments" },
  ];

  return (
    <div
      ref={popupRef}
      style={{
        position: "absolute",
        bottom: "calc(100% + 10px)",
        left: 12,
        right: 12,
        background: "#151C2B",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 18,
        boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
        overflow: "hidden",
        zIndex: 100,
        fontFamily: "'DM Sans', sans-serif",
        animation: "slideUpFade 0.18s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <style>{`@keyframes slideUpFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ padding: "18px 18px 14px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, margin: "0 auto 10px",
          background: `linear-gradient(135deg, ${C.genPurple}, ${C.genBlue})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, fontWeight: 800, color: "white",
        }}>
          {initial}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.3 }}>
          {profile?.username ?? "Student"}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: "rgba(200,209,220,0.6)" }}>Grade {profile?.grade ?? "—"}</span>
          {profile?.plan && (
            <span style={{
              padding: "1px 8px", borderRadius: 6, fontSize: 9, fontWeight: 800,
              letterSpacing: "0.08em", textTransform: "uppercase" as const,
              background: profile.plan === "PRO" ? "#00B89425" : `${C.genPurple}30`,
              color: profile.plan === "PRO" ? "#00B894" : C.sparkle,
              border: `1px solid ${profile.plan === "PRO" ? "#00B89440" : C.sparkle + "40"}`,
            }}>{profile.plan}</span>
          )}
        </div>
      </div>

      {/* Menu items */}
      <div style={{ padding: "8px 8px" }}>
        {menuItems.map(item => (
          <button
            key={item.label}
            onClick={() => { window.location.href = item.path; onClose(); }}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-none cursor-pointer transition-all"
            style={{ padding: "9px 14px", background: "transparent", color: "rgba(200,209,220,0.8)", fontSize: 13, fontWeight: 700 }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Logout */}
      <div style={{ padding: "0 8px 8px" }}>
        <button
          onClick={() => { onLogout(); onClose(); }}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-none cursor-pointer transition-all"
          style={{ padding: "9px 14px", background: "rgba(232,99,90,0.08)", color: "#E8635A", fontSize: 13, fontWeight: 700, border: "1px solid rgba(232,99,90,0.15)" }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(232,99,90,0.18)"}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(232,99,90,0.08)"}
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export const StudentChatSidebar = React.memo(({
  activeChatId,
  isOpen,
  onClose
}: {
  activeChatId: string;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const {
    openExistingChat,
    closeChat,
    recentChats,
    isSessionsLoading,
    logoutStudent,
    studentProfile
  } = useStudentStore();

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }, [sidebarWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setSidebarWidth(next);
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const w = isOpen ? sidebarWidth : 0;
  const mobileWidth = Math.min(sidebarWidth, 300);

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-30"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={onClose}
        />
      )}
      <aside
        className={`flex-shrink-0 flex flex-col overflow-hidden relative ${
          isMobile ? "fixed inset-y-0 left-0 z-40 h-full" : "h-full"
        }`}
        style={
          isMobile
            ? {
                width: isOpen ? mobileWidth : 0,
                minWidth: isOpen ? mobileWidth : 0,
                maxWidth: "85vw",
                background: C.sidebarBg,
                transition: "width 0.25s ease, min-width 0.25s ease",
                boxShadow: isOpen ? "0 0 32px rgba(0,0,0,0.35)" : "none",
              }
            : {
                width: w,
                minWidth: w,
                background: C.sidebarBg,
                transition: isOpen ? "none" : "width 0.25s ease, min-width 0.25s ease",
              }
        }
      >
      {isOpen && (
        <div className="flex flex-col h-full w-full" style={{ padding: "16px 12px" }}>
          {/* Header: centered logo */}
          <div className="flex items-center justify-center mb-6 px-1 py-1">
            <button
              onClick={() => { closeChat(); window.location.href = "/student"; }}
              className="hover:opacity-80 transition-opacity"
            >
              <Image
                src="/Logo.svg"
                alt="GenEd"
                width={96}
                height={30}
                style={{ height: 30, width: "auto" }}
                priority
              />
            </button>
          </div>

          {/* Recent sessions */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: C.sidebarMuted,
              letterSpacing: "1.5px", textTransform: "uppercase",
              padding: "4px 6px 12px", textAlign: "center", fontFamily: "'DM Sans', sans-serif",
            }}>
              Recent Sessions
            </p>

            {isSessionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} style={{ color: "rgba(255,255,255,0.2)" }} className="animate-spin" />
              </div>
            ) : recentChats.length > 0 ? (
              <div className="flex flex-col" style={{ gap: 0 }}>
                {recentChats.map((chat, idx) => {
                  const isActive = activeChatId === chat.id;
                  const { emoji, color } = getSubjectMeta(chat.subject, chat.title);
                  return (
                    <button
                      key={chat.id}
                      onClick={() => {
                        openExistingChat(chat);
                        // Reopen in the modality the session was created with.
                        window.location.href = sessionRoutePath(chat);
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className="w-full rounded-xl border-none cursor-pointer transition-all"
                      style={{
                        padding: "10px 12px",
                        background: isActive ? C.sidebarActiveBg : "transparent",
                        color: isActive ? C.sidebarActive : C.sidebarText,
                        fontSize: 13,
                        fontWeight: isActive ? 800 : 700,
                        fontFamily: "'DM Sans', sans-serif",
                        borderBottom: idx < recentChats.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = C.sidebarHover; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                        background: `${color}18`, display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 15,
                      }}>
                        {emoji}
                      </div>
                      <div style={{ minWidth: 0, textAlign: "left" as const, flex: 1 }}>
                        <div className="truncate" title={chat.title} style={{ lineHeight: 1.35 }}>
                          <span aria-label={isVoiceSession(chat) ? "Voice session" : "Chat session"} title={isVoiceSession(chat) ? "Voice session" : "Chat session"} style={{ marginRight: 5 }}>
                            {isVoiceSession(chat) ? "🎤" : "💬"}
                          </span>
                          {chat.title}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                          {chat.subject && (
                            <span style={{ fontSize: 10, color: `${color}90`, fontWeight: 700, textTransform: "capitalize" }}>
                              {chat.subject}
                            </span>
                          )}
                          {chat.subject && chat.lastActive && (
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", fontWeight: 600 }}>·</span>
                          )}
                          {chat.lastActive && (
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", fontWeight: 600 }}>
                              {timeAgo(chat.lastActive)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-2 py-5 text-center">
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>
                  No recent sessions yet.
                </p>
              </div>
            )}
          </div>

          {/* Footer: profile trigger only */}
          <div style={{ borderTop: `1px solid ${C.sidebarBorder}`, paddingTop: 8 }}>

            {/* Profile trigger + popup */}
            <div style={{ position: "relative" }}>
              {profilePopupOpen && (
                <ProfilePopup
                  profile={studentProfile ?? null}
                  onLogout={logoutStudent}
                  onClose={() => setProfilePopupOpen(false)}
                />
              )}
              <button
                onClick={() => setProfilePopupOpen(v => !v)}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl border-none cursor-pointer transition-all"
                style={{
                  padding: "10px 14px",
                  background: profilePopupOpen ? "rgba(255,255,255,0.08)" : "transparent",
                  color: C.sidebarActive,
                  fontFamily: "'DM Sans', sans-serif",
                  border: profilePopupOpen ? "1px solid rgba(255,255,255,0.10)" : "1px solid transparent",
                }}
                onMouseEnter={e => { if (!profilePopupOpen) (e.currentTarget as HTMLButtonElement).style.background = C.sidebarHover; }}
                onMouseLeave={e => { if (!profilePopupOpen) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: `linear-gradient(135deg, ${C.genPurple}, ${C.genBlue})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, color: "white",
                }}>
                  {(studentProfile?.username ?? "U").charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  {/* Row 1: name + PRO */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.sidebarActive, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {studentProfile?.username ?? "Student"}
                    </span>
                    {studentProfile?.plan && (
                      <span style={{
                        flexShrink: 0, padding: "2px 8px", borderRadius: 6, fontSize: 10,
                        fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const,
                        background: studentProfile.plan === "PRO" ? "#00B89420" : `${C.genPurple}25`,
                        color: studentProfile.plan === "PRO" ? "#00B894" : C.sparkle,
                        border: `1px solid ${studentProfile.plan === "PRO" ? "#00B89440" : C.sparkle + "30"}`,
                      }}>{studentProfile.plan}</span>
                    )}
                  </div>
                  {/* Row 2: grade */}
                  <div style={{ fontSize: 11, color: "rgba(200,209,220,0.5)", fontWeight: 600, marginTop: 2 }}>
                    Grade {studentProfile?.grade ?? "—"}
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drag-to-resize handle */}
      {isOpen && !isMobile && (
        <div
          onMouseDown={onMouseDown}
          style={{
            position: "absolute", top: 0, right: 0, width: 5, height: "100%",
            cursor: "ew-resize", zIndex: 10,
            background: "transparent",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = `${C.genPurple}40`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
        />
      )}
      </aside>
    </>
  );
});

StudentChatSidebar.displayName = "StudentChatSidebar";
