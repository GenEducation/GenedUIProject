import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

const NETS: Record<string, string> = {
  cube_cross: "M 40 0 h 40 v 40 h -40 Z M 0 40 h 40 v 40 h -40 Z M 40 40 h 40 v 40 h -40 Z M 80 40 h 40 v 40 h -40 Z M 120 40 h 40 v 40 h -40 Z M 40 80 h 40 v 40 h -40 Z",
};

export default function NetFolding({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const netKey: string = render.net ?? "cube_cross";
  const options: Array<{ id: string; label: string }> = render.options ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "net_folding", sessionId);

  const netPath = NETS[netKey] ?? NETS.cube_cross;

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.center}>
        <Svg width={180} height={130} viewBox="0 0 180 130">
          <Path d={netPath} fill={COLORS.brandSoft} stroke={COLORS.brand} strokeWidth={1.5} />
        </Svg>
      </View>
      <View style={styles.optionRow}>
        {options.map((o) => (
          <TouchableOpacity
            key={o.id}
            style={[styles.optBtn, selectedId === o.id && styles.optBtnActive]}
            onPress={() => !submitted && !readOnly && setSelectedId(o.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.optText, selectedId === o.id && styles.optTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <InteractiveFooter
        submitted={submitted} canSubmit={!!selectedId} submitting={submitting}
        onSubmit={() => submit({ pairs: [[netKey, selectedId]] })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", marginBottom: 12 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optBtn: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12,
    backgroundColor: "#F1EFFA", borderWidth: 1.5, borderColor: "#DDD6FE",
  },
  optBtnActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  optText: { fontSize: 13, fontFamily: fonts.dmBold, color: COLORS.brand },
  optTextActive: { color: "#fff" },
});
