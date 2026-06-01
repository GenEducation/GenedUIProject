import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Screen — safe-area aware page wrapper.
 * Pads the top for the status bar / notch; bottom padding is handled by
 * the tab bar or per-screen scroll insets.
 */
export function Screen({
  children,
  background,
  style,
}: {
  children: React.ReactNode;
  background: string;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: background, paddingTop: insets.top }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
