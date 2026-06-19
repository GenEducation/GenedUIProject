/**
 * MonthCalendar — a lightweight pure-JS month calendar (no native dep, no
 * rebuild). Lets the user page through months and pick any future date.
 *
 * Dates are emitted as ISO "YYYY-MM-DD" strings. Days before `minDate`
 * (default: today) are disabled.
 */
import React, { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { colors, fonts } from "../theme/tokens";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function toISO(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
/** Local midnight for a Date — strips the time component for day comparisons. */
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

interface Props {
  /** Currently-selected date as "YYYY-MM-DD". */
  value: string;
  onSelect: (iso: string) => void;
  /** Earliest selectable date as "YYYY-MM-DD". Defaults to today. */
  minDate?: string;
}

export function MonthCalendar({ value, onSelect, minDate }: Props) {
  const today = startOfDay(new Date());
  const min = minDate ? startOfDay(new Date(minDate)) : today;

  // The month currently being viewed — initialised from the selected value.
  const initial = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const grid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  // Don't let the user page before the month containing minDate.
  const canGoPrev =
    viewYear > min.getFullYear() ||
    (viewYear === min.getFullYear() && viewMonth > min.getMonth());

  const goPrev = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <View style={styles.card}>
      {/* Month header */}
      <View style={styles.header}>
        <Pressable onPress={goPrev} disabled={!canGoPrev} hitSlop={8} style={[styles.nav, !canGoPrev && styles.navDisabled]}>
          <ChevronLeft size={18} color={canGoPrev ? colors.text : colors.textFaint} />
        </Pressable>
        <Text style={styles.monthLabel}>
          {MONTHS[viewMonth]} {viewYear}
        </Text>
        <Pressable onPress={goNext} hitSlop={8} style={styles.nav}>
          <ChevronRight size={18} color={colors.text} />
        </Pressable>
      </View>

      {/* Weekday row */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <View key={i} style={styles.weekCell}>
            <Text style={styles.weekText}>{w}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.grid}>
        {grid.map((day, i) => {
          if (day == null) return <View key={`e-${i}`} style={styles.dayCell} />;
          const iso = toISO(viewYear, viewMonth, day);
          const cellDate = startOfDay(new Date(viewYear, viewMonth, day));
          const disabled = cellDate.getTime() < min.getTime();
          const selected = iso === value;
          const isToday = cellDate.getTime() === today.getTime();
          return (
            <View key={iso} style={styles.dayCell}>
              <Pressable
                onPress={() => !disabled && onSelect(iso)}
                disabled={disabled}
                style={[
                  styles.dayBtn,
                  selected && styles.dayBtnSelected,
                  isToday && !selected && styles.dayBtnToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    disabled && styles.dayTextDisabled,
                    selected && styles.dayTextSelected,
                  ]}
                >
                  {day}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  nav: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.pageBg,
  },
  navDisabled: { opacity: 0.4 },
  monthLabel: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.text },
  weekRow: { flexDirection: "row" },
  weekCell: { flex: 1, alignItems: "center", paddingVertical: 4 },
  weekText: { fontFamily: fonts.dmBold, fontSize: 11, color: colors.textMuted },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", padding: 2 },
  dayBtn: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBtnSelected: { backgroundColor: colors.genPurple },
  dayBtnToday: { borderWidth: 1.5, borderColor: colors.genPurple + "55" },
  dayText: { fontFamily: fonts.dmMedium, fontSize: 13, color: colors.text },
  dayTextDisabled: { color: colors.textFaint },
  dayTextSelected: { color: "#fff", fontFamily: fonts.dmBold },
});
