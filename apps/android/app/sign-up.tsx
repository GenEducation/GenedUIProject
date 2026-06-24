import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle, Path } from "react-native-svg";
import { colors, fonts } from "@/theme/tokens";
import { signUp, googleSignUp, sendOtp } from "@/services/authService";
import { signInWithGoogle, GoogleSignInCancelled } from "@/services/googleAuth";
import { useAuth } from "@/store/useAuthStore";
import { tutorialStore } from "@/store/useTutorialStore";

type Role = "student" | "parent";

export default function SignUp() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const { login } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<Role | null>(null);

  // Shared
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState("");
  const [loading,   setLoading]   = useState(false);

  // Google — when set, the account is created via /auth/google-sign-up and the
  // email/password fields are skipped (the token carries the verified identity).
  const [googleToken,   setGoogleToken]   = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Student-specific
  const [username,          setUsername]          = useState("");
  const [parentEmail,       setParentEmail]       = useState("");
  const [grade,             setGrade]             = useState<number | null>(null);
  const [hasPersonalEmail,  setHasPersonalEmail]  = useState(false);
  const [personalEmail,     setPersonalEmail]     = useState("");
  const [studentOtpSent,    setStudentOtpSent]    = useState(false);
  const [studentOtpCode,    setStudentOtpCode]    = useState("");
  const [studentOtpLoading, setStudentOtpLoading] = useState(false);

  // Parent-specific
  const [parentEmailId,  setParentEmailId]  = useState("");
  const [parentOtpSent,  setParentOtpSent]  = useState(false);
  const [parentOtpCode,  setParentOtpCode]  = useState("");
  const [parentOtpLoading, setParentOtpLoading] = useState(false);
  const [phone,          setPhone]          = useState("");

  // Progress bar segments: student = 2, parent = 3
  const totalSegments = role === "parent" ? 3 : 2;

  const selectRole = (r: Role) => {
    setRole(r);
    setStep(2);
  };

  /** Fetch a Google ID token and mark the form as a Google-based sign-up. */
  const handleGoogleAuth = async () => {
    setRootError("");
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();
      setGoogleToken(idToken);
      setErrors({});
    } catch (e: any) {
      if (e instanceof GoogleSignInCancelled) return; // user dismissed picker
      setRootError(e.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  /* ── Student OTP ── */
  const handleStudentSendOtp = async () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!personalEmail.trim() || !emailRe.test(personalEmail)) {
      setErrors(prev => ({ ...prev, personalEmail: "Enter a valid email first" }));
      return;
    }
    setStudentOtpLoading(true);
    setErrors(prev => { const n = { ...prev }; delete n.personalEmail; return n; });
    try {
      await sendOtp(personalEmail.trim());
      setStudentOtpSent(true);
    } catch (err: any) {
      setErrors(prev => ({ ...prev, personalEmail: err.message || "Failed to send OTP" }));
    } finally {
      setStudentOtpLoading(false);
    }
  };

  /* ── Parent OTP ── */
  const handleParentSendOtp = async () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!parentEmailId.trim() || !emailRe.test(parentEmailId)) {
      setErrors(prev => ({ ...prev, parentEmailId: "Enter a valid email first" }));
      return;
    }
    setParentOtpLoading(true);
    setErrors(prev => { const n = { ...prev }; delete n.parentEmailId; return n; });
    try {
      await sendOtp(parentEmailId.trim());
      setParentOtpSent(true);
    } catch (err: any) {
      setErrors(prev => ({ ...prev, parentEmailId: err.message || "Failed to send OTP" }));
    } finally {
      setParentOtpLoading(false);
    }
  };

  /* ── Validation ── */
  const validateStudentStep2 = () => {
    const e: Record<string, string> = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Google sign-up: identity comes from the token; only grade is required.
    if (googleToken) {
      if (username.trim() && username.trim().length < 3) e.username = "Must be at least 3 characters";
      if (!grade) e.grade = "Please select your grade";
      setErrors(e);
      return Object.keys(e).length === 0;
    }
    if (hasPersonalEmail) {
      if (!personalEmail.trim()) e.personalEmail = "Email is required";
      else if (!emailRe.test(personalEmail)) e.personalEmail = "Invalid email format";
      if (studentOtpSent && !studentOtpCode.trim()) e.studentOtpCode = "Enter the OTP sent to your email";
      if (username.trim() && username.trim().length < 3) e.username = "Must be at least 3 characters";
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

  const validateParentStep2 = () => {
    const e: Record<string, string> = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Google sign-up: skip email/password — proceed straight to the profile step.
    if (googleToken) { setErrors({}); return true; }
    if (!parentEmailId.trim()) e.parentEmailId = "Email is required";
    else if (!emailRe.test(parentEmailId)) e.parentEmailId = "Invalid email format";
    if (parentOtpSent && !parentOtpCode.trim()) e.parentOtpCode = "Enter the OTP sent to your email";
    if (!password.trim()) e.password = "Password is required";
    else if (password.length < 6) e.password = "Must be at least 6 characters";
    if (password !== confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Submit ── */
  const createStudentAccount = async () => {
    if (!validateStudentStep2()) return;
    setRootError(""); setLoading(true);
    try {
      const res = googleToken
        ? await googleSignUp(googleToken, {
            role: "STUDENT", grade: grade!,
            ...(username.trim() ? { username: username.trim() } : {}),
          })
        : await signUp({
            password, role: "STUDENT", grade: grade!,
            ...(username.trim()    ? { username: username.trim() } : {}),
            ...(parentEmail.trim() ? { parent_email: parentEmail.trim() } : {}),
            ...(hasPersonalEmail && personalEmail.trim() ? { email_id: personalEmail.trim() } : {}),
            ...(hasPersonalEmail && studentOtpCode.trim() ? { otp_code: studentOtpCode.trim() } : {}),
          });
      await login(res);
      tutorialStore.startTutorial();
      router.replace("/(tabs)");
    } catch (e: any) {
      setRootError(e.message || "Sign-up failed. Please try again.");
    } finally { setLoading(false); }
  };

  const continueParentToStep3 = () => {
    if (!validateParentStep2()) return;
    setErrors({});
    setStep(3);
  };

  const createParentAccount = async () => {
    setRootError(""); setLoading(true);
    try {
      const res = googleToken
        ? await googleSignUp(googleToken, {
            role: "PARENT",
            ...(phone.trim() ? { phone: phone.trim() } : {}),
          })
        : await signUp({
            password, role: "PARENT",
            email_id: parentEmailId.trim(),
            ...(parentOtpCode.trim() ? { otp_code: parentOtpCode.trim() } : {}),
            ...(phone.trim() ? { phone: phone.trim() } : {}),
          });
      await login(res);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace("/(parent)" as any);
    } catch (e: any) {
      setRootError(e.message || "Sign-up failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Progress bar — only show after role is selected */}
      {step > 1 && (
        <View style={styles.progress}>
          {Array.from({ length: totalSegments }).map((_, i) => (
            <View key={i} style={[styles.progressSeg, i < step - 1 && styles.progressOn]} />
          ))}
        </View>
      )}

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

        {step === 1 && (
          <Step1 selected={role} onSelect={selectRole} onLogin={() => router.replace("/sign-in")} />
        )}

        {step === 2 && role === "student" && (
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
            otpSent={studentOtpSent} otpCode={studentOtpCode} setOtpCode={setStudentOtpCode}
            otpLoading={studentOtpLoading} onSendOtp={handleStudentSendOtp}
            errors={errors} rootError={rootError} loading={loading}
            googleToken={googleToken} googleLoading={googleLoading} onGoogleAuth={handleGoogleAuth}
            onSubmit={createStudentAccount}
            onLogin={() => router.replace("/sign-in")}
          />
        )}

        {step === 2 && role === "parent" && (
          <Step2Parent
            back={() => setStep(1)}
            emailId={parentEmailId} setEmailId={setParentEmailId}
            password={password} setPassword={setPassword}
            confirm={confirm} setConfirm={setConfirm}
            showPw={showPw} setShowPw={setShowPw}
            otpSent={parentOtpSent} otpCode={parentOtpCode} setOtpCode={setParentOtpCode}
            otpLoading={parentOtpLoading} onSendOtp={handleParentSendOtp}
            errors={errors}
            googleToken={googleToken} googleLoading={googleLoading} onGoogleAuth={handleGoogleAuth}
            onContinue={continueParentToStep3}
            onLogin={() => router.replace("/sign-in")}
          />
        )}

        {step === 3 && role === "parent" && (
          <Step3Parent
            back={() => setStep(2)}
            phone={phone} setPhone={setPhone}
            rootError={rootError} loading={loading}
            onSubmit={createParentAccount}
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
        <RoleCard
          label="Student"
          selected={selected === "student"}
          onPress={() => onSelect("student")}
          art={<StudentArt />}
          artBg="#F1ECFF"
        />
        <RoleCard
          label="Parent"
          selected={selected === "parent"}
          onPress={() => onSelect("parent")}
          art={<ParentArt />}
          artBg="#EAF1FF"
        />
      </View>

      <LoginRow onLogin={onLogin} />
    </View>
  );
}

function RoleCard({
  label, selected, onPress, art, artBg,
}: { label: string; selected: boolean; onPress: () => void; art: React.ReactNode; artBg: string }) {
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
  googleToken: string | null; googleLoading: boolean; onGoogleAuth: () => void;
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

      {p.googleToken ? (
        <GoogleConnected />
      ) : (
        <>
          <GoogleAuthButton loading={p.googleLoading} onPress={p.onGoogleAuth} />
          <OrDivider />
        </>
      )}

      {/* Personal-email toggle — only for the standard (non-Google) flow */}
      {!p.googleToken && (
        <Pressable
          onPress={() => p.setHasPersonalEmail(!p.hasPersonalEmail)}
          style={styles.toggleRow}
        >
          <View style={[styles.toggleBox, p.hasPersonalEmail && styles.toggleBoxOn]}>
            {p.hasPersonalEmail && <Text style={styles.toggleTick}>✓</Text>}
          </View>
          <Text style={styles.toggleLabel}>I want to sign up with my personal email</Text>
        </Pressable>
      )}

      {p.googleToken ? (
        <Input label="Username (optional)" placeholder="e.g. creative_coder" value={p.username} onChange={p.setUsername} error={p.errors.username} />
      ) : p.hasPersonalEmail ? (
        <>
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
              error={p.errors.studentOtpCode}
            />
          )}

          <Input label="Username (optional)" placeholder="e.g. creative_coder" value={p.username} onChange={p.setUsername} error={p.errors.username} />
          <Input label="Parent or Guardian's Email (optional)" placeholder="parent@example.com" value={p.parentEmail} onChange={p.setParentEmail} error={p.errors.parentEmail} keyboardType="email-address" />
        </>
      ) : (
        <>
          <Input label="Choose a Username" placeholder="e.g. creative_coder" value={p.username} onChange={p.setUsername} error={p.errors.username} />
          <Input label="Parent or Guardian's Email" placeholder="parent@example.com" value={p.parentEmail} onChange={p.setParentEmail} error={p.errors.parentEmail} keyboardType="email-address" />
          <Text style={styles.helper}>Required for account confirmation. Your parent will receive an email to confirm and link accounts.</Text>
        </>
      )}

      {!p.googleToken && (
        <>
          <Input
            label="Password" placeholder="••••••••" value={p.password} onChange={p.setPassword}
            error={p.errors.password} secure={!p.showPw}
            rightToggle={{ on: p.showPw, onToggle: () => p.setShowPw(!p.showPw) }}
          />
          <Input label="Confirm Password" placeholder="••••••••" value={p.confirm} onChange={p.setConfirm} error={p.errors.confirm} secure />
        </>
      )}

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

/* ───────────────────────── STEP 2 — PARENT CREDENTIALS ─────────────────── */
function Step2Parent(p: {
  back: () => void;
  emailId: string; setEmailId: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  confirm: string; setConfirm: (v: string) => void;
  showPw: boolean; setShowPw: (v: boolean) => void;
  otpSent: boolean; otpCode: string; setOtpCode: (v: string) => void;
  otpLoading: boolean; onSendOtp: () => void;
  errors: Record<string, string>;
  googleToken: string | null; googleLoading: boolean; onGoogleAuth: () => void;
  onContinue: () => void;
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
          <Text style={styles.stepTitle}>Account Credentials</Text>
          <Text style={styles.stepEyebrow}>STEP 2 OF 3</Text>
        </View>
      </View>

      {p.googleToken ? (
        <GoogleConnected />
      ) : (
        <>
          <GoogleAuthButton loading={p.googleLoading} onPress={p.onGoogleAuth} />
          <OrDivider />

          {/* Email + OTP */}
          <View style={{ marginTop: 16 }}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <View style={[styles.inputWrap, !!p.errors.parentEmailId && styles.inputWrapError, { paddingRight: 6 }]}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="you@example.com"
                placeholderTextColor="#0E1F2B40"
                value={p.emailId}
                onChangeText={p.setEmailId}
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
            {!!p.errors.parentEmailId && <Text style={styles.error}>{p.errors.parentEmailId}</Text>}
          </View>

          {p.otpSent && (
            <Input
              label="OTP CODE"
              placeholder="Enter the code from your email"
              value={p.otpCode}
              onChange={p.setOtpCode}
              error={p.errors.parentOtpCode}
            />
          )}

          <Input
            label="Password" placeholder="••••••••" value={p.password} onChange={p.setPassword}
            error={p.errors.password} secure={!p.showPw}
            rightToggle={{ on: p.showPw, onToggle: () => p.setShowPw(!p.showPw) }}
          />
          <Input label="Confirm Password" placeholder="••••••••" value={p.confirm} onChange={p.setConfirm} error={p.errors.confirm} secure />
        </>
      )}

      <Pressable
        style={({ pressed }) => [styles.submit, pressed && { opacity: 0.9 }]}
        onPress={p.onContinue}
      >
        <Text style={styles.submitText}>Continue</Text>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>

      <LoginRow onLogin={p.onLogin} />
    </View>
  );
}

/* ───────────────────────── STEP 3 — PARENT PROFILE ─────────────────────── */
function Step3Parent(p: {
  back: () => void;
  phone: string; setPhone: (v: string) => void;
  rootError: string; loading: boolean;
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
          <Text style={styles.stepTitle}>Complete Profile</Text>
          <Text style={styles.stepEyebrow}>STEP 3 OF 3</Text>
        </View>
      </View>

      <Input
        label="Phone Number (optional)"
        placeholder="e.g. +1 234 567 8900"
        value={p.phone}
        onChange={p.setPhone}
        keyboardType="phone-pad"
      />

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

/* ───────────────────────── SHARED UI ───────────────────────────────────── */
function Input({
  label, placeholder, value, onChange, error, secure, keyboardType, rightToggle,
}: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
  error?: string; secure?: boolean; keyboardType?: "email-address" | "phone-pad" | "default";
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
          keyboardType={keyboardType === "email-address" ? "email-address" : keyboardType === "phone-pad" ? "phone-pad" : "default"}
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

/* ── Google sign-up controls ── */
function GoogleAuthButton({ loading, onPress }: { loading: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.btnGoogle, pressed && { opacity: 0.85 }, loading && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={loading}
    >
      {loading
        ? <ActivityIndicator color={colors.navy} />
        : <>
            <GoogleMark />
            <Text style={styles.btnGoogleText}>Sign up with Google</Text>
          </>
      }
    </Pressable>
  );
}

function GoogleConnected() {
  return (
    <View style={styles.googleConnected}>
      <GoogleMark />
      <Text style={styles.googleConnectedText}>Connected with Google — just finish your details below.</Text>
    </View>
  );
}

function OrDivider() {
  return (
    <View style={styles.orRow}>
      <View style={styles.orLine} />
      <Text style={styles.orText}>or continue with</Text>
      <View style={styles.orLine} />
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

/* ── Role illustrations ── */
function StudentArt() {
  return (
    <Svg width={58} height={58} viewBox="0 0 420 420">
      <Path d="M165 180 Q165 140 210 140 Q255 140 255 180 L255 275 Q255 315 210 315 Q165 315 165 275 Z" fill="#22C55E" />
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
      <Path d="M150 180 Q150 140 210 140 Q270 140 270 180 L270 320 Q270 360 210 360 Q150 360 150 320 Z" fill="#2563EB" />
      <Circle cx="210" cy="120" r="60" fill="#F4C7A1" />
      <Path d="M150 120 Q170 40 210 55 Q255 40 270 120 Q240 90 210 95 Q180 90 150 120" fill="#111827" />
      <Circle cx="190" cy="120" r="5" fill="#111" />
      <Circle cx="230" cy="120" r="5" fill="#111" />
      <Path d="M190 145 Q210 165 230 145" stroke="#111" strokeWidth={4} fill="none" strokeLinecap="round" />
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

  btnGoogle: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9,
    height: 50, borderRadius: 12, backgroundColor: "#fff",
    borderWidth: 1, borderColor: navy15, marginTop: 18,
  },
  btnGoogleText: { color: "#1a1a1a", fontFamily: fonts.dmBold, fontSize: 14 },
  orRow:  { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18 },
  orLine: { flex: 1, height: 1, backgroundColor: navy15 },
  orText: { color: "#042e5c80", fontSize: 11, fontFamily: fonts.dm },
  googleConnected: {
    flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18,
    padding: 14, borderRadius: 12, backgroundColor: "#059F6D0d",
    borderWidth: 1, borderColor: "#059F6D33",
  },
  googleConnectedText: { flex: 1, color: colors.navy, fontFamily: fonts.dm, fontSize: 12, lineHeight: 17 },
});
