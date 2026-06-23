"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SignIn } from "./SignIn";
import { SignUp } from "./SignUp";
import { AuthHeader } from "./AuthHeader";
import { AuthHero } from "./AuthHero";
import { AuthFeatures } from "./AuthFeatures";
import { AuthFooter } from "./AuthFooter";
import { signIn, signUp, SignUpFields } from "../authService";
import { useStudentStore } from "@/features/student/store/useStudentStore";
import { useParentStore } from "@/features/parent/store/useParentStore";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useLoaderStore } from "@/stores/useLoaderStore";

const initialSignUpData: SignUpFields = {
  email: "",
  password: "",
  confirmPassword: "",
  role: "student",
  grade: "",
  phone: "",
  otp_code: "",
  parent_email: "",
};

export function LoginView() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });
  const [signupData, setSignupData] = useState<SignUpFields>(initialSignUpData);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});
  const [signinErrors, setSigninErrors] = useState<Record<string, string>>({});
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signupSuccessMessage, setSignupSuccessMessage] = useState("");
  const [googleSignUpToken, setGoogleSignUpToken] = useState<string | null>(null);

  const validateSignIn = () => {
    const errors: Record<string, string> = {};
    if (!loginData.username.trim()) errors.username = "A username is required to sign in.";
    if (!loginData.password.trim()) {
      errors.password = "A password is required to sign in.";
    } else if (loginData.password.length < 6) {
      errors.password = "Your password must contain at least 6 characters.";
    }
    return errors;
  };

  const validateSignUp = () => {
    const errors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (signupData.role === "student") {
      const hasPersonalEmail = !!signupData.email?.trim();

      if (hasPersonalEmail) {
        if (!emailRegex.test(signupData.email)) {
          errors.email = "Please enter a valid email address";
        }
        if (signupData.username?.trim() && signupData.username.trim().length < 3) {
          errors.username = "Username must be at least 3 characters";
        }
        if (signupData.parent_email?.trim() && !emailRegex.test(signupData.parent_email)) {
          errors.parent_email = "Please enter a valid parent email address";
        }
      } else {
        if (!signupData.username?.trim()) {
          errors.username = "Username is compulsory";
        } else if (signupData.username.trim().length < 3) {
          errors.username = "Username must be at least 3 characters";
        }

        if (!signupData.parent_email?.trim()) {
          errors.parent_email = "Parent or Guardian email is compulsory";
        } else if (!emailRegex.test(signupData.parent_email)) {
          errors.parent_email = "Please enter a valid parent email address";
        }
      }

      if (!signupData.password.trim()) {
        errors.password = "Password is compulsory";
      } else if (signupData.password.length < 6) {
        errors.password = "Password must be at least 6 characters";
      }

      if (!signupData.confirmPassword?.trim()) {
        errors.confirmPassword = "Confirm Password is compulsory";
      } else if (signupData.password !== signupData.confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }

      const gradeNum = Number(signupData.grade);
      if (!signupData.grade?.trim()) {
        errors.grade = "Please select your grade";
      } else if (isNaN(gradeNum) || gradeNum <= 0 || gradeNum > 12) {
        errors.grade = "Grade must be between 1 and 12";
      }
    } else {
      if (!googleSignUpToken) {
        if (!signupData.email.trim()) {
          errors.email = "Email is compulsory";
        } else if (!emailRegex.test(signupData.email)) {
          errors.email = "Please enter a valid email address";
        }

        if (!signupData.password.trim()) {
          errors.password = "Password is compulsory";
        } else if (signupData.password.length < 6) {
          errors.password = "Password must be at least 6 characters";
        }

        if (!signupData.confirmPassword?.trim()) {
          errors.confirmPassword = "Confirm Password is compulsory";
        } else if (signupData.password !== signupData.confirmPassword) {
          errors.confirmPassword = "Passwords do not match";
        }
      }

      if (signupData.role === "parent") {
        if (!signupData.phone?.trim()) {
          errors.phone = "Phone is compulsory";
        } else if (!/^\d{10}$/.test(signupData.phone.trim())) {
          errors.phone = "Phone must be a 10-digit number";
        }
      }
    }

    return errors;
  };

  const handlePrototypeLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSigninErrors({});

    const validationErrors = validateSignIn();
    if (Object.keys(validationErrors).length > 0) {
      setSigninErrors(validationErrors);
      return;
    }

    setIsSigningIn(true);
    useLoaderStore.getState().startLoading();

    try {
      const token = await signIn(loginData);
      
      // Persist auth state
      localStorage.setItem("gened_auth_token", token.access_token);
      localStorage.setItem("gened_user_profile", JSON.stringify(token));
      
      const normalizedRole = token.role?.toLowerCase();
      const KNOWN_ROLES = ["student", "partner", "parent", "admin", "teacher"] as const;
      type KnownRole = typeof KNOWN_ROLES[number];
      if (!normalizedRole || !KNOWN_ROLES.includes(normalizedRole as KnownRole)) {
        localStorage.removeItem("gened_auth_token");
        localStorage.removeItem("gened_user_profile");
        throw new Error(`Unrecognized account role: "${token.role}". Please contact support.`);
      }
      const role = normalizedRole as KnownRole;
      localStorage.setItem("gened_user_role", role);

      // Persist user-specific IDs for legacy support if needed
      if (role === "partner") {
        localStorage.setItem("gened_partner_id", token.user_id);
      }

      // Populate stores
      if (role === "student") {
        useStudentStore.getState().setStudentProfile({
          user_id: token.user_id,
          username: token.username,
          email: token.email,
          role: token.role,
          name: token.name,
          grade: token.grade,
          school_board: token.school_board,
          ai_name: token.ai_name,
          preferred_voice: token.preferred_voice,
          plan: token.plan,
          plan_expires_at: token.plan_expires_at,
        });
      } else if (role === "parent") {
        useParentStore.getState().setParentProfile({
          user_id: token.user_id || "",
          username: token.username || "",
          email: token.email || "",
          role: token.role || "parent",
        });
      }

      const redirectPath = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null;
      router.replace(redirectPath || `/${role}`);
    } catch (error) {
      useLoaderStore.getState().stopLoading();
      const rawMsg = error instanceof Error ? error.message : "Unable to complete signin.";
      console.error("Detailed Signin Error:", rawMsg);
      setSigninErrors({ root: rawMsg });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignupErrors({});

    const validationErrors = validateSignUp();
    if (Object.keys(validationErrors).length > 0) {
      setSignupErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    useLoaderStore.getState().startLoading();

    try {
      let authResponse;
      if (googleSignUpToken) {
        const { googleSignUp } = await import("../authService");
        authResponse = await googleSignUp(googleSignUpToken, signupData);
      } else {
        authResponse = await signUp(signupData);
      }
      
      // Persist auth state (same as sign-in)
      localStorage.setItem("gened_auth_token", authResponse.access_token);
      localStorage.setItem("gened_user_profile", JSON.stringify(authResponse));
      
      const normalizedRole = authResponse.role?.toLowerCase();
      const KNOWN_ROLES = ["student", "partner", "parent", "admin", "teacher"] as const;
      type KnownRole = typeof KNOWN_ROLES[number];
      if (!normalizedRole || !KNOWN_ROLES.includes(normalizedRole as KnownRole)) {
        localStorage.removeItem("gened_auth_token");
        localStorage.removeItem("gened_user_profile");
        throw new Error(`Unrecognized account role: "${authResponse.role}". Please contact support.`);
      }
      const role = normalizedRole as KnownRole;
      localStorage.setItem("gened_user_role", role);

      if (role === "partner") {
        localStorage.setItem("gened_partner_id", authResponse.user_id);
      }

      // Populate stores
      if (role === "student") {
        useStudentStore.getState().setStudentProfile({
          user_id: authResponse.user_id,
          username: authResponse.username,
          email: authResponse.email,
          role: authResponse.role,
          name: authResponse.name,
          grade: authResponse.grade,
          school_board: authResponse.school_board,
          age: authResponse.age,
          ai_name: authResponse.ai_name,
          preferred_voice: authResponse.preferred_voice,
          plan: authResponse.plan,
          plan_expires_at: authResponse.plan_expires_at,
        });
      }

      // Trigger tutorial walkthrough for new student signups
      if (role === "student") {
        const { useTutorialStore } = await import("@/features/tutorial/store/useTutorialStore");
        useTutorialStore.getState().startTutorial();
      }

      // Redirect immediately
      router.replace(`/${role}`);
    } catch (error) {
      useLoaderStore.getState().stopLoading();
      const rawMsg = error instanceof Error ? error.message : "Unable to complete signup.";
      console.error("Detailed Signup Error:", rawMsg);
      setSignupErrors({ root: rawMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSignUp = () => {
      setSignupSuccessMessage("");
      setSigninErrors({});
      setSignupErrors({});
      setGoogleSignUpToken(null);
      setIsSignUp((current) => !current);
  };

  const handleLoginChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setLoginData((current) => ({ ...current, [name]: value }));
    
    // Clear field-specific error and root error when user starts typing
    setSigninErrors((prev) => {
      if (!prev[name] && !prev.root) return prev;
      const newErrors = { ...prev };
      delete newErrors[name];
      delete newErrors.root;
      return newErrors;
    });
  };

  const handleSignupChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setSignupData((current) => ({ ...current, [name]: value }));

    // Clear field-specific error and root error when user starts typing
    setSignupErrors((prev) => {
      if (!prev[name] && !prev.root) return prev;
      const newErrors = { ...prev };
      delete newErrors[name];
      delete newErrors.root;
      return newErrors;
    });
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
      <div className="min-h-screen w-full flex flex-col bg-white text-[#0E1F2B] font-sans selection:bg-[#059F6D]/15 selection:text-[#0E1F2B]">
        <AuthHeader />

        {/* MAIN CONTENT */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12 lg:px-16">
          <div className="w-full max-w-7xl rounded-[3rem] bg-white shadow-[0_40px_100px_rgba(45,85,64,0.08)] overflow-hidden grid grid-cols-1 lg:grid-cols-2 border border-[#2D5540]/5">
            <AuthHero />

            <section className="p-8 sm:p-10 lg:p-14 flex items-center justify-center bg-white relative">
              {/* Emerald ambient glow */}
              <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#059F6D]/5 rounded-full blur-3xl pointer-events-none" />

              <div className="w-full max-w-md relative z-10">
                <div className="mb-10 text-center lg:text-left">
                  <h2 className="text-3xl lg:text-4xl font-extrabold text-[#042e5c] tracking-tight font-serif">
                    {isSignUp ? "Create account" : <><em>Welcome</em> back</>}
                  </h2>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.25em] text-[#042e5c]/60">
                    {isSignUp
                      ? "Safe, guided learning begins here"
                      : "Pick up where you left off"}
                  </p>
                  {signupSuccessMessage && !isSignUp && (
                    <div className="mt-6 p-4 bg-[#059F6D]/8 border border-[#059F6D]/20 rounded-xl animate-fade-in">
                      <p className="text-sm font-semibold text-[#047a54] text-center tracking-tight">
                        {signupSuccessMessage}
                      </p>
                    </div>
                  )}
                  {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("error") === "unauthorized" && !isSignUp && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl animate-bounce-subtle">
                      <p className="text-sm font-semibold text-red-600 text-center tracking-tight">
                        Access Denied: You do not have permission to view this data.
                      </p>
                    </div>
                  )}
                </div>

                {isSignUp ? (
                  <SignUp
                    signupData={signupData}
                    onChange={handleSignupChange}
                    onSubmit={handleSignUp}
                    onSwitchToSignin={toggleSignUp}
                    isSubmitting={isSubmitting}
                    errors={signupErrors}
                    onGoogleSuccess={(token) => {
                      setGoogleSignUpToken(token);
                    }}
                  />
                ) : (
                  <SignIn
                    loginData={loginData}
                    onChange={handleLoginChange}
                    onSubmit={handlePrototypeLogin}
                    onSwitchToSignup={toggleSignUp}
                    isSigningIn={isSigningIn}
                    errors={signinErrors}
                    onGoogleSuccess={async (token) => {
                      setSigninErrors({});
                      setIsSigningIn(true);
                      try {
                        const { googleSignIn } = await import("../authService");
                        const res = await googleSignIn(token);
                        // Persist auth state
                        localStorage.setItem("gened_auth_token", res.access_token);
                        localStorage.setItem("gened_user_profile", JSON.stringify(res));
                        
                        const normalizedRole = res.role?.toLowerCase();
                        const KNOWN_ROLES = ["student", "partner", "parent", "admin", "teacher"] as const;
                        type KnownRole = typeof KNOWN_ROLES[number];
                        if (!normalizedRole || !KNOWN_ROLES.includes(normalizedRole as KnownRole)) {
                          localStorage.removeItem("gened_auth_token");
                          localStorage.removeItem("gened_user_profile");
                          throw new Error(`Unrecognized account role: "${res.role}". Please contact support.`);
                        }
                        const role = normalizedRole as KnownRole;
                        localStorage.setItem("gened_user_role", role);

                        // Persist user-specific IDs for legacy support if needed
                        if (role === "partner") {
                          localStorage.setItem("gened_partner_id", res.user_id);
                        }

                        // Populate stores
                        if (role === "student") {
                          useStudentStore.getState().setStudentProfile({
                            user_id: res.user_id,
                            username: res.username,
                            email: res.email,
                            role: res.role,
                            name: res.name,
                            grade: res.grade,
                            school_board: res.school_board,
                            ai_name: res.ai_name,
                            preferred_voice: res.preferred_voice,
                          });
                        } else if (role === "parent") {
                          useParentStore.getState().setParentProfile({
                            user_id: res.user_id || "",
                            username: res.username || "",
                            email: res.email || "",
                            role: res.role || "parent",
                          });
                        }

                        const redirectPath = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null;
                        router.push(redirectPath || `/${role}`);
                      } catch (err: any) {
                        console.error("Detailed Google Sign-in Error:", err.message);
                        setSigninErrors({ root: "Google Sign-In failed. Please try again or use your username/password." });
                      } finally {
                        setIsSigningIn(false);
                      }
                    }}
                  />
                )}
              </div>
            </section>
          </div>
        </div>
        <AuthFeatures />
        <AuthFooter />
      </div>
    </GoogleOAuthProvider>
  );
}