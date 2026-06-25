import React from "react";
import { View, Text } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@/theme/tokens";
import { useTeacherStore } from "@/store/useTeacherStore";

export default function TeacherLayout() {
  const { overview } = useTeacherStore();
  const pendingCount = overview?.pending ?? 0;
  const insets = useSafeAreaInsets();
  // Floor the bottom inset — some Android devices report 0, hiding the bar under the nav.
  const tabInset = Math.max(insets.bottom, 40);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.emerald,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 64 + tabInset,
          paddingBottom: 8 + tabInset,
          paddingTop: 8,
          borderTopColor: colors.border,
          backgroundColor: "#fff",
        },
        tabBarLabelStyle: { fontFamily: fonts.dmBold, fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Students",
          tabBarIcon: () => <Emoji char="👥" />,
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.sun,
            fontSize: 10,
            fontFamily: fonts.dmBold,
          },
        }}
      />
      <Tabs.Screen
        name="me"
        options={{ title: "Me", tabBarIcon: () => <Emoji char="😊" /> }}
      />
    </Tabs>
  );
}

function Emoji({ char }: { char: string }) {
  return <Text style={{ fontSize: 18 }}>{char}</Text>;
}
