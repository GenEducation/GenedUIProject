/**
 * TimeField — dependency-free 24-hour "HH:MM" time picker with swipeable wheels.
 *
 * Opens a bottom sheet with two clock-style scrolling columns (Hours 00–23,
 * Minutes 00–59), centred selection with faded neighbours. The wheel value is the
 * stored value — the backend wants zero-padded 24-hour "HH:MM" IST
 * (^([01]\d|2[0-3]):[0-5]\d$) — so there is no conversion. Pass value="" for unset.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { Clock, X } from "lucide-react-native";
import { colors, fonts } from "../theme/tokens";

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

const ITEM_HEIGHT = 44;
const VISIBLE = 5; // odd → one centred row + two faded above/below
const PAD = ITEM_HEIGHT * ((VISIBLE - 1) / 2);
const VIEWPORT = ITEM_HEIGHT * VISIBLE;
// Repeat the items so the wheel can scroll endlessly in both directions; after
// each settle we recenter to the middle copy, giving an infinite/cyclic feel.
const REPEAT = 11;

const DEFAULT_HOUR = "09";
const DEFAULT_MINUTE = "00";

interface Props {
  label: string;
  value: string; // "HH:MM" or "" for unset
  onChange: (next: string) => void;
  placeholder?: string;
}

// ── Single scrolling wheel column ─────────────────────────────────────────────
function WheelColumn({
  items,
  index,
  onIndexChange,
}: {
  items: string[];
  index: number;
  onIndexChange: (i: number) => void;
}) {
  const ref = useRef<ScrollView>(null);
  const len = items.length;
  // Repeated data + the offset of the middle copy we keep the wheel centred on.
  const data = React.useMemo(() => Array.from({ length: REPEAT }, () => items).flat(), [items]);
  const BASE = Math.floor(REPEAT / 2) * len;
  const [activeRaw, setActiveRaw] = useState(BASE + index);

  // Position to the external index (middle copy) whenever it changes / on open.
  useEffect(() => {
    const target = BASE + ((index % len) + len) % len;
    setActiveRaw(target);
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: target * ITEM_HEIGHT, animated: false });
    }, 0);
    return () => clearTimeout(t);
  }, [index, len]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveRaw(Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT));
  };

  const onSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const raw = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const real = ((raw % len) + len) % len;
    onIndexChange(real);
    // Recenter to the middle copy so there's always headroom both ways → cyclic.
    const target = BASE + real;
    setActiveRaw(target);
    ref.current?.scrollTo({ y: target * ITEM_HEIGHT, animated: false });
  };

  return (
    <ScrollView
      ref={ref}
      style={{ height: VIEWPORT }}
      contentContainerStyle={{ paddingVertical: PAD }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={onScroll}
      onMomentumScrollEnd={onSettle}
      onScrollEndDrag={onSettle}
      nestedScrollEnabled
    >
      {data.map((it, i) => {
        const dist = Math.abs(i - activeRaw);
        const opacity = dist === 0 ? 1 : dist === 1 ? 0.35 : 0.15;
        return (
          <View key={i} style={styles.cell}>
            <Text style={[styles.cellText, { opacity }, dist === 0 && styles.cellTextActive]}>
              {it}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── Field + sheet ─────────────────────────────────────────────────────────────
export function TimeField({ label, value, onChange, placeholder = "Any time" }: Props) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(DEFAULT_HOUR);
  const [minute, setMinute] = useState(DEFAULT_MINUTE);

  const openSheet = () => {
    const [h, m] = value ? value.split(":") : [DEFAULT_HOUR, DEFAULT_MINUTE];
    setHour(h);
    setMinute(m);
    setOpen(true);
  };

  const done = () => {
    onChange(`${hour}:${minute}`);
    setOpen(false);
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.row}>
        <Pressable onPress={openSheet} style={styles.field}>
          <Clock size={15} color={colors.textMuted} />
          <Text style={[styles.fieldValue, !value && styles.fieldPlaceholder]} numberOfLines={1}>
            {value ? `${value} IST` : placeholder}
          </Text>
        </Pressable>
        {value ? (
          <Pressable onPress={() => onChange("")} style={styles.clearBtn} hitSlop={8}>
            <X size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Set time (IST)</Text>

            <View style={styles.colHeaders}>
              <Text style={styles.colHeader}>Hours</Text>
              <Text style={styles.colHeader}>Minutes</Text>
            </View>

            <View style={styles.wheels}>
              {/* centred highlight band behind the columns */}
              <View pointerEvents="none" style={styles.highlight} />
              <View style={styles.col}>
                <WheelColumn
                  items={HOURS}
                  index={HOURS.indexOf(hour)}
                  onIndexChange={(i) => setHour(HOURS[i])}
                />
              </View>
              <Text style={styles.colon}>:</Text>
              <View style={styles.col}>
                <WheelColumn
                  items={MINUTES}
                  index={MINUTES.indexOf(minute)}
                  onIndexChange={(i) => setMinute(MINUTES[i])}
                />
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable onPress={() => setOpen(false)} style={[styles.actionBtn, styles.cancelBtn]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={done} style={[styles.actionBtn, styles.doneBtn]}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { fontFamily: fonts.dmBold, fontSize: 11, letterSpacing: 0.5, color: colors.textMuted, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  field: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: colors.card,
  },
  fieldValue: { flex: 1, fontFamily: fonts.dmMedium, fontSize: 14, color: colors.text },
  fieldPlaceholder: { color: colors.textMuted },
  clearBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.card,
  },

  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 },
  sheetTitle: { fontFamily: fonts.dmBold, fontSize: 16, color: colors.text, textAlign: "center", marginBottom: 10 },

  colHeaders: { flexDirection: "row", justifyContent: "center", gap: 64, marginBottom: 2 },
  colHeader: { width: 70, textAlign: "center", fontFamily: fonts.dmBold, fontSize: 11, letterSpacing: 1, color: colors.textMuted, textTransform: "uppercase" },

  wheels: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: VIEWPORT },
  col: { width: 70 },
  colon: { fontFamily: fonts.nunito, fontSize: 26, color: colors.text, marginHorizontal: 10 },
  highlight: {
    position: "absolute", left: 24, right: 24, top: PAD, height: ITEM_HEIGHT,
    borderRadius: 12, backgroundColor: colors.pageBg,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border,
  },
  cell: { height: ITEM_HEIGHT, alignItems: "center", justifyContent: "center" },
  cellText: { fontFamily: fonts.nunito, fontSize: 24, color: colors.textMid },
  cellTextActive: { color: colors.genPurple },

  actions: { flexDirection: "row", gap: 12, marginTop: 18 },
  actionBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14 },
  cancelBtn: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  cancelText: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.textMid },
  doneBtn: { backgroundColor: colors.genPurple },
  doneText: { fontFamily: fonts.dmBold, fontSize: 14, color: "#fff" },
});
