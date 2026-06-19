import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COMPONENT_REGISTRY } from "./registry";
import { COLORS } from "./types";
import { fonts } from "../../../theme/tokens";
import type { ChatElement } from "../../../types/api";

interface InteractiveBlockProps {
  directiveId: string;
  meta?: ChatElement["meta"];
  sessionId?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

function Fallback({ label }: { label?: string }) {
  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackText}>
        🧩 Activity unavailable{label ? ` — ${label}` : ""}
      </Text>
    </View>
  );
}

/**
 * Dispatcher for interactive math blocks. Reads meta.interactive_type, looks up
 * the matching native RN widget in COMPONENT_REGISTRY, and renders a graceful
 * fallback for unknown types — so newer backends never crash an older client.
 *
 * No WebView. No web deployment dependency. All blocks are native React Native.
 */
export function InteractiveBlock({ directiveId, meta, sessionId, disabled, readOnly }: InteractiveBlockProps) {
  if (meta?.is_fallback || meta?.error) {
    return <Fallback label={meta?.label} />;
  }

  const type = meta?.interactive_type;
  const Comp = type ? COMPONENT_REGISTRY[type] : undefined;
  if (!Comp) return <Fallback label={meta?.label || type} />;

  // Read-only when: explicitly asked, loaded from history (meta.read_only), or no directive_id
  const effectiveReadOnly = !!readOnly || !!meta?.read_only || !directiveId;

  return (
    <Comp
      directiveId={directiveId}
      meta={meta}
      sessionId={sessionId}
      disabled={disabled || effectiveReadOnly}
      readOnly={effectiveReadOnly}
    />
  );
}

export default InteractiveBlock;

const styles = StyleSheet.create({
  fallback: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    marginVertical: 8,
  },
  fallbackText: {
    fontSize: 12,
    fontFamily: fonts.dmBold,
    color: "#F57F17",
  },
});
