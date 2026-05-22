"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useStudentStore } from "../store/useStudentStore";
import { useTutorialStore } from "@/features/tutorial/store/useTutorialStore";
import { StudentHomeSidebar } from "./StudentHomeSidebar";
import { PartnerRequestModal } from "./PartnerRequestModal";

/* ─── Design Tokens (matches home screen) ────────────────────────────────── */
const C = {
  genPurple: "#5B4DC7",
  genBlue:   "#4A90D9",
  edGreen:   "#2D6A4F",
  sparkle:   "#8B7FE8",
  growth:    "#00B894",
  sun:       "#F0AD4E",
  coral:     "#E8635A",
  sky:       "#5DADE2",
  text:      "#1A202C",
  textMid:   "#4A5568",
  textMuted: "#94A3B8",
  pageBg:    "#F7F8FC",
  card:      "#FFFFFF",
  border:    "#E2E8F0",
};

const AVATAR_COLORS = [C.genPurple, C.genBlue, C.edGreen, C.sky, C.coral, C.sun, C.sparkle, "#55EFC4"];

/* ─── Badge computation ──────────────────────────────────────────────────── */
function computeBadges(totalSessions: number, currentStreak: number) {
  return [
    { icon: "🎯", label: "First Session",   earned: totalSessions  >= 1,  color: C.genPurple },
    { icon: "🔥", label: "3-Day Streak",    earned: currentStreak  >= 3,  color: C.sun       },
    { icon: "📖", label: "Explorer",        earned: totalSessions  >= 5,  color: C.genBlue   },
    { icon: "🏆", label: "Quiz Champion",   earned: false,                color: C.edGreen   },
    { icon: "⭐", label: "Shapes Master",   earned: false,                color: C.sun       },
    { icon: "🚀", label: "7-Day Streak",    earned: currentStreak  >= 7,  color: C.coral     },
  ];
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase" as const, letterSpacing: 1.5, fontFamily: "'DM Sans',sans-serif" }}>
        {label}
      </span>
    </div>
  );
}

function Badge({ icon, label, earned, color }: { icon: string; label: string; earned: boolean; color: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6,
      padding: "14px 8px", borderRadius: 18,
      background: earned ? `${color}08` : "#F8F9FA",
      border: `1.5px solid ${earned ? `${color}25` : C.border}`,
      opacity: earned ? 1 : 0.55,
      filter: earned ? "none" : "grayscale(0.7)",
      transition: "all 0.25s",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 13,
        background: earned ? `${color}15` : "#EDF2F7",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
      }}>{icon}</div>
      <span style={{ fontSize: 10, fontWeight: 700, color: earned ? color : C.textMuted, textAlign: "center" as const, lineHeight: 1.3, fontFamily: "'DM Sans',sans-serif" }}>{label}</span>
      {!earned && <span style={{ fontSize: 9, color: C.textMuted }}>🔒</span>}
    </div>
  );
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.card, borderRadius: 24, padding: "22px 24px",
      border: `1px solid ${C.border}`, marginBottom: 16,
      boxShadow: "0 1px 4px rgba(0,0,0,0.03)", ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export function StudentProfile() {
  const router = useRouter();
  const {
    studentProfile, logoutStudent,
    availablePartners, fetchAvailablePartners,
    sendPartnerRequest, partnerRequestStatus,
    enrolledPartners, fetchEnrolledPartners, isEnrolledPartnersLoading,
    linkParent, studentStats, fetchStudentStats,
  } = useStudentStore();
  const { completeAction } = useTutorialStore();

  const [sidebarOpen,      setSidebarOpen]      = useState(true);
  const [avatarColor,      setAvatarColor]      = useState(C.genPurple);
  const [soundEnabled,     setSoundEnabled]      = useState(true);
  const [parentInput,      setParentInput]       = useState("");
  const [selectedPartner,  setSelectedPartner]   = useState("");
  const [mounted,          setMounted]           = useState(false);

  /* responsive sidebar */
  useEffect(() => {
    const handle = () => setSidebarOpen(window.innerWidth >= 1024);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchAvailablePartners();
    fetchEnrolledPartners();
    fetchStudentStats();
  }, [fetchAvailablePartners, fetchEnrolledPartners, fetchStudentStats]);

  const isLoading = partnerRequestStatus === "loading";

  const username      = studentProfile?.username      ?? "Student";
  const displayName   = studentProfile?.name || username;
  const grade         = studentProfile?.grade         ? `Grade ${studentProfile.grade}` : "—";
  const board         = studentProfile?.school_board  ?? "CBSE";
  const initials      = displayName.charAt(0).toUpperCase();
  const aiTutorName   = studentProfile?.ai_name || "Nia";
  const streakCount   = studentStats?.currentStreak ?? 0;
  const totalSessions = studentStats?.totalSessions  ?? 0;
  const longestStreak = studentStats?.longestStreak  ?? 0;
  const badges        = computeBadges(totalSessions, streakCount);

  const learningTraits = [
    { icon: "👁️", title: "Visual Learner",    description: "You understand best with pictures, diagrams, and colors." },
    { icon: "📖", title: "Story Lover",        description: "You remember things better when told as stories." },
    { icon: "🎮", title: "Likes Challenges",   description: "You enjoy puzzles and tricky questions!" },
  ];

  const handleLinkParent = async () => {
    if (parentInput.trim()) {
      await linkParent(parentInput.trim());
      setParentInput("");
    }
  };

  const fade = (d = 0): React.CSSProperties => ({
    opacity:   mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.5s ease ${d}s, transform 0.5s ease ${d}s`,
  });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'DM Sans','Nunito',system-ui,sans-serif", background: C.pageBg }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Nunito:wght@600;700;800&display=swap" rel="stylesheet" />

      {/* Sidebar */}
      <StudentHomeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Mobile topbar */}
        {!sidebarOpen && (
          <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0, gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.border}`, background: C.pageBg, color: C.textMid, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}
            >☰</button>
            <span style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: 15, color: C.text, fontFamily: "'Nunito',sans-serif" }}>My Profile</span>
            <div style={{ width: 38, flexShrink: 0 }} />
          </div>
        )}

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", position: "relative" }}>

          {/* Bg decoration */}
          <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: "50%", background: `radial-gradient(circle, ${C.genPurple}06, transparent 70%)`, pointerEvents: "none" }} />

          <div style={{ maxWidth: 960, margin: "0 auto", padding: sidebarOpen ? "32px 40px 60px" : "24px 16px 60px" }}>

            {/* Back button + title row (desktop) */}
            {sidebarOpen && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, ...fade(0.05) }}>
                <button
                  onClick={() => router.push("/student")}
                  style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, color: C.textMid, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}
                >←</button>
              </div>
            )}

            {/* ── HERO CARD ── */}
            <div style={{
              background: C.card, borderRadius: 24, padding: "32px 24px", border: `1px solid ${C.border}`,
              display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
              marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.03)", ...fade(0.08),
            }}>
              {/* Avatar */}
              <div style={{
                width: 88, height: 88, borderRadius: 28,
                background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}CC)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 8px 24px ${avatarColor}30`, border: "3px solid white",
              }}>
                <span style={{ color: "white", fontSize: 36, fontWeight: 800, fontFamily: "'Nunito',sans-serif" }}>{initials}</span>
              </div>

              {/* Color picker */}
              <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" as const, justifyContent: "center" }}>
                {AVATAR_COLORS.map(col => (
                  <button key={col} onClick={() => setAvatarColor(col)} style={{
                    width: col === avatarColor ? 22 : 18, height: col === avatarColor ? 22 : 18,
                    borderRadius: "50%", background: col, border: col === avatarColor ? "2px solid white" : "none",
                    cursor: "pointer", boxShadow: col === avatarColor ? `0 0 0 2px ${col}` : "none",
                    transition: "all 0.2s", flexShrink: 0,
                  }} />
                ))}
              </div>

              <h1 style={{ fontSize: "clamp(22px,4vw,28px)", fontWeight: 800, color: C.text, marginTop: 14, fontFamily: "'Nunito',sans-serif" }}>{displayName}</h1>
              <p style={{ fontSize: 13, color: C.textMid, fontWeight: 600, marginTop: 4 }}>{grade} · {board}</p>
              <p style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, marginTop: 4 }}>AI Tutor: {aiTutorName}</p>

              {/* Stat strip */}
              <div style={{ display: "flex", gap: 0, marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.border}`, width: "100%", justifyContent: "space-around" }}>
                {[
                  { icon: "🔥", value: streakCount,   label: "day streak",     color: C.sun      },
                  { icon: "📚", value: totalSessions, label: "sessions",        color: C.genBlue  },
                  { icon: "⭐", value: longestStreak, label: "longest streak",  color: C.genPurple },
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center", maxWidth: 120 }}>
                    <div style={{ fontSize: "clamp(18px,3vw,22px)", fontWeight: 800, color: s.color, fontFamily: "'Nunito',sans-serif" }}>{s.icon} {s.value}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase" as const, letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── HOW APRIL SEES YOU ── */}
            <div style={{ background: `linear-gradient(135deg, ${C.genPurple}06, ${C.genBlue}06)`, borderRadius: 24, padding: "22px 24px", border: `1px solid ${C.genPurple}12`, marginBottom: 16, ...fade(0.14) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 15 }}>🧠</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.genPurple, textTransform: "uppercase" as const, letterSpacing: 1.2, fontFamily: "'DM Sans',sans-serif" }}>{`How ${aiTutorName} Sees You`}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {learningTraits.map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: "white", borderRadius: 14, border: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{t.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'DM Sans',sans-serif" }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: C.textMid, marginTop: 2, lineHeight: 1.5 }}>{t.description}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 10, color: C.textMuted, marginTop: 12, fontStyle: "italic", textAlign: "center" as const }}>Based on your onboarding and learning patterns</p>
            </div>

            {/* ── BADGES ── */}
            <Card style={{ ...fade(0.20) }}>
              <SectionHeader icon="🏅" label="My Badges" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {badges.map((b, i) => <Badge key={i} {...b} />)}
              </div>
            </Card>

            {/* ── MY SCHOOL ── */}
            <Card style={{ ...fade(0.26) }}>
              <SectionHeader icon="🏫" label="My School" />
              {isEnrolledPartnersLoading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                  <Loader2 size={18} style={{ color: C.textMuted, animation: "spin 1s linear infinite" }} />
                </div>
              ) : enrolledPartners.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {enrolledPartners.map((partner, i) => (
                    <div key={partner.partner_id ?? partner.id ?? `ep-${i}`} style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                      background: `${C.edGreen}06`, borderRadius: 16, border: `1px solid ${C.edGreen}15`,
                    }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: `${C.edGreen}12`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: C.edGreen, fontFamily: "'Nunito',sans-serif", flexShrink: 0 }}>
                        {(partner.organization ?? "PT").substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{partner.organization}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.growth }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: C.growth }}>Connected</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center" as const, padding: "8px 0" }}>No school connected yet.</p>
              )}

              {/* Partner request */}
              <div style={{ marginTop: 14 }}>
                <div style={{ position: "relative" as const }}>
                  <select
                    value={selectedPartner}
                    onChange={e => setSelectedPartner(e.target.value)}
                    disabled={isLoading}
                    style={{
                      width: "100%", padding: "10px 38px 10px 14px", borderRadius: 12,
                      border: `1.5px solid ${C.border}`, background: C.pageBg,
                      fontSize: 12, fontWeight: 600, color: C.textMid,
                      outline: "none", cursor: "pointer", appearance: "none" as const,
                      fontFamily: "'DM Sans',sans-serif",
                    }}
                  >
                    <option value="" disabled>Connect to a school...</option>
                    {availablePartners.map((p, i) => (
                      <option key={p.partner_id ?? p.id ?? `avp-${i}`} value={p.partner_id ?? p.id}>{p.organization}</option>
                    ))}
                  </select>
                  <div style={{ position: "absolute" as const, right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textMuted, fontSize: 12 }}>▾</div>
                </div>
                <button
                  onClick={async () => {
                    if (!selectedPartner) return;
                    await sendPartnerRequest(selectedPartner);
                    completeAction("send_admin_request");
                    setSelectedPartner("");
                  }}
                  disabled={!selectedPartner || isLoading}
                  style={{
                    marginTop: 10, width: "100%", padding: "11px", borderRadius: 12,
                    background: selectedPartner && !isLoading ? C.genPurple : C.border,
                    color: "white", border: "none", fontWeight: 700, fontSize: 13,
                    cursor: selectedPartner && !isLoading ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    transition: "background 0.2s",
                  }}
                >
                  {isLoading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Sending...</> : "Send Request"}
                </button>
              </div>
            </Card>

            {/* ── MY FAMILY ── */}
            <Card style={{ ...fade(0.32) }}>
              <SectionHeader icon="👨‍👩‍👧" label="My Family" />
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Guardian's email or phone"
                  value={parentInput}
                  onChange={e => setParentInput(e.target.value)}
                  disabled={isLoading}
                  style={{
                    flex: 1, minWidth: 0, padding: "10px 14px", borderRadius: 12,
                    border: `1.5px solid ${C.border}`, fontSize: 12, fontWeight: 500,
                    outline: "none", fontFamily: "'DM Sans',sans-serif", background: C.pageBg,
                  }}
                />
                <button
                  onClick={handleLinkParent}
                  disabled={!parentInput.trim() || isLoading}
                  style={{
                    padding: "10px 18px", borderRadius: 12, background: C.genPurple, color: "white",
                    border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer",
                    opacity: !parentInput.trim() || isLoading ? 0.5 : 1, flexShrink: 0,
                  }}
                >
                  {isLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Add"}
                </button>
              </div>
            </Card>

            {/* ── SETTINGS ── */}
            <Card style={{ ...fade(0.38) }}>
              <SectionHeader icon="⚙️" label="Settings" />
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {/* Sound toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 14, background: C.pageBg, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{soundEnabled ? "🔊" : "🔇"}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Sound Effects</span>
                  </div>
                  <button
                    onClick={() => setSoundEnabled(v => !v)}
                    style={{ width: 44, height: 26, borderRadius: 13, cursor: "pointer", border: "none", background: soundEnabled ? C.growth : C.border, position: "relative" as const, transition: "background 0.2s" }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "white", position: "absolute" as const, top: 3, left: soundEnabled ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
                  </button>
                </div>

                {/* Logout */}
                <button
                  onClick={logoutStudent}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 14, border: "1.5px solid #FEE2E2", background: "#FEF2F2", color: "#EF4444", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                >
                  🚪 Logout
                </button>
              </div>
            </Card>

          </div>
        </div>
      </main>

      <PartnerRequestModal />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 5px }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px }
      `}</style>
    </div>
  );
}
