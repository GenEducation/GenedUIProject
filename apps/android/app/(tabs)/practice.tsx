import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Screen } from "@/components/Screen";
import { colors, fonts } from "@/theme/tokens";

/**
 * Practice tab — placeholder.
 * The web equivalent is AssessmentsPage (/student/assessments). Wire it up in a
 * follow-up once the assessments API is connected on mobile.
 */
export default function Practice() {
  return (
    <Screen background={colors.pageBg}>
      <View style={styles.center}>
        <Text style={{ fontSize: 40 }}>🎯</Text>
        <Text style={styles.title}>Practice</Text>
        <Text style={styles.sub}>Quizzes and assessments will appear here.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  title: { fontFamily: fonts.nunito, fontSize: 22, color: colors.text, marginTop: 8 },
  sub: { fontFamily: fonts.dm, fontSize: 13, color: colors.textMuted, textAlign: "center" },
});
