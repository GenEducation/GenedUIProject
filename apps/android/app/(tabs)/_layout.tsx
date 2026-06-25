import React from "react";
import { Text } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@/theme/tokens";

/** Bottom navigation — mirrors StudentHomeSidebar nav: Home · Practice · Report Card · Me */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Some Android devices (Samsung One UI w/ 3-button nav, edge-to-edge) report a
  // bottom inset of 0, leaving the tab bar under the system nav. Floor it so the
  // bar always clears the nav while still honouring larger real insets.
  const tabInset = Math.max(insets.bottom, 40);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.genPurple,
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
        options={{ title: "Home", tabBarIcon: () => <Emoji char="🏠" /> }}
      />
      <Tabs.Screen
        name="practice"
        options={{ title: "Practice", tabBarIcon: () => <Emoji char="🎯" /> }}
      />
      <Tabs.Screen
        name="report"
        options={{ title: "Report Card", tabBarIcon: () => <Emoji char="📋" /> }}
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
