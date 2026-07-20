import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display";
import {
  SourceSerif4_500Medium,
  SourceSerif4_500Medium_Italic,
} from "@expo-google-fonts/source-serif-4";
import { JetBrainsMono_600SemiBold } from "@expo-google-fonts/jetbrains-mono";
import { AuthProvider } from "@/store/useAuthStore";
import { registerSessionExpiredHandler } from "@/services/authFetch";
import { prefsStore } from "@/store/usePrefsStore";
import { tutorialStore } from "@/store/useTutorialStore";
import { micPrimingStore } from "@/store/useMicPrimingStore";
import { TutorialTourModal } from "@/components/tutorial/TutorialTourModal";
import { MicPrimingSheet } from "@/components/voice/MicPrimingSheet";
import { LoaderJourney } from "@/components/loaders/LoaderJourney";

SplashScreen.preventAutoHideAsync();

function RootStackNavigator() {
  const router = useRouter();

  /* Wire the 401/403 handler — navigates to sign-in and clears the session */
  useEffect(() => {
    registerSessionExpiredHandler(() => router.replace("/sign-in"));
    prefsStore.hydrate();
    tutorialStore.hydrate();
    micPrimingStore.hydrate();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index"    />
      <Stack.Screen name="sign-in"  />
      <Stack.Screen name="sign-up"  />
      <Stack.Screen name="(tabs)"    />
      <Stack.Screen name="(partner)" />
      <Stack.Screen name="(parent)"  />
      <Stack.Screen name="(teacher)" />
      <Stack.Screen name="parent-chat"  options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="teacher-chat"   options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="teacher-report" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="partner-lab-devices" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="teacher-lab-schedule" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="teacher-lab-run" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="chat"       options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="voice-chat" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="test"        options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="onboarding"  options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="personalize" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="pdf-viewer"  options={{ animation: "slide_from_bottom" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Nunito_700Bold,
    Nunito_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    PlayfairDisplay_700Bold,
    SourceSerif4_500Medium,
    SourceSerif4_500Medium_Italic,
    JetBrainsMono_600SemiBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootStackNavigator />
        <TutorialTourModal />
        <MicPrimingSheet />
        <LoaderJourney />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
