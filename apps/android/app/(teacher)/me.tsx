import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/store/useAuthStore";
import { useRouter } from "expo-router";
import { colors, fonts, radius } from "@/theme/tokens";

const AVATAR_COLORS = [
  colors.navy,
  colors.emerald,
  colors.genBlue,
  colors.genPurple,
  colors.coral,
];

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={sh.row}>
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text style={sh.label}>{label}</Text>
    </View>
  );
}
const sh = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  label: { fontSize: 11, fontFamily: fonts.dmBold, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.5 },
});

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function TeacherMe() {
  const { state, logout } = useAuth();
  const router = useRouter();
  const [avatarColor, setAvatarColor] = useState(colors.navy);

  const handleLogout = async () => {
    await logout();
    router.replace("/sign-in");
  };

  const profile = state.status === "authenticated" ? state.profile : null;
  const displayName = profile?.name ?? profile?.username ?? "Teacher";
  const initial     = displayName[0]?.toUpperCase() ?? "T";
  const email       = profile?.email ?? "—";

  return (
    <Screen background={colors.pageBg}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.dots}>
            {AVATAR_COLORS.map((c) => {
              const active = c === avatarColor;
              return (
                <Pressable
                  key={c}
                  onPress={() => setAvatarColor(c)}
                  style={[
                    styles.dot,
                    { backgroundColor: c, width: active ? 20 : 16, height: active ? 20 : 16 },
                    active && { borderWidth: 2, borderColor: "#fff" },
                  ]}
                />
              );
            })}
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.role}>Teacher</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* Account info */}
        <View style={styles.card}>
          <SectionHeader icon="🎓" label="Account Details" />
          <InfoRow label="Name"  value={displayName} />
          <InfoRow label="Email" value={email} />
          <InfoRow label="Role"  value="Teacher" />
        </View>

        {/* Logout */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 },

  hero: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatarText: { color: "#fff", fontFamily: fonts.nunito, fontSize: 32 },
  dots: { flexDirection: "row", gap: 6, marginTop: 12, alignItems: "center" },
  dot:  { borderRadius: 999 },
  name:  { fontFamily: fonts.nunito, fontSize: 24, color: colors.text, marginTop: 13 },
  role:  { fontFamily: fonts.dmBold, fontSize: 13, color: colors.emerald, marginTop: 4 },
  email: { fontFamily: fonts.dmMedium, fontSize: 12, color: colors.textMuted, marginTop: 4 },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "80",
  },
  infoLabel: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.textMuted },
  infoValue: { fontFamily: fonts.dmBold, fontSize: 13, color: colors.text },

  logoutBtn: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: colors.coral + "66",
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.coral + "0a",
  },
  logoutText: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.coral },
});
