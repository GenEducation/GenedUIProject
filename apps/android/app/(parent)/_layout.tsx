import React, { useEffect } from "react";
import { Text } from "react-native";
import { Tabs } from "expo-router";
import { colors, fonts } from "@/theme/tokens";
import { notificationStore } from "@/store/useNotificationStore";
import { useParentId } from "@/hooks/useParentId";

export default function ParentLayout() {
  const parentId = useParentId();

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
          height: 64,
          paddingBottom: 8,
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
