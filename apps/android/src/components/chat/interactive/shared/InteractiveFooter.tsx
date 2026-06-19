import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Check, RefreshCw } from "lucide-react-native";
import { COLORS } from "../types";
import { fonts } from "../../../../theme/tokens";

interface FooterProps {
  submitted: boolean;
  canSubmit: boolean;
  submitting?: boolean;
  onSubmit: () => void;
  isCorrect?: boolean;
  allowRetry?: boolean;
  attempts?: number;
  onRetry?: () => void;
  submitLabel?: string;
  submitError?: boolean;
  onDismissError?: () => void;
  readOnly?: boolean;
}

export function InteractiveFooter({
  submitted, canSubmit, submitting, onSubmit,
  isCorrect, allowRetry, attempts, onRetry,
  submitLabel, submitError, onDismissError, readOnly,
}: FooterProps) {
  if (readOnly) {
    return submitted ? <ResultBanner isCorrect={isCorrect} allowRetry={false} attempts={attempts} /> : null;
  }
  if (submitted) {
    return <ResultBanner isCorrect={isCorrect} allowRetry={allowRetry} attempts={attempts} onRetry={onRetry} />;
  }
  return (
    <View>
      <TouchableOpacity
        style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitDisabled]}
        onPress={onSubmit}
        disabled={!canSubmit || submitting}
        activeOpacity={0.75}
      >
        {submitting
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={styles.submitText}>{submitLabel || "Check"}</Text>
        }
      </TouchableOpacity>
      {submitError && (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>Couldn't check — try again.</Text>
          {onDismissError && (
            <TouchableOpacity onPress={onDismissError} style={styles.retryBtn}>
              <RefreshCw size={11} color={COLORS.brand} />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function ResultBanner({ isCorrect, allowRetry, attempts, onRetry }: {
  isCorrect?: boolean; allowRetry?: boolean; attempts?: number; onRetry?: () => void;
}) {
  const canRetry = allowRetry && !isCorrect && (attempts ?? 0) < 3;
  return (
    <View style={styles.resultRow}>
      {isCorrect ? (
        <View style={styles.correctRow}>
          <Check size={14} color={COLORS.success} strokeWidth={3} />
          <Text style={[styles.resultText, { color: COLORS.success }]}>Brilliant! That's correct.</Text>
        </View>
      ) : (
        <Text style={[styles.resultText, { color: COLORS.danger }]}>Not quite — give it another look!</Text>
      )}
      {canRetry && onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
          <RefreshCw size={11} color={COLORS.muted} />
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  submitBtn: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: COLORS.brand,
    alignSelf: "flex-start",
    minWidth: 90,
    alignItems: "center",
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { fontSize: 14, fontFamily: fonts.dmBold, color: "#fff" },
  resultRow: { marginTop: 12, gap: 6 },
  correctRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  resultText: { fontSize: 13, fontFamily: fonts.dmBold },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  retryText: { fontSize: 12, fontFamily: fonts.dmBold, color: COLORS.muted },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" },
  errorText: { fontSize: 13, fontFamily: fonts.dmBold, color: COLORS.danger },
});
