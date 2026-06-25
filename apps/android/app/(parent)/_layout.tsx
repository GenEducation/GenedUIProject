import React, { useEffect } from "react";
import { Text } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@/theme/tokens";
import { notificationStore } from "@/store/useNotificationStore";
import { useParentId } from "@/hooks/useParentId";

export default function ParentLayout() {
  const parentId = useParentId();
  const insets = useSafeAreaInsets();
  // Floor the bottom inset — some Android devices report 0, hiding the bar under the nav.
  const tabInset = Math.max(insets.bottom, 40);

  /* Start SSE stream at layout level so it persists across tab switches */
  useEffect(() => {
    if (!parentId) return;
    const unsub = notificationStore.initStream(parentId);
    return unsub;
  }, [parentId]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.edGreen,
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
        options={{ title: "Children", tabBarIcon: () => <Emoji char="👨‍👧" /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: "Analytics", tabBarIcon: () => <Emoji char="📈" /> }}
      />
      <Tabs.Screen
        name="report"
        options={{ title: "Report Card", tabBarIcon: () => <Emoji char="📋" /> }}
      />
      <Tabs.Screen
        name="schedule"
        options={{ title: "Schedule", tabBarIcon: () => <Emoji char="🗓️" /> }}
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
