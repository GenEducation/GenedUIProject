import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Switch,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { PickerSheet } from "@/components/PickerSheet";
import { useMeData } from "@/hooks/useMeData";
import { useAuth } from "@/store/useAuthStore";
import { useRouter } from "expo-router";
import { studentService } from "@/services/studentService";
import { prefsStore, usePrefs } from "@/store/usePrefsStore";
import { colors, fonts } from "@/theme/tokens";
import type { VoiceOption, GeneralOnboarding, PartnerItem } from "@/types/api";

const AVATAR_COLORS = [
  colors.genPurple,
  colors.genBlue,
  colors.edGreen,
  colors.coral,
  colors.sun,
];

/* ── Supported instruction languages ─────────────────────────────────────── */
const LANGUAGES: { code: string; label: string }[] = [
  { code: "en",      label: "English"              },
  { code: "hi",      label: "Hindi (हिन्दी)"       },
  { code: "hi-Latn", label: "Hinglish"             },
  { code: "mr",      label: "Marathi (मराठी)"      },
  { code: "pa",      label: "Punjabi (ਪੰਜਾਬੀ)"    },
  { code: "ta",      label: "Tamil (தமிழ்)"        },
  { code: "te",      label: "Telugu (తెలుగు)"      },
  { code: "kn",      label: "Kannada (ಕನ್ನಡ)"     },
];

/* ── Trait groups (mirrors website) ───────────────────────────────────────── */
const TRAIT_GROUPS: { key: keyof GeneralOnboarding; icon: string; title: string }[] = [
  { key: "learning_preferences", icon: "🎧", title: "Learning Style" },
  { key: "interests",            icon: "✨", title: "Interests"      },
  { key: "strengths",            icon: "💪", title: "Strengths"      },
  { key: "weaknesses",           icon: "🎯", title: "Growing On"     },
];

function buildTraits(onboarding: GeneralOnboarding | null) {
  if (!onboarding) return [];
  const sentenceCase = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  return TRAIT_GROUPS.flatMap(({ key, icon, title }) => {
    const values = (onboarding[key] as string[] | undefined)?.filter(Boolean) ?? [];
    if (values.length === 0) return [];
    return [{ icon, title, description: values.map(sentenceCase).join(", ") }];
  });
}

/* ── Badge computation (mirrors website) ──────────────────────────────────── */
function computeBadges(totalSessions: number, currentStreak: number) {
  return [
    { icon: "🎯", label: "First Session", earned: totalSessions >= 1,  color: colors.genPurple },
    { icon: "🔥", label: "3-Day Streak",  earned: currentStreak >= 3,  color: colors.sun       },
    { icon: "📖", label: "Explorer",      earned: totalSessions >= 5,  color: colors.genBlue   },
    { icon: "🚀", label: "7-Day Streak",  earned: currentStreak >= 7,  color: colors.coral     },
    { icon: "🏆", label: "Dedicated",     earned: totalSessions >= 20, color: colors.edGreen   },
    { icon: "⭐", label: "Star Learner",  earned: totalSessions >= 50, color: colors.sun       },
  ];
}

/* ── Section header ───────────────────────────────────────────────────────── */
function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={sh.row}>
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text style={sh.label}>{label}</Text>
    </View>
  );
}
const sh = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  label: { fontSize: 11, fontFamily: fonts.dmBold, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.5 },
});

/* ── Card wrapper ─────────────────────────────────────────────────────────── */
function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export default function Me() {
  const { state, logout } = useAuth();
  const router = useRouter();
  const { profile, streak, voices, onboarding, enrolledPartners, loading, error, refetch } = useMeData();

  const prefs = usePrefs();

  const [avatarColor, setAvatarColor]     = useState<string>(colors.genPurple);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [voiceUpdating, setVoiceUpdating] = useState(false);
  const [parentInput, setParentInput]     = useState("");
  const [parentSending, setParentSending] = useState(false);

  // Language preference
  const [preferredLanguage, setPreferredLanguage]     = useState<string>("en");
  const [multilingualEnabled, setMultilingualEnabled] = useState(false);
  const [isLanguageSaving, setIsLanguageSaving]       = useState(false);
  const [langPickerOpen, setLangPickerOpen]           = useState(false);

  // School (partner) request flow
  const [availablePartners, setAvailablePartners] = useState<PartnerItem[]>([]);
  const [partnerPickerOpen, setPartnerPickerOpen] = useState(false);
  const [partnerSending, setPartnerSending]       = useState(false);
  const [partnerMsg, setPartnerMsg]               = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Load language preferences when user is known
  useEffect(() => {
    const userId = state.status === "authenticated" ? state.profile.user_id : null;
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await studentService.fetchLanguagePreferences(userId);
        if (cancelled) return;
        setMultilingualEnabled(data.multilingual_enabled ?? false);
        setPreferredLanguage(data.preferred_language ?? "en");
      } catch {
        // non-fatal — section stays hidden
      }
    })();
    return () => { cancelled = true; };
  }, [state.status]);

  const handleLanguageChange = async (langCode: string) => {
    const userId = state.status === "authenticated" ? state.profile.user_id : null;
    if (!userId || isLanguageSaving) return;
    setPreferredLanguage(langCode);
    setIsLanguageSaving(true);
    try {
      const data = await studentService.updateLanguagePreferences(userId, { preferred_language: langCode });
      setPreferredLanguage(data.preferred_language ?? langCode);
    } catch {
      // revert on failure — refetch to get correct value
      try {
        const data = await studentService.fetchLanguagePreferences(userId);
        setPreferredLanguage(data.preferred_language ?? "en");
      } catch {}
    } finally {
      setIsLanguageSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/sign-in");
  };

  const openPartnerPicker = async () => {
    setPartnerMsg(null);
    try {
      const list = await studentService.fetchPartners();
      setAvailablePartners(Array.isArray(list) ? list : []);
      setPartnerPickerOpen(true);
    } catch {
      setPartnerMsg({ kind: "err", text: "Couldn't load schools. Try again." });
    }
  };

  const handlePartnerRequest = async (partner: PartnerItem) => {
    const id = partner.partner_id ?? partner.id;
    if (!id || partnerSending) return;
    setPartnerSending(true);
    setPartnerMsg(null);
    try {
      await studentService.sendPartnerRequest(id);
      setPartnerMsg({ kind: "ok", text: `Request sent to ${partner.organization}.` });
      refetch();
    } catch {
      setPartnerMsg({ kind: "err", text: "Couldn't send request. Try again." });
    } finally {
      setPartnerSending(false);
    }
  };

  if (loading) {
    return (
      <Screen background={colors.pageBg}>
        <LoadingState message="Loading your profile…" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen background={colors.pageBg}>
        <ErrorState message="Couldn't load your profile." onRetry={refetch} />
      </Screen>
    );
  }

  const displayProfile =
    profile ??
    (state.status === "authenticated" ? state.profile : null);

  const firstName = (displayProfile?.name ?? displayProfile?.username ?? "?").split(" ")[0];
  const initial   = firstName[0]?.toUpperCase() ?? "?";
  const grade     = displayProfile?.grade;
  const board     = displayProfile?.school_board;
  const aiName    = displayProfile?.ai_name ?? "Nia";
  const currentVoice = selectedVoice ?? displayProfile?.preferred_voice ?? "—";

  const statItems = [
    { icon: "🔥", val: streak?.current_streak  ?? 0, label: "day streak",  color: colors.sun       },
    { icon: "📚", val: streak?.total_sessions   ?? 0, label: "sessions",    color: colors.genBlue   },
    { icon: "⭐", val: streak?.longest_streak   ?? 0, label: "best streak", color: colors.genPurple },
  ];

  const traits = buildTraits(onboarding);
  const badges = computeBadges(streak?.total_sessions ?? 0, streak?.current_streak ?? 0);

  const partners = enrolledPartners?.partners ?? [];

  const handleVoiceChange = async (voice: VoiceOption) => {
    if (!displayProfile?.user_id || voiceUpdating) return;
    setSelectedVoice(voice.id);
    setVoiceUpdating(true);
    try {
      await studentService.updateProfile({ user_id: displayProfile.user_id, preferred_voice: voice.id });
    } catch {
      setSelectedVoice(displayProfile?.preferred_voice ?? null);
    } finally {
      setVoiceUpdating(false);
    }
  };

  const handleLinkParent = async () => {
    if (!parentInput.trim() || parentSending) return;
    setParentSending(true);
    try {
      await studentService.linkParent(parentInput.trim());
      setParentInput("");
    } catch {
      // silent fail — user can retry
    } finally {
      setParentSending(false);
    }
  };

  return (
    <Screen background={colors.pageBg}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.dots}>
            {AVATAR_COLORS.map((c) => {
              const active = c === avatarColor;
              return (
                <Pressable
                  key={c}
                  onPress={() => setAvatarColor(c)}
                  style={[
                    styles.dot,
                    { backgroundColor: c, width: active ? 20 : 16, height: active ? 20 : 16 },
                    active && { borderWidth: 2, borderColor: "#fff" },
                  ]}
                />
              );
            })}
          </View>
          <Text style={styles.name}>
            {displayProfile?.name ?? displayProfile?.username ?? "—"}
          </Text>
          {(grade || board) ? (
            <Text style={styles.grade}>
              {grade ? `Grade ${grade}` : ""}
              {grade && board ? " · " : ""}
              {board ?? ""}
            </Text>
          ) : null}
          <Text style={styles.tutor}>AI Tutor: {aiName}</Text>
          <View style={styles.statRow}>
            {statItems.map((s) => (
              <View key={s.label} style={styles.statCell}>
                <Text style={[styles.statV, { color: s.color }]}>{s.icon} {s.val}</Text>
                <Text style={styles.statL}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── How {tutor} Sees You ── */}
        <View style={[styles.card, styles.traitsCard]}>
          <View style={sh.row}>
            <Text style={{ fontSize: 15 }}>🧠</Text>
            <Text style={[sh.label, { color: colors.genPurple }]}>How {aiName} Sees You</Text>
          </View>
          {traits.length > 0 ? (
            <>
              {traits.map((t, i) => (
                <View key={i} style={styles.traitRow}>
                  <Text style={{ fontSize: 18 }}>{t.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.traitTitle}>{t.title}</Text>
                    <Text style={styles.traitDesc}>{t.description}</Text>
                  </View>
                </View>
              ))}
              <Text style={styles.traitNote}>Based on your onboarding and learning patterns</Text>
            </>
          ) : (
            <Text style={styles.emptyText}>
              Complete onboarding to see how {aiName} understands your learning style.
            </Text>
          )}
        </View>

        {/* ── Tutor Voice ── */}
        {voices.length > 0 ? (
          <Card>
            <View style={styles.voiceHeader}>
              <Text style={{ fontSize: 17 }}>🎙️</Text>
              <Text style={styles.voiceLabel}>TUTOR VOICE</Text>
              <Text style={styles.voiceVal}>
                {voices.find((v) => v.id === currentVoice)?.label ?? currentVoice}
              </Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="m6 9 6 6 6-6" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </View>
            <View style={styles.voiceList}>
              {voices.map((v) => (
                <Pressable
                  key={v.id}
                  style={[styles.voiceChip, currentVoice === v.id && styles.voiceChipActive]}
                  onPress={() => handleVoiceChange(v)}
                  disabled={voiceUpdating}
                >
                  <Text style={[styles.voiceChipText, currentVoice === v.id && styles.voiceChipTextActive]}>
                    {v.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ) : (
          <Card>
            <View style={styles.voiceHeader}>
              <Text style={{ fontSize: 17 }}>🎙️</Text>
              <Text style={styles.voiceLabel}>TUTOR VOICE</Text>
              <Text style={styles.voiceVal}>{currentVoice}</Text>
            </View>
          </Card>
        )}

        {/* ── Language of Instruction ── */}
        {multilingualEnabled ? (
          <Card>
            <SectionHeader icon="🌐" label="Language of Instruction" />
            <Pressable
              style={[styles.langRow, isLanguageSaving && { opacity: 0.6 }]}
              onPress={() => !isLanguageSaving && setLangPickerOpen(true)}
            >
              <Text style={styles.langRowLabel}>🗣️  Preferred Language</Text>
              <View style={styles.langRowRight}>
                <Text style={styles.langVal}>
                  {LANGUAGES.find((l) => l.code === preferredLanguage)?.label ?? preferredLanguage}
                </Text>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="m6 9 6 6 6-6" stroke={colors.textMuted} strokeWidth={2} strokeLinecap="round" />
                </Svg>
              </View>
            </Pressable>
          </Card>
        ) : null}

        {/* ── Badges ── */}
        <Card>
          <SectionHeader icon="🏅" label="My Badges" />
          <View style={styles.badgeGrid}>
            {badges.map((b, i) => (
              <View
                key={i}
                style={[
                  styles.badge,
                  { borderColor: b.earned ? b.color + "40" : colors.border, backgroundColor: b.earned ? b.color + "08" : "#F8F9FA", opacity: b.earned ? 1 : 0.55 },
                ]}
              >
                <View style={[styles.badgeIcon, { backgroundColor: b.earned ? b.color + "15" : "#EDF2F7" }]}>
                  <Text style={{ fontSize: 18 }}>{b.icon}</Text>
                </View>
                <Text style={[styles.badgeLabel, { color: b.earned ? b.color : colors.textMuted }]}>{b.label}</Text>
                {!b.earned && <Text style={{ fontSize: 9, color: colors.textMuted }}>🔒</Text>}
              </View>
            ))}
          </View>
        </Card>

        {/* ── My School ── */}
        <Card>
          <SectionHeader icon="🏫" label="My School" />
          {partners.length > 0 ? (
            <View style={{ gap: 10, marginBottom: 14 }}>
              {partners.map((p, i) => (
                <View key={p.partner_id ?? `p-${i}`} style={styles.partnerRow}>
                  <View style={styles.partnerIcon}>
                    <Text style={styles.partnerIconText}>
                      {(p.organization ?? "PT").substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.partnerName}>{p.organization}</Text>
                    <View style={styles.connectedRow}>
                      <View style={styles.connectedDot} />
                      <Text style={styles.connectedText}>Connected</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { marginBottom: 10 }]}>No school connected yet.</Text>
          )}

          <Pressable
            style={[styles.actionBtn, partnerSending && { opacity: 0.6 }]}
            onPress={openPartnerPicker}
            disabled={partnerSending}
          >
            {partnerSending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.actionBtnText}>Connect a school</Text>}
          </Pressable>
          {partnerMsg ? (
            <Text
              style={[
                styles.partnerMsg,
                { color: partnerMsg.kind === "ok" ? "#00B894" : colors.coral },
              ]}
            >
              {partnerMsg.text}
            </Text>
          ) : null}
        </Card>

        {/* ── Settings ── */}
        <Card>
          <SectionHeader icon="⚙️" label="Settings" />
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Sound effects</Text>
            <Switch
              value={prefs.soundEnabled}
              onValueChange={prefsStore.setSoundEnabled}
              trackColor={{ false: colors.border, true: colors.genPurple + "88" }}
              thumbColor={prefs.soundEnabled ? colors.genPurple : "#f4f3f4"}
            />
          </View>
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.settingLabel}>Voice activation</Text>
            <View style={styles.segment}>
              {(["continuous", "ptt"] as const).map((mode) => {
                const active = prefs.listenMode === mode;
                return (
                  <Pressable
                    key={mode}
                    style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                    onPress={() => prefsStore.setListenMode(mode)}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {mode === "continuous" ? "Continuous" : "Push to talk"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>

        {/* ── My Family ── */}
        <Card>
          <SectionHeader icon="👨‍👩‍👧" label="My Family" />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Guardian's email or phone"
              placeholderTextColor={colors.textMuted}
              value={parentInput}
              onChangeText={setParentInput}
              editable={!parentSending}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable
              style={[styles.addBtn, (!parentInput.trim() || parentSending) && { opacity: 0.5 }]}
              onPress={handleLinkParent}
              disabled={!parentInput.trim() || parentSending}
            >
              {parentSending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.addBtnText}>Add</Text>}
            </Pressable>
          </View>
        </Card>

        {/* ── Logout ── */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

      </ScrollView>

      <PickerSheet
        visible={partnerPickerOpen}
        title="Connect a school"
        options={availablePartners.map((p) => p.organization)}
        selected=""
        onSelect={(org) => {
          const p = availablePartners.find((x) => x.organization === org);
          if (p) handlePartnerRequest(p);
        }}
        onClose={() => setPartnerPickerOpen(false)}
        emptyText="No schools available to join"
      />

      <PickerSheet
        visible={langPickerOpen}
        title="Language of Instruction"
        options={LANGUAGES.map((l) => l.label)}
        selected={LANGUAGES.find((l) => l.code === preferredLanguage)?.label ?? ""}
        onSelect={(label) => {
          const lang = LANGUAGES.find((l) => l.label === label);
          if (lang) handleLanguageChange(lang.code);
          setLangPickerOpen(false);
        }}
        onClose={() => setLangPickerOpen(false)}
        emptyText="No languages available"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
  },

  traitsCard: {
    backgroundColor: colors.genPurple + "06",
    borderColor: colors.genPurple + "20",
  },

  /* Hero */
  hero: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "#fff",
  },
  avatarText: { color: "#fff", fontFamily: fonts.nunito, fontSize: 32 },
  dots: { flexDirection: "row", gap: 6, marginTop: 12, alignItems: "center" },
  dot:  { borderRadius: 999 },
  name: { fontFamily: fonts.nunito, fontSize: 24, color: colors.text, marginTop: 13 },
  grade: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.textMid, marginTop: 4 },
  tutor: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.textMuted, marginTop: 4 },
  statRow: {
    flexDirection: "row", marginTop: 16, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: colors.border,
    width: "100%", justifyContent: "space-around",
  },
  statCell: { alignItems: "center", flex: 1 },
  statV: { fontFamily: fonts.nunito, fontSize: 19 },
  statL: { fontFamily: fonts.dmBold, fontSize: 9.5, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },

  /* Traits */
  traitRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 10, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  traitTitle: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.text },
  traitDesc: { fontFamily: fonts.dm, fontSize: 11, color: colors.textMid, marginTop: 2, lineHeight: 16 },
  traitNote: { fontFamily: fonts.dm, fontSize: 10, color: colors.textMuted, fontStyle: "italic", textAlign: "center", marginTop: 6 },
  emptyText: { fontFamily: fonts.dm, fontSize: 12, color: colors.textMuted, textAlign: "center", paddingVertical: 8 },

  /* Voice */
  voiceHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  voiceLabel:  { flex: 1, fontFamily: fonts.dmBold, fontSize: 13, color: colors.textMuted, letterSpacing: 1.4 },
  voiceVal:    { fontFamily: fonts.dmBold, fontSize: 14, color: colors.genPurple },
  voiceList:   { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  voiceChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.pageBg,
  },
  voiceChipActive:    { borderColor: colors.genPurple, backgroundColor: colors.genPurple + "12" },
  voiceChipText:      { fontFamily: fonts.dmBold, fontSize: 12, color: colors.textMid },
  voiceChipTextActive: { color: colors.genPurple },

  /* Badges */
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badge: {
    width: "30%", flexGrow: 1, alignItems: "center", gap: 6,
    paddingVertical: 14, paddingHorizontal: 8, borderRadius: 18, borderWidth: 1.5,
  },
  badgeIcon:  { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  badgeLabel: { fontFamily: fonts.dmBold, fontSize: 10, textAlign: "center", lineHeight: 14 },

  /* School */
  partnerRow:      { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, backgroundColor: colors.edGreen + "06", borderRadius: 16, borderWidth: 1, borderColor: colors.edGreen + "15" },
  partnerIcon:     { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.edGreen + "12", alignItems: "center", justifyContent: "center" },
  partnerIconText: { fontFamily: fonts.nunito, fontSize: 14, fontWeight: "800", color: colors.edGreen },
  partnerName:     { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  connectedRow:    { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  connectedDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: "#00B894" },
  connectedText:   { fontFamily: fonts.dmBold, fontSize: 11, color: "#00B894" },
  actionBtn: {
    marginTop: 4, backgroundColor: colors.genPurple, borderRadius: 12,
    paddingVertical: 11, alignItems: "center",
  },
  actionBtnText: { fontFamily: fonts.dmBold, fontSize: 13, color: "#fff" },
  partnerMsg: { fontFamily: fonts.dmMedium, fontSize: 12, marginTop: 10, textAlign: "center" },

  /* Settings */
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "80",
  },
  settingLabel: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.text },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.pageBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  segmentBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  segmentBtnActive: { backgroundColor: colors.genPurple },
  segmentText: { fontFamily: fonts.dmBold, fontSize: 11, color: colors.textMuted },
  segmentTextActive: { color: "#fff" },

  /* Family */
  inputRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.border,
    fontFamily: fonts.dm, fontSize: 12, color: colors.text, backgroundColor: colors.pageBg,
  },
  addBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12,
    backgroundColor: colors.genPurple, justifyContent: "center",
  },
  addBtnText: { fontFamily: fonts.dmBold, fontSize: 12, color: "#fff" },

  /* Language */
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.pageBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langRowLabel: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.text },
  langRowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  langVal:      { fontFamily: fonts.dmBold, fontSize: 13, color: colors.genPurple },

  /* Logout */
  logoutBtn: {
    marginTop: 8, borderWidth: 1.5, borderColor: colors.coral + "66",
    borderRadius: 14, paddingVertical: 14, alignItems: "center",
    backgroundColor: colors.coral + "0a",
  },
  logoutText: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.coral },
});
