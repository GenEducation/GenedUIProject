/**
 * ParentMomentsManager — wake-up alarms manager nested in the parent Schedule tab.
 * Mobile port of the web ParentMomentsView. Driven by useMomentsStore; manages
 * alarms for the passed `studentId` (the selected child).
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Plus, Pencil, Trash2, Check, X, AlarmClock } from "lucide-react-native";
import { TimeField } from "@/components/TimeField";
import { useMomentsStore } from "@/store/useMomentsStore";
import { colors, fonts, radius } from "@/theme/tokens";
import type { Moment } from "@/types/moments";

const DEFAULT_PURPOSE = "a cheerful good-morning to start the day";

export function ParentMomentsManager({ studentId }: { studentId: string }) {
  const {
    moments, isLoading, isSaving, error,
    loadMoments, createMoment, updateMoment, deleteMoment, clearError,
  } = useMomentsStore();

  // Add-form state
  const [newTime, setNewTime] = useState("07:00");
  const [newPurpose, setNewPurpose] = useState("");

  // Inline-edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editPurpose, setEditPurpose] = useState("");

  useEffect(() => {
    if (studentId) loadMoments(studentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const handleAdd = async () => {
    if (!newTime) return;
    const result = await createMoment({
      user_id: studentId,
      kind: "wakeup",
      purpose: newPurpose.trim() || DEFAULT_PURPOSE,
      scheduled_time: newTime,
    });
    if (result) {
      setNewPurpose("");
      setNewTime("07:00");
    }
  };

  const beginEdit = (m: Moment) => {
    setEditingId(m.id);
    setEditTime(m.scheduled_time);
    setEditPurpose(m.purpose);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateMoment(editingId, {
      scheduled_time: editTime,
      purpose: editPurpose.trim() || DEFAULT_PURPOSE,
    });
    setEditingId(null);
  };

  const confirmDelete = (m: Moment) => {
    Alert.alert(
      "Delete alarm?",
      `Remove the ${m.scheduled_time} IST wake-up?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMoment(m.id) },
      ]
    );
  };

  const wakeup = moments.filter((m) => m.kind === "wakeup");
  const other = moments.filter((m) => m.kind !== "wakeup");

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 16 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={() => loadMoments(studentId)} tintColor={colors.edGreen} />
      }
    >
      {/* Add form */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Add Wake-Up Alarm</Text>
        <TimeField label="Wake-Up Time (IST)" value={newTime} onChange={setNewTime} placeholder="07:00" />
        <View style={{ gap: 6 }}>
          <Text style={s.fieldLabel}>Greeting vibe</Text>
          <TextInput
            value={newPurpose}
            onChangeText={setNewPurpose}
            placeholder={DEFAULT_PURPOSE}
            placeholderTextColor={colors.textMuted}
            style={s.input}
            multiline
          />
        </View>
        <Pressable onPress={handleAdd} disabled={isSaving || !newTime} style={[s.addBtn, (isSaving || !newTime) && s.disabled]}>
          {isSaving ? <ActivityIndicator size="small" color="#fff" /> : (
            <>
              <Plus size={16} color="#fff" />
              <Text style={s.addText}>Add Alarm</Text>
            </>
          )}
        </Pressable>
      </View>

      {error ? (
        <Pressable onPress={clearError} style={[s.banner, { backgroundColor: "#FFF1EC" }]}>
          <Text style={[s.bannerText, { color: colors.coral }]}>{error} (tap to dismiss)</Text>
        </Pressable>
      ) : null}

      {/* Lists */}
      {isLoading && moments.length === 0 ? (
        <View style={s.empty}><ActivityIndicator color={colors.edGreen} /></View>
      ) : moments.length === 0 ? (
        <View style={s.empty}>
          <AlarmClock size={28} color={colors.textFaint} />
          <Text style={s.emptyText}>No wake-up alarms yet.</Text>
        </View>
      ) : (
        [{ label: "Wake-Up", items: wakeup }, { label: "Other", items: other }]
          .filter((g) => g.items.length > 0)
          .map((group) => (
            <View key={group.label} style={{ gap: 10 }}>
              <Text style={s.groupLabel}>{group.label}</Text>
              {group.items.map((m) => {
                const editing = editingId === m.id;
                return (
                  <View key={m.id} style={[s.row, !m.enabled && { opacity: 0.6 }]}>
                    {editing ? (
                      <View style={{ gap: 10 }}>
                        <TimeField label="Time (IST)" value={editTime} onChange={setEditTime} />
                        <View style={{ gap: 6 }}>
                          <Text style={s.fieldLabel}>Greeting vibe</Text>
                          <TextInput
                            value={editPurpose}
                            onChangeText={setEditPurpose}
                            placeholder={DEFAULT_PURPOSE}
                            placeholderTextColor={colors.textMuted}
                            style={s.input}
                            multiline
                          />
                        </View>
                        <View style={s.editActions}>
                          <Pressable onPress={() => setEditingId(null)} style={[s.iconBtn, { borderColor: colors.border }]}>
                            <X size={16} color={colors.textMuted} />
                            <Text style={s.iconBtnText}>Cancel</Text>
                          </Pressable>
                          <Pressable onPress={saveEdit} disabled={isSaving} style={[s.iconBtn, { borderColor: colors.edGreen, backgroundColor: colors.edGreen + "12" }]}>
                            <Check size={16} color={colors.edGreen} />
                            <Text style={[s.iconBtnText, { color: colors.edGreen }]}>Save</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={s.rowTop}>
                          <Text style={s.rowTime}>{m.scheduled_time}<Text style={s.rowIst}> IST</Text></Text>
                          <Switch
                            value={m.enabled}
                            onValueChange={() => updateMoment(m.id, { enabled: !m.enabled })}
                            trackColor={{ true: colors.edGreen, false: colors.border }}
                            thumbColor="#fff"
                          />
                        </View>
                        <Text style={s.rowPurpose} numberOfLines={2}>{m.purpose}</Text>
                        {m.scheduled_date ? (
                          <Text style={s.rowMeta}>Once · {m.scheduled_date}</Text>
                        ) : (
                          <Text style={s.rowMeta}>Repeats daily</Text>
                        )}
                        <View style={s.rowActions}>
                          <Pressable onPress={() => beginEdit(m)} style={[s.iconBtn, { borderColor: colors.border }]}>
                            <Pencil size={14} color={colors.textMid} />
                            <Text style={s.iconBtnText}>Edit</Text>
                          </Pressable>
                          <Pressable onPress={() => confirmDelete(m)} style={[s.iconBtn, { borderColor: colors.coral + "60" }]}>
                            <Trash2 size={14} color={colors.coral} />
                            <Text style={[s.iconBtnText, { color: colors.coral }]}>Delete</Text>
                          </Pressable>
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 14 },
  cardTitle: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.textMid, textTransform: "uppercase", letterSpacing: 1 },
  fieldLabel: { fontFamily: fonts.dmBold, fontSize: 11, letterSpacing: 0.5, color: colors.textMuted, textTransform: "uppercase" },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.card,
    fontFamily: fonts.dmMedium, fontSize: 14, color: colors.text, minHeight: 46,
  },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.edGreen, borderRadius: 16, paddingVertical: 14, minHeight: 48,
  },
  addText: { fontFamily: fonts.dmBold, fontSize: 14, color: "#fff" },
  disabled: { opacity: 0.5 },
  banner: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  bannerText: { fontFamily: fonts.dmMedium, fontSize: 13 },

  groupLabel: { fontFamily: fonts.dmBold, fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.5 },
  row: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowTime: { fontFamily: fonts.nunito, fontSize: 22, color: colors.text },
  rowIst: { fontFamily: fonts.dm, fontSize: 12, color: colors.textMuted },
  rowPurpose: { fontFamily: fonts.dm, fontSize: 13, color: colors.textMid, lineHeight: 19 },
  rowMeta: { fontFamily: fonts.dmMedium, fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  rowActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  editActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  iconBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
  },
  iconBtnText: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.textMid },

  empty: { alignItems: "center", gap: 8, paddingVertical: 40 },
  emptyText: { fontFamily: fonts.dm, fontSize: 13, color: colors.textMuted },
});
