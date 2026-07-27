/**
 * Scheduler — mobile-first. Book a TEST or LEARNING session (subject + chapter +
 * date) and view upcoming sessions. Ready TEST sessions open the test runner;
 * ready LEARNING sessions open chat.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SectionList,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, CalendarClock, CheckCircle2, Clock, AlertTriangle, ArrowRight } from "lucide-react-native";
import { PickerField, PickerSheet } from "@/components/PickerSheet";
import { TimeField } from "@/components/TimeField";
import { MonthCalendar } from "@/components/MonthCalendar";
import { RescheduleSheet, type RescheduleTarget } from "@/components/RescheduleSheet";
import { useSchedule } from "@/hooks/useSchedule";
import { studentService } from "@/services/studentService";
import { useStudentId } from "@/hooks/useStudentId";
import { colors, fonts } from "@/theme/tokens";
import type { SessionType, ScheduleSessionResponse } from "@/types/schedule";

interface SubjectOpt { subject: string; grade: number; document_titles: string[] }

function pad(n: number) { return n.toString().padStart(2, "0"); }
function toISODate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function nextDays(count: number): Date[] {
  const out: Date[] = [];
  const base = new Date();
  base.setDate(base.getDate() + 1); // tomorrow
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(d);
  }
  return out;
}

export default function Schedule() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const studentId = useStudentId();
  const {
    sessions, loading, booking, bookError, load, book,
    rescheduling, rescheduleError, rescheduleSession,
  } = useSchedule();

  const [subjectOpts, setSubjectOpts] = useState<SubjectOpt[]>([]);
  const [sessionType, setSessionType] = useState<SessionType>("TEST");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState(toISODate(nextDays(1)[0]));
  const [scheduledTime, setScheduledTime] = useState("");
  const [booked, setBooked] = useState(false);
  const [pickerOpen, setPickerOpen] = useState<null | "subject" | "chapter">(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<RescheduleTarget | null>(null);
  const [rescheduled, setRescheduled] = useState(false);

  const minDate = useMemo(() => toISODate(nextDays(1)[0]), []); // tomorrow

  // Load subjects/chapters from available-agents
  useEffect(() => {
    if (!studentId) return;
    studentService.fetchAvailableAgents(studentId).then((res) => {
      const seen = new Set<string>();
      const opts: SubjectOpt[] = [];
      for (const p of res?.partners ?? []) {
        for (const ps of p?.subjects ?? []) {
          const key = ps.subject?.toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          const a = ps.agents?.[0];
          opts.push({ subject: ps.subject, grade: a?.grade ?? 0, document_titles: a?.document_titles ?? [] });
        }
      }
      setSubjectOpts(opts);
      if (opts.length && !subject) setSubject(opts[0].subject);
    }).catch(() => {});
  }, [studentId]);

  const chapters = useMemo(() => subjectOpts.find((s) => s.subject === subject)?.document_titles ?? [], [subjectOpts, subject]);
  useEffect(() => {
    setTopic((prev) => (chapters.includes(prev) ? prev : chapters[0] ?? ""));
  }, [chapters]);

  const canBook = !!subject && !!date && !(sessionType === "TEST" && !topic) && !booking;

  const handleBook = async () => {
    setBooked(false);
    const ok = await book({ session_type: sessionType, subject, topic: topic || undefined, scheduled_date: date, scheduled_time: scheduledTime || undefined });
    if (ok) {
      setBooked(true);
      setTimeout(() => setBooked(false), 4000);
    }
  };

  const startSession = (s: ScheduleSessionResponse) => {
    if (!s.session_id) return;
    if (s.session_type === "TEST") router.push({ pathname: "/test", params: { testId: s.session_id } });
    else router.push({ pathname: "/chat", params: { subject: s.subject, sessionId: s.session_id } });
  };

  const reschedule = (s: ScheduleSessionResponse) => {
    setRescheduleTarget({ id: s.id, sessionType: s.session_type, subject: s.subject, topic: s.topic });
  };

  const confirmReschedule = async (scheduledDate: string, scheduledTime: string) => {
    if (!rescheduleTarget) return;
    const ok = await rescheduleSession(rescheduleTarget.id, {
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime || undefined,
    });
    if (ok) {
      setRescheduleTarget(null);
      setRescheduled(true);
      setTimeout(() => setRescheduled(false), 4000);
    }
  };

  const { upcoming, pastNeedsAttention } = useMemo(() => classifySessions(sessions), [sessions]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <CalendarClock size={18} color={colors.genPurple} />
          <Text style={styles.headerTitle}>Schedule</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <SectionList
        sections={
          upcoming.length === 0 && pastNeedsAttention.length === 0
            ? []
            : [
                { title: "Upcoming Sessions", key: "upcoming", data: upcoming, emptyText: "Nothing coming up — book a session above." },
                { title: "Past & Needs Attention", key: "past", data: pastNeedsAttention, emptyText: "" },
              ].filter((s) => s.data.length > 0 || s.key === "upcoming")
        }
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.genPurple} />}
        ListHeaderComponent={
          <View style={{ gap: 18, marginBottom: 18 }}>
            {rescheduled ? <Banner tone="success" text="Session rescheduled." /> : null}

            {/* Booking card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Book a Session</Text>

              {/* segmented control */}
              <View style={styles.segment}>
                {(["TEST", "LEARNING"] as SessionType[]).map((t) => {
                  const active = sessionType === t;
                  return (
                    <Pressable key={t} onPress={() => setSessionType(t)} style={[styles.segBtn, active && styles.segBtnActive]}>
                      <Text style={[styles.segText, active && styles.segTextActive]}>{t === "TEST" ? "Test" : "Learning"}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <PickerField label="Subject" value={subject} placeholder="Select subject" onPress={() => setPickerOpen("subject")} />
              <PickerField
                label={sessionType === "LEARNING" ? "Chapter (optional)" : "Chapter"}
                value={topic}
                placeholder="Select chapter"
                disabled={chapters.length === 0}
                onPress={() => setPickerOpen("chapter")}
              />

              {/* date calendar */}
              <View style={{ gap: 6 }}>
                <Text style={styles.fieldLabel}>Date</Text>
                <MonthCalendar value={date} onSelect={setDate} minDate={minDate} />
              </View>

              <TimeField label="Start Time (optional, IST)" value={scheduledTime} onChange={setScheduledTime} />

              {bookError ? <Banner tone="error" text={bookError} /> : null}
              {booked ? <Banner tone="success" text="Scheduled! It’ll be prepared the night before." /> : null}

              <Pressable onPress={handleBook} disabled={!canBook} style={[styles.bookBtn, !canBook && styles.bookBtnDisabled]}>
                <Text style={styles.bookText}>{booking ? "Scheduling…" : "Schedule Session"}</Text>
                {!booking ? <ArrowRight size={16} color="#fff" /> : null}
              </Pressable>
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionTitle, section.key === "past" && { marginTop: 18 }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => <SessionCard session={item} onStart={() => startSession(item)} onReschedule={() => reschedule(item)} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 && section.emptyText ? (
            <View style={styles.sectionEmpty}>
              <Text style={styles.emptyText}>{section.emptyText}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? null : upcoming.length === 0 && pastNeedsAttention.length === 0 ? (
            <View style={styles.empty}>
              <CalendarClock size={28} color={colors.textFaint} />
              <Text style={styles.emptyText}>No sessions scheduled yet.</Text>
            </View>
          ) : null
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

      <RescheduleSheet
        target={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={confirmReschedule}
        isSubmitting={rescheduling}
        errorMessage={rescheduleError}
      />
    </View>
  );
}

/**
 * Groups retried prep rows for the same (subject, topic, date, type),
 * keeping the most-ready row, then splits into Upcoming vs Past & Needs
 * Attention. A session is "past" once its date has gone by without
 * finishing prep+being opened.
 */
function classifySessions(sessions: ScheduleSessionResponse[]) {
  const readiness = (s: ScheduleSessionResponse) =>
    s.preparation_status === "COMPLETED" ? 2 : s.preparation_status === "PENDING" ? 1 : 0;

  const byKey = new Map<string, ScheduleSessionResponse>();
  for (const s of sessions) {
    const key = `${s.session_type}|${s.subject}|${s.topic ?? ""}|${s.scheduled_date}`;
    const existing = byKey.get(key);
    if (!existing || readiness(s) > readiness(existing)) byKey.set(key, s);
  }
  const deduped = [...byKey.values()];

  const today = toISODate(new Date());
  const upcoming: ScheduleSessionResponse[] = [];
  const pastNeedsAttention: ScheduleSessionResponse[] = [];

  for (const s of deduped) {
    const isFailed = s.preparation_status === "FAILED";
    const isReady = s.preparation_status === "COMPLETED" && !!s.session_id;
    const isPastDate = s.scheduled_date < today;
    if (isFailed || (isPastDate && !isReady)) pastNeedsAttention.push(s);
    else upcoming.push(s);
  }

  upcoming.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  pastNeedsAttention.sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));

  return { upcoming, pastNeedsAttention };
}

function SessionCard({ session, onStart, onReschedule }: { session: ScheduleSessionResponse; onStart: () => void; onReschedule: () => void }) {
  const isFailed = session.preparation_status === "FAILED";
  const isReady = session.preparation_status === "COMPLETED" && !!session.session_id;
  const isMissed = !isFailed && !isReady && session.scheduled_date < toISODate(new Date());
  const status = isFailed
    ? { bg: "#FFF6E9", fg: colors.sun, label: "Couldn't set up", Icon: AlertTriangle }
    : isMissed
    ? { bg: colors.pageBg, fg: colors.textMuted, label: "Missed", Icon: Clock }
    : isReady
    ? { bg: "#E7F8F0", fg: colors.growth, label: "Ready", Icon: CheckCircle2 }
    : { bg: colors.pageBg, fg: colors.textMuted, label: "Being Prepared", Icon: Clock };
  const Icon = status.Icon;
  const needsReschedule = isFailed || isMissed;

  return (
    <View style={styles.sessCard}>
      <View style={styles.sessTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.sessTitle} numberOfLines={1}>{session.topic || session.subject}</Text>
          <Text style={styles.sessMeta}>{session.subject} · {session.session_type}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
          <Icon size={11} color={status.fg} />
          <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
        </View>
      </View>
      <View style={styles.sessBottom}>
        <Text style={styles.sessDate}>
          {new Date(session.scheduled_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          {session.scheduled_time ? ` · ${session.scheduled_time} IST` : ""}
        </Text>
        {needsReschedule ? (
          <Pressable onPress={onReschedule} style={styles.ghostBtn}><Text style={styles.ghostText}>Reschedule</Text></Pressable>
        ) : (
          <Pressable onPress={onStart} disabled={!isReady} style={[styles.startBtn, !isReady && styles.startBtnDisabled]}>
            <Text style={styles.startText}>{session.session_type === "TEST" ? "Start Test" : "Open Session"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Banner({ tone, text }: { tone: "error" | "success"; text: string }) {
  const ok = tone === "success";
  return (
    <View style={[styles.banner, { backgroundColor: ok ? "#E7F8F0" : "#FFF1EC" }]}>
      <Text style={[styles.bannerText, { color: ok ? colors.edGreen : colors.coral }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.pageBg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.pageBg, alignItems: "center", justifyContent: "center" },
  headerTitleWrap: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  headerTitle: { fontFamily: fonts.dmBold, fontSize: 16, color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 14 },
  cardTitle: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.textMid, textTransform: "uppercase", letterSpacing: 1 },
  segment: { flexDirection: "row", backgroundColor: colors.pageBg, borderRadius: 12, padding: 4, gap: 4 },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 9, borderWidth: 1.5, borderColor: "transparent" },
  segBtnActive: { backgroundColor: colors.card, borderColor: colors.text },
  segText: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.textMid },
  segTextActive: { color: colors.text },
  fieldLabel: { fontFamily: fonts.dmBold, fontSize: 11, letterSpacing: 0.5, color: colors.textMuted, textTransform: "uppercase" },
  dateChip: { width: 60, alignItems: "center", paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, gap: 1 },
  dateChipActive: { borderColor: colors.genPurple, backgroundColor: colors.genPurple + "12" },
  dateDow: { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.textMuted },
  dateNum: { fontFamily: fonts.dmBold, fontSize: 18, color: colors.text },
  dateMon: { fontFamily: fonts.dm, fontSize: 10, color: colors.textMuted },
  dateTextActive: { color: colors.genPurple },
  bookBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15 },
  bookBtnDisabled: { opacity: 0.5 },
  bookText: { fontFamily: fonts.dmBold, fontSize: 14, color: "#fff" },
  banner: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  bannerText: { fontFamily: fonts.dmMedium, fontSize: 13 },
  sectionTitle: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.textMid, textTransform: "uppercase", letterSpacing: 1 },
  sessCard: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 },
  sessTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  sessTitle: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  sessMeta: { fontFamily: fonts.dm, fontSize: 11, color: colors.textMuted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontFamily: fonts.dmBold, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  sessBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sessDate: { fontFamily: fonts.dmMedium, fontSize: 12, color: colors.textMid },
  startBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  startBtnDisabled: { opacity: 0.35 },
  startText: { fontFamily: fonts.dmBold, fontSize: 12, color: "#fff" },
  ghostBtn: { backgroundColor: colors.pageBg, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  ghostText: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.text },
  empty: { alignItems: "center", gap: 8, paddingVertical: 40 },
  emptyText: { fontFamily: fonts.dm, fontSize: 13, color: colors.textMuted },
  sectionEmpty: { paddingVertical: 16 },
});
