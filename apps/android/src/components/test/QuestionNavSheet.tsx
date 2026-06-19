/**
 * QuestionNavSheet — bottom-sheet grid of question numbers (answered/active
 * state) for jumping between questions. Replaces the web's desktop sidebar.
 */
import React from "react";
import { View, Text, Pressable, Modal, StyleSheet, Dimensions } from "react-native";
import { colors, fonts } from "../../theme/tokens";
import type { GroupedSection } from "../../types/test";

const SCREEN_H = Dimensions.get("window").height;

interface Props {
  visible: boolean;
  sections: GroupedSection[];
  answers: Record<string, string>;
  onJump: (sectionIdx: number, questionId: string) => void;
  onClose: () => void;
}

export function QuestionNavSheet({ visible, sections, answers, onJump, onClose }: Props) {
  let counter = 0;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Questions</Text>
          <View style={{ gap: 16 }}>
            {sections.map((sec, sIdx) => (
              <View key={sec.label} style={{ gap: 8 }}>
                <Text style={styles.secLabel}>SECTION {sec.label}</Text>
                <View style={styles.grid}>
                  {sec.questions.map((q) => {
                    counter += 1;
                    const num = counter;
                    const done = !!answers[q.question_id];
                    return (
                      <Pressable
                        key={q.question_id}
                        onPress={() => onJump(sIdx, q.question_id)}
                        style={[styles.cell, done && styles.cellDone]}
                      >
                        <Text style={[styles.cellText, done && styles.cellTextDone]}>{num}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, maxHeight: SCREEN_H * 0.7 },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 16 },
  title: { fontFamily: fonts.dmBold, fontSize: 16, color: colors.text, marginBottom: 14 },
  secLabel: { fontFamily: fonts.dmBold, fontSize: 11, letterSpacing: 1, color: colors.textMuted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cell: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  cellDone: { borderColor: colors.genPurple, backgroundColor: colors.genPurple + "12" },
  cellText: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.textMid },
  cellTextDone: { color: colors.genPurple },
});
