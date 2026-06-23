/**
 * Schedule tab — book TEST or LEARNING sessions for the selected child and
 * view their upcoming sessions. Header has child switcher + notification bell.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { ArrowRight, CalendarClock, CheckCircle2, Clock, AlertTriangle } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { ChildSwitcherSheet } from "@/components/parent/ChildSwitcherSheet";
import { NotificationBell } from "@/components/parent/NotificationBell";
import { PickerField, PickerSheet } from "@/components/PickerSheet";
import { MonthCalendar } from "@/components/MonthCalendar";
import { useLinkedChildren } from "@/hooks/useLinkedChildren";
import { useParentId } from "@/hooks/useParentId";
import { useParentStore } from "@/store/useParentStore";
import { studentService } from "@/services/studentService";
import { scheduleService } from "@/services/scheduleService";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { colors, fonts, radius } from "@/theme/tokens";
import type { SessionType, ScheduleSessionResponse } from "@/types/schedule";

function pad(n: number) { return n.toString().padStart(2, "0"); }
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface SubjectOpt { subject: string; document_titles: string[] }

function Banner({ tone, text }: { tone: "error" | "success"; text: string }) {
  const ok = tone === "success";
  return (
    <View style={[s.banner, { backgroundColor: ok ? "#E7F8F0" : "#FFF1EC" }]}>
      <Text style={[s.bannerText, { color: ok ? colors.edGreen : colors.coral }]}>{text}</Text>
    </View>
  );
}

export default function ParentSchedule() {
  const parentId = useParentId();
  const { approvedChildren, loading: childrenLoading } = useLinkedChildren();
  const { selectedChildId } = useParentStore();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const selectedChild = useMemo(
    () => approvedChildren.find((c) => c.id === selectedChildId) ?? approvedChildren[0] ?? null,
    [approvedChildren, selectedChildId]
  );

  /* Session booking state */
  const [subjectOpts, setSubjectOpts] = useState<SubjectOpt[]>([]);
  const [sessionType, setSessionType] = useState<SessionType>("LEARNING");
  const [subject, setSubject]         = useState("");
  const [topic, setTopic]             = useState("");
  const [date, setDate]               = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  });
  const [pickerOpen, setPickerOpen]   = useState<null | "subject" | "chapter">(null);
  const [booking, setBooking]         = useState(false);
  const [bookError, setBookError]     = useState<string | null>(null);
  const [booked, setBooked]           = useState(false);

  /* Sessions list */
  const [sessions, setSessions]       = useState<ScheduleSessionResponse[]>([]);
  const [loading, setLoading]         = useState(false);

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  }, []);

  const loadSessions = useCallback(async () => {
    if (!selectedChild) return;
    setLoading(true);
    try {
      const list = await scheduleService.getScheduledSessions(selectedChild.id);
      setSessions(Array.isArray(list) ? list : []);
    } catch { /* keep previous */ }
    finally { setLoading(false); }
  }, [selectedChild?.id]);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  useRefreshOnFocus(loadSessions);

  /* Load subjects via available-agents */
  useEffect(() => {
    if (!selectedChild) return;
    studentService.fetchAvailableAgents(selectedChild.id).then((res) => {
      const seen = new Set<string>();
      const opts: SubjectOpt[] = [];
      for (const p of res?.partners ?? []) {
        for (const ps of p?.subjects ?? []) {
          const key = (ps.subject ?? "").toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          const a = ps.agents?.[0];
          opts.push({ subject: ps.subject, document_titles: a?.document_titles ?? [] });
        }
      }
      setSubjectOpts(opts);
      if (opts.length) setSubject((prev) => prev || opts[0].subject);
    }).catch(() => {});
  }, [selectedChild?.id]);

  const chapters = useMemo(
    () => subjectOpts.find((s) => s.subject === subject)?.document_titles ?? [],
    [subjectOpts, subject]
  );
  useEffect(() => {
    setTopic((prev) => (chapters.includes(prev) ? prev : chapters[0] ?? ""));
  }, [chapters]);

  const canBook = !!subject && !!date && !(sessionType === "TEST" && !topic) && !booking;

  const handleBook = async () => {
    if (!selectedChild) return;
    setBooking(true);
    setBookError(null);
    setBooked(false);
    try {
      await scheduleService.scheduleSession({
        user_id: selectedChild.id,
        session_type: sessionType,
        subject,
        topic: topic || undefined,
        scheduled_date: date,
      });
      await loadSessions();
      setBooked(true);
      setTimeout(() => setBooked(false), 4000);
    } catch (err) {
      setBookError(err instanceof Error ? err.message : "Failed to schedule session");
    } finally {
      setBooking(false);
    }
  };

  if (childrenLoading && approvedChildren.length === 0) {
    return (
      <Screen background={colors.pageBg}>
        <LoadingState message="Loading…" />
      </Screen>
    );
  }

  if (approvedChildren.length === 0) {
    return (
      <Screen background={colors.pageBg}>
        <EmptyState
          icon="🗓️"
          title="No approved children"
          message="Approve a child link from the Children tab to manage their schedule."
        />
      </Screen>
    );
  }

  const sorted = [...sessions].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  return (
    <Screen background={colors.pageBg}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.switcher} onPress={() => setSwitcherOpen(true)}>
          <View style={s.childAvatar}>
            <Text style={s.childInitial}>{selectedChild?.initials ?? "?"}</Text>
          </View>
          <Text style={s.childName} numberOfLines={1}>{selectedChild?.name ?? "—"}</Text>
          <Text style={s.chevron}>⌄</Text>
        </Pressable>
        <NotificationBell userId={parentId} />
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadSessions} tintColor={colors.edGreen} />
        }
        ListHeaderComponent={
          <View style={{ gap: 18, marginBottom: 6 }}>
            {/* Booking card */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Book a Session</Text>

              {/* Session type toggle */}
              <View style={s.segment}>
                {(["TEST", "LEARNING"] as SessionType[]).map((t) => {
                  const active = sessionType === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setSessionType(t)}
                      style={[s.segBtn, active && s.segBtnActive]}
                    >
                      <Text style={[s.segText, active && s.segTextActive]}>
                        {t === "TEST" ? "Test" : "Learning"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <PickerField
                label="Subject"
                value={subject}
                placeholder="Select subject"
                onPress={() => setPickerOpen("subject")}
              />
              <PickerField
                label={sessionType === "LEARNING" ? "Chapter (optional)" : "Chapter"}
                value={topic}
                placeholder="Select chapter"
                disabled={chapters.length === 0}
                onPress={() => setPickerOpen("chapter")}
              />

              <View style={{ gap: 6 }}>
                <Text style={s.fieldLabel}>Date</Text>
                <MonthCalendar value={date} onSelect={setDate} minDate={minDate} />
              </View>

              {bookError ? <Banner tone="error" text={bookError} /> : null}
              {booked ? <Banner tone="success" text="Scheduled! It'll be prepared the night before." /> : null}

              <Pressable
                onPress={handleBook}
                disabled={!canBook}
                style={[s.bookBtn, !canBook && s.bookBtnDisabled]}
              >
                {booking
                  ? <ActivityIndicator size="small" color="#fff" />
                  : (
                    <>
                      <Text style={s.bookText}>Schedule Session</Text>
                      <ArrowRight size={16} color="#fff" />
                    </>
                  )
                }
              </Pressable>
            </View>

            <Text style={s.sectionTitle}>Upcoming Sessions</Text>
          </View>
        }
        renderItem={({ item }) => <SessionCard session={item} />}
        ListEmptyComponent={
          loading ? null : (
            <View style={s.empty}>
              <CalendarClock size={28} color={colors.textFaint} />
              <Text style={s.emptyText}>No sessions scheduled yet.</Text>
            </View>
          )
        }
      />

      <PickerSheet
        visible={pickerOpen === "subject"}
        title="Choose a subject"
        options={subjectOpts.map((s) => s.subject)}
        selected={subject}
        onSelect={setSubject}
        onClose={() => setPickerOpen(null)}
        emptyText="No subjects available"
      />
      <PickerSheet
        visible={pickerOpen === "chapter"}
        title="Choose a chapter"
        options={chapters}
        selected={topic}
        onSelect={setTopic}
        onClose={() => setPickerOpen(null)}
        emptyText="No chapters available"
      />

      <ChildSwitcherSheet
        visible={switcherOpen}
        children={approvedChildren}
        selectedChildId={selectedChildId}
        onClose={() => setSwitcherOpen(false)}
      />
    </Screen>
  );
}

function SessionCard({ session }: { session: ScheduleSessionResponse }) {
  const isFailed = session.preparation_status === "FAILED";
  const isReady  = session.preparation_status === "COMPLETED" && !!session.session_id;
  const status = isFailed
    ? { bg: "#FFF1EC", fg: colors.coral,    label: "Failed",        Icon: AlertTriangle }
    : isReady
    ? { bg: "#E7F8F0", fg: colors.edGreen,  label: "Ready",         Icon: CheckCircle2  }
    : { bg: colors.pageBg, fg: colors.textMuted, label: "Being Prepared", Icon: Clock    };
  const Icon = status.Icon;

  return (
    <View style={s.sessCard}>
      <View style={s.sessTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.sessTitle} numberOfLines={1}>{session.topic || session.subject}</Text>
          <Text style={s.sessMeta}>{session.subject} · {session.session_type}</Text>
        </View>
        <View style={[s.statusChip, { backgroundColor: status.bg }]}>
          <Icon size={11} color={status.fg} />
          <Text style={[s.statusText, { color: status.fg }]}>{status.label}</Text>
        </View>
      </View>
      <Text style={s.sessDate}>
        {new Date(session.scheduled_date).toLocaleDateString(undefined, {
          weekday: "short", month: "short", day: "numeric",
        })}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  switcher: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, paddingRight: 16 },
  childAvatar: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.edGreen + "20",
    alignItems: "center", justifyContent: "center",
  },
  childInitial: { fontFamily: fonts.nunito, fontSize: 14, color: colors.edGreen },
  childName: { fontFamily: fonts.dmBold, fontSize: 16, color: colors.text, flex: 1 },
  chevron: { fontSize: 18, color: colors.textMuted },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  cardTitle: {
    fontFamily: fonts.dmBold, fontSize: 13, color: colors.textMid,
    textTransform: "uppercase", letterSpacing: 1,
  },
  segment: {
    flexDirection: "row", backgroundColor: colors.pageBg,
    borderRadius: 12, padding: 4, gap: 4,
  },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 9 },
  segBtnActive: { backgroundColor: colors.edGreen },
  segText: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.textMid },
  segTextActive: { color: "#fff" },
  fieldLabel: {
    fontFamily: fonts.dmBold, fontSize: 11, letterSpacing: 0.5,
    color: colors.textMuted, textTransform: "uppercase",
  },
  bookBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: colors.edGreen, borderRadius: 16, paddingVertical: 15,
    minHeight: 50,
  },
  bookBtnDisabled: { opacity: 0.5 },
  bookText: { fontFamily: fonts.dmBold, fontSize: 14, color: "#fff" },
  banner: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  bannerText: { fontFamily: fonts.dmMedium, fontSize: 13 },

  sectionTitle: {
    fontFamily: fonts.dmBold, fontSize: 13, color: colors.textMid,
    textTransform: "uppercase", letterSpacing: 1,
  },

  sessCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  sessTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  sessTitle: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  sessMeta: {
    fontFamily: fonts.dm, fontSize: 11, color: colors.textMuted,
    marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5,
  },
  statusChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4,
  },
  statusText: { fontFamily: fonts.dmBold, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  sessDate:   { fontFamily: fonts.dmMedium, fontSize: 12, color: colors.textMid },

  empty: { alignItems: "center", gap: 8, paddingVertical: 40 },
  emptyText: { fontFamily: fonts.dm, fontSize: 13, color: colors.textMuted },
});
