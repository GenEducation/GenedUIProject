import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { colors, fonts } from "@/theme/tokens";
import { signUp, sendOtp } from "@/services/authService";
import { useAuth } from "@/store/useAuthStore";
import { tutorialStore } from "@/store/useTutorialStore";

type Role = "student" | "parent" | "partner";

/**
 * Multi-step sign-up — fully adopted from the web SignUp.tsx flow.
 *   Step 1: role selection (Student / Parent / Partner)
 *   Step 2: Student Details (username, parent email, password, confirm, grade)
 * Parent/Partner branch to a Step 3 on web; here we focus on the student portal.
 */
export default function SignUp() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const { login } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role | null>(null);

  const [username,       setUsername]       = useState("");
  const [parentEmail,    setParentEmail]    = useState("");
  const [password,       setPassword]       = useState("");
  const [confirm,        setConfirm]        = useState("");
  const [grade,          setGrade]          = useState<number | null>(null);
  const [showPw,         setShowPw]         = useState(false);
  const [hasPersonalEmail, setHasPersonalEmail] = useState(false);
  const [personalEmail,  setPersonalEmail]  = useState("");
  const [otpSent,        setOtpSent]        = useState(false);
  const [otpCode,        setOtpCode]        = useState("");
  const [otpLoading,     setOtpLoading]     = useState(false);
  const [errors,         setErrors]         = useState<Record<string, string>>({});
  const [rootError,      setRootError]      = useState("");
  const [loading,        setLoading]        = useState(false);

  const totalSegments = role === "student" || !role ? 2 : 3;

  const selectRole = (r: Role) => {
    setRole(r);
    setStep(2);
  };

  const validateStudent = () => {
    const e: Record<string, string> = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (hasPersonalEmail) {
      if (!personalEmail.trim()) e.personalEmail = "Email is required";
      else if (!emailRe.test(personalEmail)) e.personalEmail = "Invalid email format";
      if (otpSent && !otpCode.trim()) e.otpCode = "Enter the OTP sent to your email";
      // username optional — validate only if filled
      if (username.trim() && username.trim().length < 3) e.username = "Must be at least 3 characters";
      // parentEmail optional — validate only if filled
      if (parentEmail.trim() && !emailRe.test(parentEmail)) e.parentEmail = "Invalid email format";
    } else {
      if (!username.trim()) e.username = "Username is required";
      else if (username.trim().length < 3) e.username = "Must be at least 3 characters";
      if (!parentEmail.trim()) e.parentEmail = "Parent email is required";
      else if (!emailRe.test(parentEmail)) e.parentEmail = "Invalid email format";
    }
    if (!password.trim()) e.password = "Password is required";
    else if (password.length < 6) e.password = "Must be at least 6 characters";
    if (password !== confirm) e.confirm = "Passwords do not match";
    if (!grade) e.grade = "Please select your grade";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSendOtp = async () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!personalEmail.trim() || !emailRe.test(personalEmail)) {
      setErrors(prev => ({ ...prev, personalEmail: "Enter a valid email first" }));
      return;
    }
    setOtpLoading(true);
    setErrors(prev => { const n = { ...prev }; delete n.personalEmail; return n; });
    try {
      await sendOtp(personalEmail.trim());
      setOtpSent(true);
    } catch (err: any) {
      setErrors(prev => ({ ...prev, personalEmail: err.message || "Failed to send OTP" }));
    } finally {
      setOtpLoading(false);
    }
  };

  const createAccount = async () => {
    if (!validateStudent()) return;
    setRootError("");
    setLoading(true);
    try {
      const res = await signUp({
        password,
        role:         "STUDENT",
        grade:        grade!,
        ...(username.trim()     ? { username:     username.trim() }     : {}),
        ...(parentEmail.trim()  ? { parent_email: parentEmail.trim() }  : {}),
        ...(hasPersonalEmail && personalEmail.trim() ? { email_id: personalEmail.trim() } : {}),
        ...(hasPersonalEmail && otpCode.trim()       ? { otp_code: otpCode.trim() }       : {}),
      });
      await login(res);
      tutorialStore.startTutorial();
      router.replace("/(tabs)");
    } catch (e: any) {
      setRootError(e.message || "Sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* progress bar */}
      <View style={styles.progress}>
        {Array.from({ length: totalSegments }).map((_, i) => (
          <View key={i} style={[styles.progressSeg, i < step && styles.progressOn]} />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>G</Text>
          </View>
          <Text style={styles.brandText}>GenEducation</Text>
        </View>

        {step === 1 ? (
          <Step1 selected={role} onSelect={selectRole} onLogin={() => router.replace("/sign-in")} />
        ) : (
          <Step2Student
            back={() => setStep(1)}
            username={username} setUsername={setUsername}
            parentEmail={parentEmail} setParentEmail={setParentEmail}
            password={password} setPassword={setPassword}
            confirm={confirm} setConfirm={setConfirm}
            grade={grade} setGrade={setGrade}
            showPw={showPw} setShowPw={setShowPw}
            hasPersonalEmail={hasPersonalEmail} setHasPersonalEmail={setHasPersonalEmail}
            personalEmail={personalEmail} setPersonalEmail={setPersonalEmail}
            otpSent={otpSent} otpCode={otpCode} setOtpCode={setOtpCode}
            otpLoading={otpLoading} onSendOtp={handleSendOtp}
            errors={errors} rootError={rootError} loading={loading}
            onSubmit={createAccount}
            onLogin={() => router.replace("/sign-in")}
          />
        )}
      </ScrollView>
    </View>
  );
}

/* ───────────────────────── STEP 1 — ROLE SELECT ───────────────────────── */
function Step1({
  selected, onSelect, onLogin,
}: { selected: Role | null; onSelect: (r: Role) => void; onLogin: () => void }) {
  return (
    <View>
      <Text style={styles.title}>Let&apos;s personalize{"\n"}your experience</Text>
      <Text style={styles.subtitle}>Select your role to get started</Text>

      <View style={{ gap: 12, marginTop: 4 }}>
        <RoleCard role="student" label="Student" selected={selected === "student"} onPress={() => onSelect("student")} art={<StudentArt />} artBg="#F1ECFF" />
        <RoleCard role="parent" label="Parent" selected={selected === "parent"} onPress={() => onSelect("parent")} art={<ParentArt />} artBg="#EAF1FF" />
        <RoleCard role="partner" label="Partner" selected={selected === "partner"} onPress={() => onSelect("partner")} art={<PartnerArt />} artBg="#F1ECFF" />
      </View>

      <LoginRow onLogin={onLogin} />
    </View>
  );
}

function RoleCard({
  label, selected, onPress, art, artBg,
}: { role: Role; label: string; selected: boolean; onPress: () => void; art: React.ReactNode; artBg: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.roleCard, selected && styles.roleCardSel]}>
      <View style={[styles.roleArt, { backgroundColor: artBg }]}>{art}</View>
      <Text style={styles.roleLabel}>{label}</Text>
      {selected && (
        <View style={styles.roleCheck}>
          <Text style={styles.roleCheckText}>✓</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ───────────────────────── STEP 2 — STUDENT DETAILS ───────────────────── */
function Step2Student(p: {
  back: () => void;
  username: string; setUsername: (v: string) => void;
  parentEmail: string; setParentEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  confirm: string; setConfirm: (v: string) => void;
  grade: number | null; setGrade: (v: number) => void;
  showPw: boolean; setShowPw: (v: boolean) => void;
  hasPersonalEmail: boolean; setHasPersonalEmail: (v: boolean) => void;
  personalEmail: string; setPersonalEmail: (v: string) => void;
  otpSent: boolean; otpCode: string; setOtpCode: (v: string) => void;
  otpLoading: boolean; onSendOtp: () => void;
  errors: Record<string, string>;
  rootError: string;
  loading: boolean;
  onSubmit: () => void;
  onLogin: () => void;
}) {
  return (
    <View>
      <View style={styles.stepHead}>
        <Pressable onPress={p.back} style={styles.backBtn}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="m15 6-6 6 6 6" stroke={colors.navy} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </Pressable>
        <View>
          <Text style={styles.stepTitle}>Student Details</Text>
          <Text style={styles.stepEyebrow}>STEP 2 OF 2</Text>
        </View>
      </View>

      {/* Personal-email toggle */}
      <Pressable
        onPress={() => p.setHasPersonalEmail(!p.hasPersonalEmail)}
        style={styles.toggleRow}
      >
        <View style={[styles.toggleBox, p.hasPersonalEmail && styles.toggleBoxOn]}>
          {p.hasPersonalEmail && <Text style={styles.toggleTick}>✓</Text>}
        </View>
        <Text style={styles.toggleLabel}>I want to sign up with my personal email</Text>
      </Pressable>

      {p.hasPersonalEmail ? (
        <>
          {/* Personal email + OTP */}
          <View style={{ marginTop: 16 }}>
            <Text style={styles.label}>YOUR EMAIL ADDRESS</Text>
            <View style={[styles.inputWrap, !!p.errors.personalEmail && styles.inputWrapError, { paddingRight: 6 }]}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="you@example.com"
                placeholderTextColor="#0E1F2B40"
                value={p.personalEmail}
                onChangeText={p.setPersonalEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Pressable
                onPress={p.onSendOtp}
                disabled={p.otpLoading || p.otpSent}
                style={[styles.verifyBtn, (p.otpLoading || p.otpSent) && { opacity: 0.5 }]}
              >
                {p.otpLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.verifyBtnText}>{p.otpSent ? "Sent ✓" : "Verify"}</Text>
                }
              </Pressable>
            </View>
            {!!p.errors.personalEmail && <Text style={styles.error}>{p.errors.personalEmail}</Text>}
          </View>

          {p.otpSent && (
            <Input
              label="OTP CODE"
              placeholder="Enter the code from your email"
              value={p.otpCode}
              onChange={p.setOtpCode}
              error={p.errors.otpCode}
              keyboardType="default"
            />
          )}

          <Input
            label="Username (optional)"
            placeholder="e.g. creative_coder"
            value={p.username}
            onChange={p.setUsername}
            error={p.errors.username}
          />
          <Input
            label="Parent or Guardian's Email (optional)"
            placeholder="parent@example.com"
            value={p.parentEmail}
            onChange={p.setParentEmail}
            error={p.errors.parentEmail}
            keyboardType="email-address"
          />
        </>
      ) : (
        <>
          <Input label="Choose a Username" placeholder="e.g. creative_coder" value={p.username} onChange={p.setUsername} error={p.errors.username} />
          <Input label="Parent or Guardian's Email" placeholder="parent@example.com" value={p.parentEmail} onChange={p.setParentEmail} error={p.errors.parentEmail} keyboardType="email-address" />
          <Text style={styles.helper}>Required for account confirmation. Your parent will receive an email to confirm and link accounts.</Text>
        </>
      )}

      <Input
        label="Password" placeholder="••••••••" value={p.password} onChange={p.setPassword}
        error={p.errors.password} secure={!p.showPw}
        rightToggle={{ on: p.showPw, onToggle: () => p.setShowPw(!p.showPw) }}
      />
      <Input label="Confirm Password" placeholder="••••••••" value={p.confirm} onChange={p.setConfirm} error={p.errors.confirm} secure />

      <Text style={styles.label}>WHAT GRADE ARE YOU IN?</Text>
      <View style={styles.gradeGrid}>
        {[3, 4, 5, 6, 7, 8].map((g) => {
          const active = p.grade === g;
          return (
            <Pressable key={g} onPress={() => p.setGrade(g)} style={[styles.gradeCell, active && styles.gradeCellOn]}>
              <Text style={[styles.gradeText, active && styles.gradeTextOn]}>{g}</Text>
            </Pressable>
          );
        })}
      </View>
      {!!p.errors.grade && <Text style={styles.error}>{p.errors.grade}</Text>}

      {!!p.rootError && (
        <View style={styles.rootErrBox}>
          <Text style={styles.rootErrText}>{p.rootError}</Text>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.submit, pressed && { opacity: 0.9 }, p.loading && { opacity: 0.7 }]}
        onPress={p.onSubmit}
        disabled={p.loading}
      >
        {p.loading
          ? <ActivityIndicator color="#fff" />
          : <>
              <Text style={styles.submitText}>Create Account</Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </>
        }
      </Pressable>

      <LoginRow onLogin={p.onLogin} />
    </View>
  );
}

function Input({
  label, placeholder, value, onChange, error, secure, keyboardType, rightToggle,
}: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
  error?: string; secure?: boolean; keyboardType?: "email-address" | "default";
  rightToggle?: { on: boolean; onToggle: () => void };
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, !!error && styles.inputWrapError]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#0E1F2B40"
          value={value}
          onChangeText={onChange}
          secureTextEntry={secure}
          keyboardType={keyboardType === "email-address" ? "email-address" : "default"}
          autoCapitalize="none"
        />
        {rightToggle && (
          <Pressable onPress={rightToggle.onToggle} hitSlop={10}>
            <Text style={styles.toggle}>{rightToggle.on ? "Hide" : "Show"}</Text>
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function LoginRow({ onLogin }: { onLogin: () => void }) {
  return (
    <Text style={styles.loginRow}>
      Already have an account?{" "}
      <Text style={styles.loginLink} onPress={onLogin}>
        Log in
      </Text>
    </Text>
  );
}

/* ── Role illustrations (ported from SignUp.tsx StudentSVG/ParentSVG/PartnerSVG) ── */
function StudentArt() {
  return (
    <Svg width={58} height={58} viewBox="0 0 420 420">
      <Rect x="150" y="290" width="120" height="22" rx="11" fill="#8B5CF6" />
      <Rect x="165" y="180" width="90" height="95" rx="40" fill="#22C55E" />
      <Circle cx="210" cy="135" r="55" fill="#F4C7A1" />
      <Path d="M160 130 Q170 60 210 70 Q255 60 265 130 Q240 95 210 100 Q180 95 160 130" fill="#1E293B" />
      <Circle cx="190" cy="135" r="5" fill="#111" />
      <Circle cx="230" cy="135" r="5" fill="#111" />
      <Path d="M192 160 Q210 175 228 160" stroke="#111" strokeWidth={4} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
function ParentArt() {
  return (
    <Svg width={58} height={58} viewBox="0 0 420 420">
      <Rect x="150" y="180" width="120" height="140" rx="50" fill="#2563EB" />
      <Circle cx="210" cy="120" r="60" fill="#F4C7A1" />
      <Path d="M150 120 Q170 40 210 55 Q255 40 270 120 Q240 90 210 95 Q180 90 150 120" fill="#111827" />
      <Circle cx="190" cy="120" r="5" fill="#111" />
      <Circle cx="230" cy="120" r="5" fill="#111" />
      <Path d="M190 145 Q210 165 230 145" stroke="#111" strokeWidth={4} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
function PartnerArt() {
  return (
    <Svg width={58} height={58} viewBox="0 0 420 420">
      <Rect x="150" y="180" width="120" height="150" rx="50" fill="#8B5CF6" />
      <Circle cx="210" cy="120" r="60" fill="#F4C7A1" />
      <Path d="M150 120 Q170 45 210 60 Q250 45 270 120 Q240 90 210 95 Q180 90 150 120" fill="#111827" />
      <Circle cx="190" cy="120" r="14" fill="none" stroke="#111" strokeWidth={3} />
      <Circle cx="230" cy="120" r="14" fill="none" stroke="#111" strokeWidth={3} />
      <Line x1="204" y1="120" x2="216" y2="120" stroke="#111" strokeWidth={3} />
      <Circle cx="190" cy="120" r="4" fill="#111" />
      <Circle cx="230" cy="120" r="4" fill="#111" />
      <Path d="M190 150 Q210 168 230 150" stroke="#111" strokeWidth={4} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

const navy15 = "rgba(4,46,92,0.10)";
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7FB" },
  progress: { flexDirection: "row", gap: 4, paddingHorizontal: 14, paddingTop: 8 },
  progressSeg: { flex: 1, height: 5, borderRadius: 999, backgroundColor: navy15 },
  progressOn: { backgroundColor: colors.emerald },
  brand: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 18, marginBottom: 20 },
  brandMark: { width: 22, height: 22, borderRadius: 6, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  brandMarkText: { color: "#fff", fontFamily: fonts.dmBold, fontSize: 13 },
  brandText: { color: colors.navy, fontFamily: fonts.dmBold, fontSize: 14 },

  title: { fontFamily: fonts.playfair, fontSize: 24, color: colors.navy, lineHeight: 28 },
  subtitle: { fontFamily: fonts.dm, fontSize: 12, color: "#042e5c80", marginTop: 8, marginBottom: 18 },

  roleCard: {
    flexDirection: "row", alignItems: "center", gap: 14, padding: 14,
    borderRadius: 18, borderWidth: 2, borderColor: navy15, backgroundColor: "#fff",
  },
  roleCardSel: { borderColor: colors.emerald, backgroundColor: "#059F6D0d" },
  roleArt: { width: 62, height: 62, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  roleLabel: { fontFamily: fonts.dmBold, fontSize: 15, color: colors.navy },
  roleCheck: { marginLeft: "auto", width: 24, height: 24, borderRadius: 12, backgroundColor: colors.emerald, alignItems: "center", justifyContent: "center" },
  roleCheckText: { color: "#fff", fontFamily: fonts.dmBold, fontSize: 13 },

  stepHead: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: navy15, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  stepTitle: { fontFamily: fonts.playfair, fontSize: 18, color: colors.navy },
  stepEyebrow: { fontFamily: fonts.dmBold, fontSize: 10, color: colors.emerald, letterSpacing: 1.5, marginTop: 2 },

  label: { fontFamily: fonts.dmBold, fontSize: 9, letterSpacing: 1.5, color: "#042e5c73", marginBottom: 8, marginTop: 18, textTransform: "uppercase" },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: navy15, backgroundColor: "#ffffffb3",
    borderRadius: 12, paddingHorizontal: 16, height: 50,
  },
  inputWrapError: { borderColor: "#fb7185", backgroundColor: "#fff1f2" },
  input: { flex: 1, fontFamily: fonts.dm, fontSize: 14, color: "#0E1F2B" },
  toggle: { fontFamily: fonts.dmBold, fontSize: 12, color: colors.emerald },
  helper: { fontFamily: fonts.dm, fontSize: 9, color: "#042e5c66", marginTop: 6, lineHeight: 14 },
  error: { color: "#f43f5e", fontSize: 10, fontFamily: fonts.dmBold, marginTop: 6, fontStyle: "italic" },

  gradeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gradeCell: {
    width: "22%", flexGrow: 1, height: 46, borderRadius: 12, backgroundColor: "#042e5c0d",
    alignItems: "center", justifyContent: "center",
  },
  gradeCellOn: { backgroundColor: colors.emerald },
  gradeText: { fontFamily: fonts.dmBold, fontSize: 14, color: colors.navy },
  gradeTextOn: { color: "#fff" },

  submit: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 52, borderRadius: 12, backgroundColor: colors.emerald, marginTop: 22,
  },
  submitText: { color: "#fff", fontFamily: fonts.dmBold, fontSize: 14 },

  loginRow: { textAlign: "center", fontFamily: fonts.dm, fontSize: 12, color: "#2D3E5166", marginTop: 24 },
  loginLink: { color: colors.emerald, fontFamily: fonts.dmBold },
  rootErrBox: { marginTop: 10, padding: 14, borderRadius: 12, backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecdd3" },
  rootErrText: { fontFamily: fonts.dmBold, fontSize: 13, color: "#be123c" },

  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  toggleBox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: navy15,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff",
  },
  toggleBoxOn: { backgroundColor: colors.emerald, borderColor: colors.emerald },
  toggleTick: { color: "#fff", fontSize: 11, fontFamily: fonts.dmBold },
  toggleLabel: { fontFamily: fonts.dm, fontSize: 12, color: colors.navy, flex: 1 },

  verifyBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, backgroundColor: colors.emerald,
    alignItems: "center", justifyContent: "center",
    minWidth: 60,
  },
  verifyBtnText: { color: "#fff", fontFamily: fonts.dmBold, fontSize: 11 },
});
