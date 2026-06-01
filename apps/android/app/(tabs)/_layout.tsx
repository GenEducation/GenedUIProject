import React from "react";
import { Text } from "react-native";
import { Tabs } from "expo-router";
import { colors, fonts } from "@/theme/tokens";

/** Bottom navigation — mirrors StudentHomeSidebar nav: Home · Practice · Report Card · Me */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.genPurple,
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
