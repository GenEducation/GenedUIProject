import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, SafeAreaView, Dimensions } from "react-native";

const SCREEN_H = Dimensions.get("window").height;
import { colors, fonts } from "../../theme/tokens";

export type EngineType = "p5sketch" | "geogebra" | "desmos" | "show_figure";

interface VisualCardProps {
  engine: EngineType;
  label: string;
  children: React.ReactNode;
}

const ENGINE_META: Record<EngineType, { label: string; color: string; bg: string; dot: string }> = {
  p5sketch:    { label: "Interactive", color: "#4A90D9", bg: "#EFF6FF", dot: "#4A90D9" },
  geogebra:    { label: "Geometry",    color: "#D4820A", bg: "#FFF7ED", dot: "#D4820A" },
  desmos:      { label: "Graph",       color: "#2D6A4F", bg: "#F0FDF4", dot: "#2D6A4F" },
  show_figure: { label: "Textbook",    color: "#7B5EA7", bg: "#F5F3FF", dot: "#7B5EA7" },
};

export function VisualCard({ engine, label, children }: VisualCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const meta = ENGINE_META[engine] ?? ENGINE_META.show_figure;

  const renderHeader = (onClose?: () => void) => (
    <View style={[styles.header, { backgroundColor: meta.bg }]}>
      <View style={styles.headerTitleRow}>
        <View style={[styles.dot, { backgroundColor: meta.dot }]} />
        <Text style={[styles.headerLabel, { color: meta.color }]}>
          {meta.label}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => (onClose ? onClose() : setIsExpanded(true))}
        style={styles.expandButton}
        activeOpacity={0.7}
      >
        <Text style={styles.expandButtonText}>
          {onClose ? "✕" : "⛶"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        {label || "Visual"}
      </Text>
    </View>
  );

  return (
    <View style={styles.card}>
      {renderHeader()}
      <View style={styles.content}>
        {children}
      </View>
      {renderFooter()}

      {/* Fullscreen modal expand */}
      <Modal
        visible={isExpanded}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsExpanded(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIsExpanded(false)} />
          <View style={styles.modalSheet}>
            {renderHeader(() => setIsExpanded(false))}
            <View style={styles.modalContent}>
              {children}
            </View>
            {renderFooter()}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    marginVertical: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerLabel: {
    fontSize: 10,
    fontFamily: fonts.dmBold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  expandButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  expandButtonText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "bold",
  },
  content: {
    width: "100%",
    minHeight: 200,
    maxHeight: 300,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FAFBFF",
  },
  footerText: {
    fontSize: 10,
    fontFamily: fonts.dmBold,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_H * 0.72,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  modalContent: {
    width: "100%",
    height: SCREEN_H * 0.55,
  },
});
