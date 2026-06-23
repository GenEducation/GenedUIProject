import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  ActivityIndicator, Alert,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { colors, fonts } from "@/theme/tokens";
import { signIn } from "@/services/authService";
import { useAuth } from "@/store/useAuthStore";

export default function SignIn() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const { login } = useAuth();

  const [username,    setUsername]    = useState("");
  const [password,    setPassword]    = useState("");
  const [loading,     setLoading]     = useState(false);
  const [errorMsg,    setErrorMsg]    = useState("");

  const handleSignIn = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Please enter your username and password.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await signIn(username.trim(), password);
      await login(res);
      router.replace(res.role?.toLowerCase() === "partner" ? "/(partner)" : "/(tabs)");
    } catch (e: any) {
      setErrorMsg(e.message || "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 28 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* brandmark */}
        <View style={styles.brandmark}>
          <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
            <Path d="M12 3 1 8l11 5 9-4.1V15" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M5 11.5V16c0 1.4 3.1 3 7 3s7-1.6 7-3v-4.5" stroke="#3fd39a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>

        <Text style={styles.h1}>Learn smarter,{"\n"}every single day.</Text>
        <Text style={styles.sub}>Your AI tutor for every subject — chat, practice, and track real progress.</Text>

        <View style={{ marginTop: 22 }}>
          <Field icon="user" placeholder="Username" value={username} onChange={setUsername} />
          <Field icon="lock" placeholder="Password"  value={password} onChange={setPassword} secure />

          {!!errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed, loading && { opacity: 0.7 }]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnPrimaryText}>Sign in</Text>
            }
          </Pressable>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or continue with</Text>
            <View style={styles.orLine} />
          </View>

          {/* Google sign-in placeholder — native OAuth via expo-auth-session in next phase */}
          <Pressable
            style={({ pressed }) => [styles.btnGoogle, pressed && styles.pressed]}
            onPress={() => Alert.alert("Coming soon", "Native Google OAuth will be wired in the next phase.")}
          >
            <GoogleMark />
            <Text style={styles.btnGoogleText}>Continue with Google</Text>
          </Pressable>

          <Text style={styles.footer}>
            New here?{" "}
            <Link href="/sign-up" style={styles.footerLink}>
              Create an account
            </Link>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Field({
  icon, placeholder, value, onChange, secure, keyboardType,
}: {
  icon: "user" | "mail" | "lock";
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  keyboardType?: "email-address";
}) {
  return (
    <View style={styles.field}>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        {icon === "user" ? (
          <>
            <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#9fb8d6" strokeWidth={1.6} />
            <Path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="#9fb8d6" strokeWidth={1.6} />
          </>
        ) : icon === "mail" ? (
          <>
            <Path d="M4 6h16v12H4z" stroke="#9fb8d6" strokeWidth={1.6} />
            <Path d="m4 7 8 6 8-6" stroke="#9fb8d6" strokeWidth={1.6} />
          </>
        ) : (
          <>
            <Path d="M4 10h16v10H4z" stroke="#9fb8d6" strokeWidth={1.6} />
            <Path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="#9fb8d6" strokeWidth={1.6} />
          </>
        )}
      </Svg>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9fb8d6"
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        keyboardType={keyboardType === "email-address" ? "email-address" : "default"}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
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
  root: { flex: 1, backgroundColor: colors.navy },
  brandmark: {
    width: 62, height: 62, borderRadius: 20, marginTop: 28,
    backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  h1:  { fontFamily: fonts.playfair, fontSize: 32, color: "#fff", marginTop: 26, lineHeight: 36 },
  sub: { fontFamily: fonts.dm, color: "#bcd3ee", fontSize: 14, marginTop: 10, lineHeight: 21 },
  field: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 14, paddingHorizontal: 14, height: 50, marginTop: 12,
  },
  input: { flex: 1, color: "#fff", fontFamily: fonts.dm, fontSize: 14 },
  error: { color: "#fca5a5", fontFamily: fonts.dmBold, fontSize: 12, marginTop: 10 },
  btnPrimary: {
    height: 50, borderRadius: 14, backgroundColor: colors.emerald,
    alignItems: "center", justifyContent: "center", marginTop: 18,
  },
  btnPrimaryText: { color: "#fff", fontFamily: fonts.dmBold, fontSize: 15 },
  orRow:   { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 18 },
  orLine:  { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.18)" },
  orText:  { color: "#9fb8d6", fontSize: 12, fontFamily: fonts.dm },
  btnGoogle: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9,
    height: 50, borderRadius: 14, backgroundColor: "#fff",
  },
  btnGoogleText: { color: "#1a1a1a", fontFamily: fonts.dmBold, fontSize: 15 },
  footer:     { textAlign: "center", color: "#9fb8d6", fontFamily: fonts.dm, fontSize: 13, marginTop: 22 },
  footerLink: { color: "#fff", fontFamily: fonts.dmBold },
  pressed:    { opacity: 0.85 },
});
