/**
 * MatchTheFollowing — mobile tap-to-pair (no drag lib).
 *
 * Flow: tap a right-hand option chip to "pick" it, then tap a left row to place
 * it. Tap a filled left row to clear. Selections are encoded as "1→A, 2→C".
 * Right options are labelled A, B, C… with a deterministic order per question.
 */
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, fonts } from "../../theme/tokens";
import type { Question } from "../../types/test";
import { encodeMatch } from "./answerUtils";

interface Props {
  question: Question;
  value?: string;
  onChange: (v: string) => void;
}

function decode(value?: string): Record<number, string> {
  if (!value) return {};
  const out: Record<number, string> = {};
  for (const part of value.split(",")) {
    const [id, label] = part.split("→").map((s) => s.trim());
    if (id && label) out[Number(id)] = label;
  }
  return out;
}

/** Deterministic order from question_id so the right column doesn't reshuffle. */
function seededOrder<T>(items: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return items
    .map((v, i) => ({ v, k: (h ^ ((i + 1) * 2654435761)) >>> 0 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.v);
}

export function MatchTheFollowing({ question, value, onChange }: Props) {
  const pairs = question.match_pairs ?? [];
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const selections = decode(value);

  const { left, right } = useMemo(() => {
    const left = pairs.map((p, i) => ({ id: i + 1, text: p.left }));
    const rights = seededOrder(pairs.map((p) => p.right), question.question_id);
    const right = rights.map((text, i) => ({ label: String.fromCharCode(65 + i), text }));
    return { left, right };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.question_id]);

  const labelText = (label: string) => right.find((r) => r.label === label)?.text ?? label;
  const usedLabels = new Set(Object.values(selections));

  const placeOnLeft = (leftId: number) => {
    const next = { ...selections };
    if (activeLabel) {
      // remove that label from any other left, then assign
      for (const k of Object.keys(next)) if (next[Number(k)] === activeLabel) delete next[Number(k)];
      next[leftId] = activeLabel;
      setActiveLabel(null);
    } else if (next[leftId]) {
      delete next[leftId]; // tap a filled slot to clear
    }
    onChange(encodeMatch(next));
  };

  if (pairs.length === 0) return null;

  return (
    <View style={{ gap: 14 }}>
      <Text style={styles.prompt}>{question.prompt}</Text>

      <View style={{ gap: 8 }}>
        {left.map((l) => {
          const placed = selections[l.id];
          return (
            <Pressable key={l.id} onPress={() => placeOnLeft(l.id)} style={styles.row}>
              <View style={styles.idChip}>
                <Text style={styles.idText}>{l.id}</Text>
              </View>
              <Text style={styles.leftText}>{l.text}</Text>
              <Text style={styles.arrow}>→</Text>
              <View style={[styles.slot, placed ? styles.slotFilled : (activeLabel ? styles.slotActive : null)]}>
                <Text style={[styles.slotText, placed ? styles.slotTextFilled : null]} numberOfLines={1}>
                  {placed ? `${placed}. ${labelText(placed)}` : "Tap to place"}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.hint}>Pick an option, then tap a row</Text>
      <View style={styles.chipWrap}>
        {right.map((r) => {
          const used = usedLabels.has(r.label);
          const active = activeLabel === r.label;
          return (
            <Pressable
              key={r.label}
              onPress={() => setActiveLabel(active ? null : r.label)}
              style={[styles.chip, used && styles.chipUsed, active && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{r.label}.</Text>
              <Text style={[styles.chipText, active && styles.chipLabelActive, used && styles.chipTextUsed]}>{r.text}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: { fontFamily: fonts.dmMedium, fontSize: 15, lineHeight: 22, color: colors.text },
  hint: { fontFamily: fonts.dmBold, fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  idChip: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.genPurple + "12", alignItems: "center", justifyContent: "center" },
  idText: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.genPurple },
  leftText: { flex: 1, fontFamily: fonts.dmMedium, fontSize: 13, color: colors.text },
  arrow: { color: colors.textFaint, fontFamily: fonts.dmBold },
  slot: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.pageBg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  slotActive: { borderColor: colors.genPurple, backgroundColor: colors.genPurple + "0E" },
  slotFilled: { borderStyle: "solid", borderColor: colors.growth, backgroundColor: colors.growth + "12" },
  slotText: { fontFamily: fonts.dmMedium, fontSize: 12, color: colors.textMuted },
  slotTextFilled: { color: colors.edGreen, fontFamily: fonts.dmBold },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.card,
  },
  chipUsed: { opacity: 0.4 },
  chipActive: { borderColor: colors.genPurple, backgroundColor: colors.genPurple + "12" },
  chipLabel: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.textMuted },
  chipText: { fontFamily: fonts.dmMedium, fontSize: 13, color: colors.text },
  chipLabelActive: { color: colors.genPurple },
  chipTextUsed: { textDecorationLine: "line-through" },
});
