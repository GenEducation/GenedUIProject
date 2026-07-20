import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  ActivityIndicator, Image, Animated, Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import { colors, fonts } from "@/theme/tokens";
import { signUp, googleSignUp, sendOtp } from "@/services/authService";
import { signInWithGoogle, GoogleSignInCancelled } from "@/services/googleAuth";
import { useAuth } from "@/store/useAuthStore";
import { tutorialStore } from "@/store/useTutorialStore";
import { useLoaderStore } from "@/store/useLoaderStore";
import { RoleCarousel } from "@/components/auth/RoleCarousel";
import { AuthBackdrop } from "@/components/auth/AuthBackdrop";
import { Bouncy, Reveal, useReduceMotion } from "@/components/auth/motion";

const GENED_LOGO_WHITE = require("../assets/gened-logo-white.png");

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

  /* Entrance: logo → step head → sheet. */
  const intro = useRef([...Array(3)].map(() => new Animated.Value(0))).current;
  const reduceMotion = useReduceMotion();
  useEffect(() => {
    if (step === 1) return;
    if (reduceMotion) {
      intro.forEach((v) => v.setValue(1));
      return;
    }
    Animated.stagger(
      60,
      intro.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [step, intro, reduceMotion]);

  /* Direction for the step slide: forward = in from the right, back = from the left. */
  const prevStep = useRef(step);
  const slideDir = step >= prevStep.current ? 1 : -1;
  useEffect(() => { prevStep.current = step; }, [step]);

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
    useLoaderStore.getState().startLoading();
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
      useLoaderStore.getState().completeLoading();
      setTimeout(() => router.replace("/(tabs)"), 1200);
    } catch (e: any) {
      useLoaderStore.getState().stopLoading();
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
    useLoaderStore.getState().startLoading();
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
      useLoaderStore.getState().completeLoading();
      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace("/(parent)" as any);
      }, 1200);
    } catch (e: any) {
      useLoaderStore.getState().stopLoading();
      setRootError(e.message || "Sign-up failed. Please try again.");
    } finally { setLoading(false); }
  };

  // Step 1 is a full-bleed onboarding carousel with its own layout/status bar.
  if (step === 1) {
    return (
      <>
        <StatusBar style="light" />
        <RoleCarousel onSelect={selectRole} onSwitchToSignIn={() => router.replace("/sign-in")} />
      </>
    );
  }

  /* The step head now sits on the gradient, above the sheet — so its copy and
     back target live here rather than inside each step body. */
  const head =
    step === 3
      ? { title: "Complete Profile",    subtitle: "One last thing.",                    back: () => setStep(2) }
      : role === "parent"
      ? { title: "Account Credentials", subtitle: "Set up your login.",                 back: () => setStep(1) }
      : { title: "Student Details",     subtitle: "Almost there — set up your login.",  back: () => setStep(1) };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <AuthBackdrop />

      {/* Header stays pinned: the gradient reads through on long forms, and the
          step-back chip never scrolls out of reach. */}
      <Reveal anim={intro[0]} style={styles.headerPad}>
        <Image source={GENED_LOGO_WHITE} style={styles.brandLogo} resizeMode="contain" />
      </Reveal>

      <Reveal anim={intro[1]} style={styles.headerPad}>
        <View style={styles.stepHead}>
          <Pressable onPress={head.back} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="m15 6-6 6 6 6" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </Pressable>
          <StepFade stepKey={step} reduceMotion={reduceMotion}>
            <Text style={styles.stepTitle}>{head.title}</Text>
            <Text style={styles.stepSubtitle}>{head.subtitle}</Text>
          </StepFade>
        </View>
      </Reveal>

      {/* The sheet takes the remaining height and scrolls its own content. */}
      <Reveal anim={intro[2]} style={styles.sheetGrow}>
        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <StepSlide stepKey={step} direction={slideDir} reduceMotion={reduceMotion}>
              {step === 2 && role === "student" && (
                <Step2Student
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
                  phone={phone} setPhone={setPhone}
                  rootError={rootError} loading={loading}
                  onSubmit={createParentAccount}
                  onLogin={() => router.replace("/sign-in")}
                />
              )}
            </StepSlide>
          </ScrollView>
        </View>
      </Reveal>
    </View>
  );
}

/* ───────────────────────── MOTION HELPERS ─────────────────────────────── */

/** Grade choice chip — springs when it becomes the selection. */
function GradeChip({ grade, active, onPress }: { grade: number; active: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();
  const wasActive = useRef(active);

  useEffect(() => {
    // Pop only on the off→on transition, not on every re-render.
    if (active && !wasActive.current && !reduceMotion) {
      scale.setValue(0.9);
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 14,
      }).start();
    }
    wasActive.current = active;
  }, [active, reduceMotion, scale]);

  return (
    <Animated.View style={[styles.gradeCellWrap, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        style={[styles.gradeCell, active && styles.gradeCellOn]}
        accessibilityRole="radio"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`Grade ${grade}`}
      >
        <Text style={[styles.gradeText, active && styles.gradeTextOn]}>{grade}</Text>
      </Pressable>
    </Animated.View>
  );
}

/** Slides the form body in when the step changes. */
function StepSlide({ stepKey, direction, reduceMotion, children }: {
  stepKey: number;
  direction: number;
  reduceMotion: boolean;
  children: React.ReactNode;
}) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) { t.setValue(1); return; }
    t.setValue(0);
    Animated.timing(t, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [stepKey, reduceMotion, t]);

  const translateX = t.interpolate({
    inputRange: [0, 1],
    outputRange: [direction * 28, 0],
  });

  return (
    <Animated.View style={{ opacity: t, transform: [{ translateX }] }}>
      {children}
    </Animated.View>
  );
}

/** Crossfades the step title so it doesn't snap while the body slides. */
function StepFade({ stepKey, reduceMotion, children }: {
  stepKey: number;
  reduceMotion: boolean;
  children: React.ReactNode;
}) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) { t.setValue(1); return; }
    t.setValue(0);
    Animated.timing(t, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [stepKey, reduceMotion, t]);

  return <Animated.View style={{ opacity: t }}>{children}</Animated.View>;
}

/* ───────────────────────── STEP 2 — STUDENT DETAILS ───────────────────── */
function Step2Student(p: {
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
        <Input label="Pick a username (optional)" placeholder="e.g. creative_coder" value={p.username} onChange={p.setUsername} error={p.errors.username} icon="user" autoComplete="username" textContentType="username" />
      ) : p.hasPersonalEmail ? (
        <>
          <VerifyEmailField
            label="Your email"
            value={p.personalEmail}
            onChange={p.setPersonalEmail}
            error={p.errors.personalEmail}
            otpSent={p.otpSent}
            otpLoading={p.otpLoading}
            onSendOtp={p.onSendOtp}
          />

          {p.otpSent && (
            <Input
              label="Verification code"
              placeholder="Code from your email"
              value={p.otpCode}
              onChange={p.setOtpCode}
              error={p.errors.studentOtpCode}
              icon="key"
              keyboardType="number-pad"
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
            />
          )}

          <Input label="Pick a username (optional)" placeholder="e.g. creative_coder" value={p.username} onChange={p.setUsername} error={p.errors.username} icon="user" autoComplete="username" textContentType="username" />
          <Input label="Parent or guardian's email (optional)" placeholder="parent@example.com" value={p.parentEmail} onChange={p.setParentEmail} error={p.errors.parentEmail} keyboardType="email-address" icon="mail" autoComplete="email" textContentType="emailAddress" />
        </>
      ) : (
        <>
          <Input label="Pick a username" placeholder="e.g. creative_coder" value={p.username} onChange={p.setUsername} error={p.errors.username} icon="user" autoComplete="username" textContentType="username" />
          <Input label="Parent or guardian's email" placeholder="parent@example.com" value={p.parentEmail} onChange={p.setParentEmail} error={p.errors.parentEmail} keyboardType="email-address" icon="mail" autoComplete="email" textContentType="emailAddress" />
          <Text style={styles.helper}>We'll email your parent to confirm your account and link it to theirs.</Text>
        </>
      )}

      {!p.googleToken && (
        <>
          <Input
            label="Create a password" placeholder="At least 6 characters" value={p.password} onChange={p.setPassword}
            error={p.errors.password} secure={!p.showPw} icon="lock"
            autoComplete="new-password" textContentType="newPassword"
            rightToggle={{ on: p.showPw, onToggle: () => p.setShowPw(!p.showPw) }}
          />
          <Input label="Type it again" placeholder="Repeat your password" value={p.confirm} onChange={p.setConfirm} error={p.errors.confirm} secure icon="lock" autoComplete="new-password" textContentType="newPassword" returnKeyType="done" />
        </>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Which grade are you in?</Text>
        <View style={styles.gradeGrid}>
          {[3, 4, 5, 6, 7, 8].map((g) => (
            <GradeChip key={g} grade={g} active={p.grade === g} onPress={() => p.setGrade(g)} />
          ))}
        </View>
        {!!p.errors.grade && <Text style={styles.error}>{p.errors.grade}</Text>}
      </View>

      {!!p.rootError && (
        <View style={styles.rootErrBox}>
          <Text style={styles.rootErrText}>{p.rootError}</Text>
        </View>
      )}

      <Bouncy
        style={[styles.submit, p.loading && { opacity: 0.7 }]}
        onPress={p.onSubmit}
        disabled={p.loading}
      >
        {p.loading
          ? <ActivityIndicator color="#fff" />
          : <>
              <Text style={styles.submitText}>Create Account</Text>
              <ArrowRight />
            </>
        }
      </Bouncy>

      <LoginRow onLogin={p.onLogin} />
    </View>
  );
}

/* ───────────────────────── STEP 2 — PARENT CREDENTIALS ─────────────────── */
function Step2Parent(p: {
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
      {p.googleToken ? (
        <GoogleConnected />
      ) : (
        <>
          <GoogleAuthButton loading={p.googleLoading} onPress={p.onGoogleAuth} />
          <OrDivider />

          <VerifyEmailField
            label="Your email"
            value={p.emailId}
            onChange={p.setEmailId}
            error={p.errors.parentEmailId}
            otpSent={p.otpSent}
            otpLoading={p.otpLoading}
            onSendOtp={p.onSendOtp}
          />

          {p.otpSent && (
            <Input
              label="Verification code"
              placeholder="Code from your email"
              value={p.otpCode}
              onChange={p.setOtpCode}
              error={p.errors.parentOtpCode}
              icon="key"
              keyboardType="number-pad"
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
            />
          )}

          <Input
            label="Create a password" placeholder="At least 6 characters" value={p.password} onChange={p.setPassword}
            error={p.errors.password} secure={!p.showPw} icon="lock"
            autoComplete="new-password" textContentType="newPassword"
            rightToggle={{ on: p.showPw, onToggle: () => p.setShowPw(!p.showPw) }}
          />
          <Input label="Type it again" placeholder="Repeat your password" value={p.confirm} onChange={p.setConfirm} error={p.errors.confirm} secure icon="lock" autoComplete="new-password" textContentType="newPassword" returnKeyType="done" />
        </>
      )}

      <Bouncy style={styles.submit} onPress={p.onContinue}>
        <Text style={styles.submitText}>Continue</Text>
        <ArrowRight />
      </Bouncy>

      <LoginRow onLogin={p.onLogin} />
    </View>
  );
}

/* ───────────────────────── STEP 3 — PARENT PROFILE ─────────────────────── */
function Step3Parent(p: {
  phone: string; setPhone: (v: string) => void;
  rootError: string; loading: boolean;
  onSubmit: () => void;
  onLogin: () => void;
}) {
  return (
    <View>
      <Input
        label="Phone number (optional)"
        placeholder="e.g. +1 234 567 8900"
        value={p.phone}
        onChange={p.setPhone}
        keyboardType="phone-pad"
        icon="phone"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="done"
      />

      {!!p.rootError && (
        <View style={styles.rootErrBox}>
          <Text style={styles.rootErrText}>{p.rootError}</Text>
        </View>
      )}

      <Bouncy
        style={[styles.submit, p.loading && { opacity: 0.7 }]}
        onPress={p.onSubmit}
        disabled={p.loading}
      >
        {p.loading
          ? <ActivityIndicator color="#fff" />
          : <>
              <Text style={styles.submitText}>Create Account</Text>
              <ArrowRight />
            </>
        }
      </Bouncy>

      <LoginRow onLogin={p.onLogin} />
    </View>
  );
}

/* ───────────────────────── SHARED UI ───────────────────────────────────── */

type FieldIcon = "user" | "mail" | "lock" | "phone" | "key";

/** Leading glyph — mirrors the icon set on the sign-in screen. */
function LeadIcon({ icon, active }: { icon: FieldIcon; active: boolean }) {
  const stroke = active ? colors.emerald : "#8A94B8";
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
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
      ) : icon === "phone" ? (
        <Path
          d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.5a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"
          stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
        />
      ) : icon === "key" ? (
        <>
          <Path d="M15 7a4 4 0 1 1-4 4" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" />
          <Path d="M11 11 3 19v2h3v-2h2v-2h2l1-1" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <Path d="M4 10h16v10H4z" stroke={stroke} strokeWidth={1.6} />
          <Path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={stroke} strokeWidth={1.6} />
        </>
      )}
    </Svg>
  );
}

/** Email field with the inline "Verify" OTP trigger. */
function VerifyEmailField({
  label, value, onChange, error, otpSent, otpLoading, onSendOtp,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  otpSent: boolean;
  otpLoading: boolean;
  onSendOtp: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[
        styles.inputWrap,
        focused && styles.inputWrapFocused,
        !!error && styles.inputWrapError,
        { paddingRight: 6 },
      ]}>
        <LeadIcon icon="mail" active={focused} />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="you@example.com"
          placeholderTextColor="#9AA3C0"
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <Pressable
          onPress={onSendOtp}
          disabled={otpLoading || otpSent}
          style={[styles.verifyBtn, (otpLoading || otpSent) && { opacity: 0.5 }]}
        >
          {otpLoading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.verifyBtnText}>{otpSent ? "Sent ✓" : "Verify"}</Text>
          }
        </Pressable>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function Input({
  label, placeholder, value, onChange, error, secure, keyboardType, rightToggle,
  icon = "user", autoComplete, textContentType, returnKeyType = "next",
}: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
  error?: string; secure?: boolean; keyboardType?: "email-address" | "phone-pad" | "number-pad" | "default";
  rightToggle?: { on: boolean; onToggle: () => void };
  icon?: FieldIcon;
  autoComplete?: React.ComponentProps<typeof TextInput>["autoComplete"];
  textContentType?: React.ComponentProps<typeof TextInput>["textContentType"];
  returnKeyType?: React.ComponentProps<typeof TextInput>["returnKeyType"];
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused, !!error && styles.inputWrapError]}>
        <LeadIcon icon={icon} active={focused} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9AA3C0"
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secure}
          keyboardType={
            keyboardType === "email-address" ? "email-address"
            : keyboardType === "phone-pad" ? "phone-pad"
            : keyboardType === "number-pad" ? "number-pad"
            : "default"
          }
          autoCapitalize="none"
          autoComplete={autoComplete}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
        />
        {rightToggle && (
          <Pressable onPress={rightToggle.onToggle} hitSlop={10} accessibilityRole="button" accessibilityLabel={rightToggle.on ? "Hide password" : "Show password"}>
            <EyeIcon off={!rightToggle.on} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function ArrowRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      {off ? (
        <>
          <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07A3 3 0 1 1 9.88 9.88" stroke={colors.emerald} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M6.61 6.61A18.5 18.5 0 0 0 2 12s3 8 10 8a9.12 9.12 0 0 0 5.39-1.61M2 2l20 20" stroke={colors.emerald} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <Path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" stroke={colors.emerald} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke={colors.emerald} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </Svg>
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
    <Bouncy
      style={[styles.btnGoogle, loading && { opacity: 0.7 }]}
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
    </Bouncy>
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

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Header zone — sits on the gradient. */
  headerPad: { paddingHorizontal: 22 },
  brandLogo: { width: 128, height: 26, marginTop: 20 },

  stepHead: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 22, marginBottom: 22 },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center", justifyContent: "center",
  },
  stepTitle: { fontFamily: fonts.nunito, fontSize: 26, color: "#fff" },
  stepSubtitle: { fontFamily: fonts.dm, fontSize: 13, color: "rgba(255,255,255,0.72)", marginTop: 3 },

  /* White sheet — the form keeps light-theme ergonomics. */
  sheetGrow: { flex: 1 },
  sheet: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingTop: 6,
    overflow: "hidden",
    shadowColor: "#02123A",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },

  /* Vertical rhythm: fields 18 apart, section breaks 28. */
  fieldGroup: { marginTop: 18 },
  section: { marginTop: 28 },

  label: { fontFamily: fonts.dmMedium, fontSize: 13, color: colors.text, marginBottom: 8 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1.5, borderColor: "transparent", backgroundColor: "#F1F3FA",
    borderRadius: 18, paddingHorizontal: 16, height: 56,
  },
  inputWrapFocused: { borderColor: colors.emerald, backgroundColor: "#fff" },
  inputWrapError: { borderColor: "#fb7185", backgroundColor: "#fff1f2" },
  input: { flex: 1, fontFamily: fonts.dm, fontSize: 15, color: "#0E1F2B" },
  helper: { fontFamily: fonts.dm, fontSize: 12, color: "#5A6B8C", marginTop: 8, lineHeight: 17 },
  error: { color: "#e11d48", fontSize: 12, fontFamily: fonts.dmMedium, marginTop: 6 },

  gradeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  /* 30% (not 31+) guarantees exactly 3 per row: 4 never fits at any width, and
     3 still fits on a 320dp screen. Six grades then split evenly 3+3. */
  gradeCellWrap: { width: "30%", flexGrow: 1 },
  gradeCell: {
    height: 52, borderRadius: 16, backgroundColor: "#F1F3FA",
    borderWidth: 1.5, borderColor: "transparent",
    alignItems: "center", justifyContent: "center",
  },
  gradeCellOn: { backgroundColor: "#4C51E0", borderColor: "#fff" },
  gradeText: { fontFamily: fonts.nunitoBold, fontSize: 16, color: "#3E4A78" },
  gradeTextOn: { color: "#fff" },

  submit: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 56, borderRadius: 18, backgroundColor: colors.emerald, marginTop: 28,
    shadowColor: "#02150E", shadowOpacity: 0.28, shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  submitText: { color: "#fff", fontFamily: fonts.nunitoBold, fontSize: 16 },

  loginRow: { textAlign: "center", fontFamily: fonts.dm, fontSize: 12, color: "#2D3E5166", marginTop: 24 },
  loginLink: { color: colors.emerald, fontFamily: fonts.dmBold },
  rootErrBox: { marginTop: 10, padding: 14, borderRadius: 14, backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecdd3" },
  rootErrText: { fontFamily: fonts.dmBold, fontSize: 13, color: "#be123c" },

  toggleRow: {
    flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20,
    backgroundColor: "#F1F3FA", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
  },
  toggleBox: {
    width: 22, height: 22, borderRadius: 7,
    borderWidth: 1.5, borderColor: "#C3CADF",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff",
  },
  toggleBoxOn: { backgroundColor: colors.emerald, borderColor: colors.emerald },
  toggleTick: { color: "#fff", fontSize: 11, fontFamily: fonts.dmBold },
  toggleLabel: { fontFamily: fonts.dm, fontSize: 13, color: colors.text, flex: 1 },

  verifyBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, backgroundColor: colors.emerald,
    alignItems: "center", justifyContent: "center",
    minWidth: 62,
  },
  verifyBtnText: { color: "#fff", fontFamily: fonts.dmBold, fontSize: 11 },

  btnGoogle: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9,
    height: 56, borderRadius: 18, backgroundColor: "#fff",
    borderWidth: 1.5, borderColor: "#E2E6F2", marginTop: 20,
  },
  btnGoogleText: { color: "#1a1a1a", fontFamily: fonts.dmBold, fontSize: 15 },
  orRow:  { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20 },
  orLine: { flex: 1, height: 1, backgroundColor: "#E2E6F2" },
  orText: { color: "#7C87A6", fontSize: 12, fontFamily: fonts.dm },
  googleConnected: {
    flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20,
    padding: 14, borderRadius: 14, backgroundColor: "#059F6D0d",
    borderWidth: 1, borderColor: "#059F6D33",
  },
  googleConnectedText: { flex: 1, color: colors.navy, fontFamily: fonts.dm, fontSize: 13, lineHeight: 18 },
});
