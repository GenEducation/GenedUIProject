/**
 * Teacher portal — School Lab Mode period scheduler. Lists periods scheduled
 * for a date and lets the teacher schedule a new one against a lab, using the
 * roster-backed teaching catalog for class/subject/chapter dropdowns.
 * Mirrors the web app's src/features/lab/components/SlotScheduler.tsx.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Plus, Clock, Ban, PlayCircle } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { PickerField, PickerSheet } from "@/components/PickerSheet";
import { TimeField } from "@/components/TimeField";
import { MonthCalendar } from "@/components/MonthCalendar";
import { labStore, useLabStore } from "@/store/useLabStore";
import { useTeacherId } from "@/hooks/useTeacherId";
import { useTeacherPartnerId } from "@/hooks/useTeacherPartnerId";
import { colors, fonts, radius } from "@/theme/tokens";
import { OBJECTIVE_MODES, type ObjectiveMode, type SlotResponse } from "@/types/lab";

function pad(n: number) { return n.toString().padStart(2, "0"); }
function toISODate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  SCHEDULED: { bg: colors.border, text: colors.textMid },
  ACTIVE: { bg: colors.edGreen + "18", text: colors.edGreen },
  COMPLETED: { bg: colors.border, text: colors.text },
  CANCELLED: { bg: colors.coral + "18", text: colors.coral },
};

export default function TeacherLabScheduleScreen() {
  const router = useRouter();
  const teacherId = useTeacherId();
  const partnerId = useTeacherPartnerId();
  const { labs, slots, isLoadingSlots } = useLabStore();
  const [onDate, setOnDate] = useState(toISODate(new Date()));
  const [createOpen, setCreateOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);

  useEffect(() => {
    if (partnerId) {
      labStore.fetchLabs(partnerId);
      labStore.fetchCatalog(partnerId);
    }
  }, [partnerId]);

  useEffect(() => {
    labStore.fetchSlots({ onDate });
  }, [onDate]);

  const sortedSlots = useMemo(
    () => [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [slots]
  );

  const handleCancel = (slot: SlotResponse) => {
    Alert.alert("Cancel Period", "Cancel this scheduled period?", [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel period",
        style: "destructive",
        onPress: async () => {
          try {
            await labStore.cancelSlot(slot.id);
          } catch {
            Alert.alert("Error", "Failed to cancel period. Please try again.");
          }
        },
      },
    ]);
  };

  const openSlot = (slot: SlotResponse) => {
    router.push({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pathname: "/teacher-lab-run" as any,
      params: { slotId: slot.id },
    });
  };

  return (
    <Screen background={colors.pageBg}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>School Lab Mode</Text>
          <Text style={styles.title}>Today&apos;s Periods</Text>
        </View>
        <Pressable style={styles.dateBtn} onPress={() => setDateSheetOpen(true)}>
          <Text style={styles.dateBtnText}>{onDate}</Text>
        </Pressable>
      </View>

      {labs.length === 0 ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            No labs available yet. Ask your partner admin to set up a lab before scheduling.
          </Text>
        </View>
      ) : null}

      {isLoadingSlots && slots.length === 0 ? (
        <LoadingState message="Loading periods…" />
      ) : (
        <FlatList
          data={sortedSlots}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const modeLabel = OBJECTIVE_MODES.find((m) => m.value === item.objective_mode)?.label ?? item.objective_mode;
            const statusStyle = STATUS_COLORS[item.status] ?? STATUS_COLORS.SCHEDULED;
            return (
              <View style={styles.slotCard}>
                <View style={styles.slotIconWrap}>
                  <Clock size={18} color={colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.slotTitle}>Grade {item.grade}{item.section} · {item.subject}</Text>
                  <Text style={styles.slotMeta}>
                    {item.start_time.slice(11, 16)}–{item.end_time.slice(11, 16)} · {modeLabel}
                    {item.chapter ? ` · ${item.chapter}` : ""}
                  </Text>
                </View>
                <View style={styles.slotActions}>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
                  </View>
                  {item.status === "SCHEDULED" ? (
                    <Pressable style={styles.cancelBtn} onPress={() => handleCancel(item)}>
                      <Ban size={12} color={colors.coral} />
                    </Pressable>
                  ) : null}
                  {item.status === "SCHEDULED" || item.status === "ACTIVE" || item.status === "COMPLETED" ? (
                    <Pressable style={styles.runBtn} onPress={() => openSlot(item)}>
                      <PlayCircle size={12} color="#fff" />
                      <Text style={styles.runBtnText}>{item.status === "COMPLETED" ? "Report" : "Run"}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState icon="🗓️" title="No periods scheduled" message="Nothing is on the timetable for this date yet." />
          }
        />
      )}

      <Pressable
        style={[styles.fab, labs.length === 0 && styles.fabDisabled]}
        onPress={() => labs.length > 0 && setCreateOpen(true)}
        disabled={labs.length === 0}
      >
        <Plus size={22} color="#fff" />
      </Pressable>

      <CreateSlotSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        teacherId={teacherId}
        defaultDate={onDate}
        onCreated={() => labStore.fetchSlots({ onDate })}
      />

      <Modal visible={dateSheetOpen} transparent animationType="slide" onRequestClose={() => setDateSheetOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setDateSheetOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Select Date</Text>
          <MonthCalendar
            value={onDate}
            onSelect={(iso) => { setOnDate(iso); setDateSheetOpen(false); }}
            minDate="2020-01-01"
          />
        </View>
      </Modal>
    </Screen>
  );
}

function CreateSlotSheet({
  visible,
  onClose,
  teacherId,
  defaultDate,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  teacherId: string;
  defaultDate: string;
  onCreated: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { labs, catalog } = useLabStore();

  const [labId, setLabId] = useState(labs[0]?.id ?? "");
  const [classKey, setClassKey] = useState("");
  const [subject, setSubject] = useState("");
  const [objectiveMode, setObjectiveMode] = useState<ObjectiveMode>("CHAPTER_PRACTICE");
  const [chapter, setChapter] = useState("");
  const [skillFocus, setSkillFocus] = useState("");
  const [scheduledDate, setScheduledDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:40");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [labPickerOpen, setLabPickerOpen] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false);
  const [modePickerOpen, setModePickerOpen] = useState(false);

  const [gradeStr, section] = classKey ? classKey.split("|") : ["", ""];
  const grade = gradeStr ? Number(gradeStr) : 0;

  const classOptions = useMemo(
    () => (catalog?.classes ?? []).map((c) => `${c.grade}|${c.section}`),
    [catalog]
  );
  const gradeSubjects = useMemo(
    () => [...new Set((catalog?.chapters ?? []).filter((c) => c.grade === grade).map((c) => c.subject))].sort(),
    [catalog, grade]
  );
  const subjectChapters = useMemo(
    () =>
      (catalog?.chapters ?? [])
        .filter((c) => c.grade === grade && c.subject === subject)
        .map((c) => c.document_title),
    [catalog, grade, subject]
  );
  const isGapRecovery = objectiveMode === "GAP_RECOVERY";

  useEffect(() => {
    if (!labId && labs[0]) setLabId(labs[0].id);
  }, [labs, labId]);

  useEffect(() => {
    if (visible) setScheduledDate(defaultDate);
  }, [defaultDate, visible]);

  useEffect(() => {
    if (subject && !gradeSubjects.includes(subject)) {
      setSubject("");
      setChapter("");
    }
  }, [gradeSubjects, subject]);

  useEffect(() => {
    if (chapter && !subjectChapters.includes(chapter)) setChapter("");
  }, [subjectChapters, chapter]);

  const reset = () => {
    setClassKey("");
    setSubject("");
    setObjectiveMode("CHAPTER_PRACTICE");
    setChapter("");
    setSkillFocus("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const canSubmit = !!labId && !!classKey && !!subject.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const chapterValue = chapter.trim();
    if (isGapRecovery && (!chapterValue || !skillFocus.trim())) {
      setError("Gap Recovery needs a chapter and what you taught (skill focus).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await labStore.createSlot({
        lab_id: labId,
        teacher_id: teacherId,
        grade,
        section: section.trim(),
        subject: subject.trim(),
        objective_mode: objectiveMode,
        chapter: chapterValue || undefined,
        document_title: chapterValue || undefined,
        skill_focus: skillFocus.trim() || undefined,
        scheduled_date: scheduledDate,
        start_time: `${scheduledDate}T${startTime}:00+05:30`,
        end_time: `${scheduledDate}T${endTime}:00+05:30`,
      });
      onCreated();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to schedule period.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>Schedule Period</Text>

        <ScrollView contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          <PickerField
            label="Lab"
            value={labs.find((l) => l.id === labId)?.name ?? ""}
            placeholder="Select lab…"
            onPress={() => setLabPickerOpen(true)}
          />
          <PickerField
            label="Class"
            value={classKey ? `Grade ${gradeStr}${section}` : ""}
            placeholder="Select class…"
            onPress={() => setClassPickerOpen(true)}
          />
          <PickerField
            label="Subject"
            value={subject}
            placeholder={grade ? "Select subject…" : "Pick a class first"}
            disabled={!grade}
            onPress={() => setSubjectPickerOpen(true)}
          />
          <PickerField
            label="Objective"
            value={OBJECTIVE_MODES.find((m) => m.value === objectiveMode)?.label ?? ""}
            onPress={() => setModePickerOpen(true)}
          />
          <PickerField
            label={isGapRecovery ? "Chapter (required)" : "Chapter (optional)"}
            value={chapter}
            placeholder={subject ? "Select chapter…" : "Pick a subject first"}
            disabled={!subject}
            onPress={() => setChapterPickerOpen(true)}
          />

          {isGapRecovery ? (
            <View style={{ gap: 6 }}>
              <Text style={styles.fieldLabel}>What did you teach? (skill focus)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Fractions — equivalent fractions"
                placeholderTextColor={colors.textMuted}
                value={skillFocus}
                onChangeText={setSkillFocus}
              />
            </View>
          ) : null}

          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>Date</Text>
            <MonthCalendar value={scheduledDate} onSelect={setScheduledDate} />
          </View>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <TimeField label="Start Time" value={startTime} onChange={(v) => setStartTime(v || startTime)} />
            </View>
            <View style={{ flex: 1 }}>
              <TimeField label="End Time" value={endTime} onChange={(v) => setEndTime(v || endTime)} />
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Schedule Period</Text>}
          </Pressable>
        </ScrollView>
      </View>

      <PickerSheet
        visible={labPickerOpen}
        title="Select Lab"
        options={labs.map((l) => l.name)}
        selected={labs.find((l) => l.id === labId)?.name}
        onSelect={(name) => setLabId(labs.find((l) => l.name === name)?.id ?? "")}
        onClose={() => setLabPickerOpen(false)}
      />
      <PickerSheet
        visible={classPickerOpen}
        title="Select Class"
        options={classOptions.map((c) => { const [g, s] = c.split("|"); return `Grade ${g}${s}`; })}
        selected={classKey ? `Grade ${gradeStr}${section}` : ""}
        onSelect={(val) => {
          const idx = classOptions.findIndex((c) => { const [g, s] = c.split("|"); return `Grade ${g}${s}` === val; });
          if (idx >= 0) setClassKey(classOptions[idx]);
        }}
        onClose={() => setClassPickerOpen(false)}
        emptyText="No classes with an imported roster yet."
      />
      <PickerSheet
        visible={subjectPickerOpen}
        title="Select Subject"
        options={gradeSubjects}
        selected={subject}
        onSelect={setSubject}
        onClose={() => setSubjectPickerOpen(false)}
      />
      <PickerSheet
        visible={chapterPickerOpen}
        title="Select Chapter"
        options={subjectChapters}
        selected={chapter}
        onSelect={setChapter}
        onClose={() => setChapterPickerOpen(false)}
      />
      <PickerSheet
        visible={modePickerOpen}
        title="Select Objective"
        options={OBJECTIVE_MODES.map((m) => m.label)}
        selected={OBJECTIVE_MODES.find((m) => m.value === objectiveMode)?.label}
        onSelect={(label) => {
          const found = OBJECTIVE_MODES.find((m) => m.label === label);
          if (found) setObjectiveMode(found.value);
        }}
        onClose={() => setModePickerOpen(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 10 },
  backBtn: { padding: 4 },
  eyebrow: { fontFamily: fonts.dmBold, fontSize: 11, color: colors.emerald, textTransform: "uppercase", letterSpacing: 1.5 },
  title: { fontFamily: fonts.nunito, fontSize: 20, color: colors.text, marginTop: 2 },
  dateBtn: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.card,
  },
  dateBtnText: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.text },

  warningBanner: {
    marginHorizontal: 20, marginBottom: 12, padding: 12,
    backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: radius.sm,
  },
  warningText: { fontFamily: fonts.dmMedium, fontSize: 12, color: "#92400E", lineHeight: 17 },

  list: { paddingHorizontal: 20, paddingBottom: 100, gap: 10 },
  slotCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, backgroundColor: "#fff",
  },
  slotIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.pageBg,
    alignItems: "center", justifyContent: "center",
  },
  slotTitle: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.text },
  slotMeta: { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.textMuted, marginTop: 3 },
  slotActions: { alignItems: "flex-end", gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontFamily: fonts.dmBold, fontSize: 9, letterSpacing: 0.5 },
  cancelBtn: { padding: 4 },
  runBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.emerald, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
  },
  runBtnText: { fontFamily: fonts.dmBold, fontSize: 10, color: "#fff" },

  fab: {
    position: "absolute", right: 20, bottom: 24,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.emerald, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  fabDisabled: { opacity: 0.4 },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#00000055" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "88%",
    backgroundColor: "#fff", borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 12 },
  sheetTitle: { fontFamily: fonts.nunito, fontSize: 18, color: colors.text, marginBottom: 16 },
  fieldLabel: { fontFamily: fonts.dmBold, fontSize: 11, letterSpacing: 0.5, color: colors.textMuted, textTransform: "uppercase" },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: fonts.dmMedium, fontSize: 14, color: colors.text, backgroundColor: colors.pageBg,
  },
  row2: { flexDirection: "row", gap: 12 },
  errorText: { fontFamily: fonts.dmMedium, fontSize: 13, color: colors.coral, textAlign: "center" },
  submitBtn: { backgroundColor: colors.emerald, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { fontFamily: fonts.dmBold, fontSize: 15, color: "#fff" },
});
