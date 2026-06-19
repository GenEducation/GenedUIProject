import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { InteractiveShell } from "../shared/InteractiveShell";
import { InteractiveFooter } from "../shared/InteractiveFooter";
import { useInteractiveAnswer } from "../shared/useInteractiveAnswer";
import { COLORS, type InteractiveProps } from "../types";
import { fonts } from "../../../../theme/tokens";

const CURRENCY_SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

export default function MoneyCounter({ directiveId, meta, sessionId, readOnly }: InteractiveProps) {
  const render = meta?.render || {};
  const currency: string = render.currency ?? "INR";
  const denominations: number[] = render.denominations ?? [1, 2, 5, 10, 20, 50, 100];
  const symbol = render.currency_symbol ?? CURRENCY_SYMBOLS[currency] ?? "₹";

  const [coins, setCoins] = useState<number[]>([]);
  const { submitted, isCorrect, attempts, submitting, submit, retry, submitError, dismissError } =
    useInteractiveAnswer(directiveId, "money_counter", sessionId);

  const add = (d: number) => {
    if (submitted || readOnly) return;
    setCoins((prev) => [...prev, d]);
  };
  const clear = () => { if (!submitted && !readOnly) setCoins([]); };
  const total = coins.reduce((s, c) => s + c, 0);

  return (
    <InteractiveShell label={meta?.label} prompt={meta?.question}>
      <View style={styles.denomRow}>
        {denominations.map((d) => (
          <TouchableOpacity key={d} style={styles.denomBtn} onPress={() => add(d)} activeOpacity={0.7}>
            <Text style={styles.denomText}>{symbol}{d}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.clearBtn} onPress={clear} activeOpacity={0.7}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.coinsArea}>
        {coins.map((c, i) => (
          <View key={i} style={[styles.chip, c >= 100 && styles.chipNote]}>
            <Text style={styles.chipText}>{symbol}{c}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.total}>Total: {symbol}{total}</Text>
      <InteractiveFooter
        submitted={submitted} canSubmit={coins.length > 0} submitting={submitting}
        onSubmit={() => submit({ amount: total, coins })}
        isCorrect={isCorrect} allowRetry attempts={attempts} onRetry={retry}
        submitError={submitError} onDismissError={dismissError} readOnly={readOnly}
      />
    </InteractiveShell>
  );
}

const styles = StyleSheet.create({
  denomRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  denomBtn: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20,
    backgroundColor: COLORS.brandSoft, borderWidth: 1.5, borderColor: COLORS.brand,
  },
  denomText: { fontSize: 12, fontFamily: fonts.dmBold, color: COLORS.brand },
  clearBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "#FEF2F2", borderWidth: 1.5, borderColor: "#FCA5A5" },
  clearText: { fontSize: 12, fontFamily: fonts.dmBold, color: COLORS.danger },
  coinsArea: { flexDirection: "row", flexWrap: "wrap", gap: 6, minHeight: 36, marginBottom: 8 },
  chip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, backgroundColor: "#EDE9FE", borderWidth: 1, borderColor: COLORS.brand },
  chipNote: { borderRadius: 8 },
  chipText: { fontSize: 11, fontFamily: fonts.dmBold, color: COLORS.brand },
  total: { fontSize: 14, fontFamily: fonts.dmBold, color: COLORS.brand },
});
