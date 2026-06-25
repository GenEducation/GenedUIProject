import React from "react";
import { Text } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@/theme/tokens";

export default function PartnerLayout() {
  const insets = useSafeAreaInsets();
  // Floor the bottom inset — some Android devices report 0, hiding the bar under the nav.
  const tabInset = Math.max(insets.bottom, 40);
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
        options={{ title: "Students", tabBarIcon: () => <Emoji char="👥" /> }}
      />
      <Tabs.Screen
        name="registry"
        options={{ title: "Registry", tabBarIcon: () => <Emoji char="📚" /> }}
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
