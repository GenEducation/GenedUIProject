import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  ActivityIndicator, Image, Animated, Easing, useWindowDimensions,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { colors, fonts } from "@/theme/tokens";
import { signIn, googleSignIn } from "@/services/authService";
import { signInWithGoogle, GoogleSignInCancelled } from "@/services/googleAuth";
import { useAuth } from "@/store/useAuthStore";
import { useLoaderStore } from "@/store/useLoaderStore";
import { AuthBackdrop } from "@/components/auth/AuthBackdrop";
import { AuthGreeter } from "@/components/auth/AuthGreeter";
import { Bouncy, Reveal } from "@/components/auth/motion";

const GENED_LOGO_WHITE = require("../assets/gened-logo-white.png");

export default function SignIn() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const { login } = useAuth();
  const { height: screenH } = useWindowDimensions();

  const [username,      setUsername]      = useState("");
  const [password,      setPassword]      = useState("");
  const [showPassword,  setShowPassword]  = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg,      setErrorMsg]      = useState("");

  /* Entrance: logo → mascot → headline → fields → CTA → footer. */
  const steps = useRef([...Array(6)].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(
      60,
      steps.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [steps]);

  /* The greeter fills the dead space on roomy screens; shrink it on short ones
     so the fields never get crowded once the keyboard is up. */
  const greeterSize = screenH < 680 ? 68 : screenH < 760 ? 82 : 96;

  /** Persist the session, then route to the role's home once the loader finishes. */
  const routeByRole = async (res: Awaited<ReturnType<typeof signIn>>) => {
    await login(res);
    const role = res.role?.toLowerCase();
    const path =
      role === "partner" ? "/(partner)" :
      role === "parent"  ? "/(parent)" :
      role === "teacher" ? "/(teacher)" :
      role === "student" ? "/(tabs)" :
      null;

    if (!path) {
      // Unknown role — do not grant access, force re-login
      useLoaderStore.getState().stopLoading();
      setErrorMsg(`Unrecognized account role "${res.role}". Please contact support.`);
      return;
    }

    useLoaderStore.getState().completeLoading();
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace(path as any);
    }, 1200);
  };

  const handleSignIn = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Please enter your username and password.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    useLoaderStore.getState().startLoading();
    try {
      const res = await signIn(username.trim(), password);
      await routeByRole(res);
    } catch (e: any) {
      useLoaderStore.getState().stopLoading();
      setErrorMsg(e.message || "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg("");
    setGoogleLoading(true);
    useLoaderStore.getState().startLoading();
    try {
      const idToken = await signInWithGoogle();
      const res = await googleSignIn(idToken);
      await routeByRole(res);
    } catch (e: any) {
      useLoaderStore.getState().stopLoading();
      if (e instanceof GoogleSignInCancelled) return; // user dismissed picker
      setErrorMsg(
        e.message ||
          "Google sign-in failed. If you're new, create an account first.",
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <AuthBackdrop />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 28 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* brandmark */}
        <Reveal anim={steps[0]}>
          <Image source={GENED_LOGO_WHITE} style={styles.brandLogo} resizeMode="contain" />
        </Reveal>

        <Reveal anim={steps[1]} style={styles.greeter}>
          <AuthGreeter size={greeterSize} />
        </Reveal>

        <Reveal anim={steps[2]}>
          <Text style={styles.h1}>Learn smarter,{"\n"}every single day.</Text>
          <Text style={styles.sub}>Your AI tutor for every subject — chat, practice, and track real progress.</Text>
        </Reveal>

        <Reveal anim={steps[3]} style={{ marginTop: 22 }}>
          <Field icon="user" placeholder="Username" value={username} onChange={setUsername} />
          <Field icon="lock" placeholder="Password"  value={password} onChange={setPassword} secure={!showPassword} showToggle toggleOn={showPassword} onToggle={() => setShowPassword((p) => !p)} />

          {!!errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
        </Reveal>

        <Reveal anim={steps[4]}>
          <Bouncy
            style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnPrimaryText}>Sign in</Text>
            }
          </Bouncy>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or continue with</Text>
            <View style={styles.orLine} />
          </View>

          {/* Native Google OAuth via @react-native-google-signin */}
          <Bouncy
            style={[styles.btnGoogle, googleLoading && { opacity: 0.7 }]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading
              ? <ActivityIndicator color={colors.navy} />
              : <>
                  <GoogleMark />
                  <Text style={styles.btnGoogleText}>Continue with Google</Text>
                </>
            }
          </Bouncy>
        </Reveal>

        <Reveal anim={steps[5]}>
          <Text style={styles.footer}>
            New here?{" "}
            <Link href="/sign-up" style={styles.footerLink}>
              Create an account
            </Link>
          </Text>
        </Reveal>
      </ScrollView>
    </View>
  );
}

function Field({
  icon, placeholder, value, onChange, secure, keyboardType,
  showToggle, toggleOn, onToggle,
}: {
  icon: "user" | "mail" | "lock";
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  keyboardType?: "email-address";
  showToggle?: boolean;
  toggleOn?: boolean;
  onToggle?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const stroke = focused ? colors.emerald : "#9fb8d6";

  return (
    <View style={[styles.field, focused && styles.fieldFocused]}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        {icon === "user" ? (
          <>
            <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={stroke} strokeWidth={1.6} />
            <Path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke={stroke} strokeWidth={1.6} />
          </>
        ) : icon === "mail" ? (
          <>
            <Path d="M4 6h16v12H4z" stroke={stroke} strokeWidth={1.6} />
            <Path d="m4 7 8 6 8-6" stroke={stroke} strokeWidth={1.6} />
          </>
        ) : (
          <>
            <Path d="M4 10h16v10H4z" stroke={stroke} strokeWidth={1.6} />
            <Path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={stroke} strokeWidth={1.6} />
          </>
        )}
      </Svg>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9fb8d6"
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        secureTextEntry={secure}
        keyboardType={keyboardType === "email-address" ? "email-address" : "default"}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {showToggle && (
        <Pressable onPress={onToggle} hitSlop={10} accessibilityRole="button" accessibilityLabel={toggleOn ? "Hide password" : "Show password"}>
          <EyeIcon off={!toggleOn} />
        </Pressable>
      )}
    </View>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      {off ? (
        <>
          <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07A3 3 0 1 1 9.88 9.88" stroke="#9fb8d6" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M6.61 6.61A18.5 18.5 0 0 0 2 12s3 8 10 8a9.12 9.12 0 0 0 5.39-1.61M2 2l20 20" stroke="#9fb8d6" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <Path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" stroke="#9fb8d6" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke="#9fb8d6" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </Svg>
  );
}

function GoogleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6z" />
      <Path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.8-2.9l-3.7-2.9c-1 .7-2.4 1.1-4.1 1.1-3.1 0-5.8-2.1-6.7-5H1.5v3C3.4 21.3 7.4 24 12 24z" />
      <Path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6v-3H1.5a12 12 0 0 0 0 10.6l3.8-3z" />
      <Path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.5 6.7l3.8 3c.9-2.9 3.6-4.9 6.7-4.9z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  brandLogo: { width: 150, height: 30, alignSelf: "flex-start", marginTop: 30 },
  greeter: { marginTop: 24, alignItems: "center" },
  h1:  { fontFamily: fonts.nunito, fontSize: 34, color: "#fff", marginTop: 24, lineHeight: 40 },
  sub: { fontFamily: fonts.dm, color: "#cfe0f5", fontSize: 14, marginTop: 10, lineHeight: 21 },
  field: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 18, paddingHorizontal: 16, height: 56, marginTop: 12,
  },
  fieldFocused: {
    borderColor: colors.emerald,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  input: { flex: 1, color: "#fff", fontFamily: fonts.dm, fontSize: 14 },
  error: { color: "#fca5a5", fontFamily: fonts.dmBold, fontSize: 12, marginTop: 10 },
  btnPrimary: {
    height: 56, borderRadius: 18, backgroundColor: colors.emerald,
    alignItems: "center", justifyContent: "center", marginTop: 18,
    shadowColor: "#02150E", shadowOpacity: 0.3, shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  btnPrimaryText: { color: "#fff", fontFamily: fonts.dmBold, fontSize: 15 },
  orRow:   { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 18 },
  orLine:  { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.18)" },
  orText:  { color: "#bcd3ee", fontSize: 12, fontFamily: fonts.dm },
  btnGoogle: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9,
    height: 56, borderRadius: 18, backgroundColor: "#fff",
    shadowColor: "#0B1A4A", shadowOpacity: 0.18, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  btnGoogleText: { color: "#1a1a1a", fontFamily: fonts.dmBold, fontSize: 15 },
  footer:     { textAlign: "center", color: "#bcd3ee", fontFamily: fonts.dm, fontSize: 13, marginTop: 22 },
  footerLink: { color: "#fff", fontFamily: fonts.dmBold },
});
