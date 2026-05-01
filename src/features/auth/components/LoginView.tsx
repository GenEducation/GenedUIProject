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

const initialSignUpData: SignUpFields = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "student",
  age: "",
  grade: "",
  school_board: "",
  phone: "",
  organization: "",
  website: "",
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
    if (!loginData.username.trim()) errors.username = "A username is required to identify your archive.";
    if (!loginData.password.trim()) {
      errors.password = "A passphrase is required to access the sanctuary.";
    } else if (loginData.password.length < 6) {
      errors.password = "Your passphrase must contain at least 6 characters.";
    }
    return errors;
  };

  const validateSignUp = () => {
    const errors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!googleSignUpToken) {
      if (!signupData.username.trim()) {
        errors.username = "Username is compulsory";
      } else if (signupData.username.length < 3) {
        errors.username = "Username must be at least 3 characters";
      }

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

    if (signupData.role === "student") {
      const ageNum = Number(signupData.age);
      if (!signupData.age?.trim()) {
        errors.age = "Age is compulsory";
      } else if (isNaN(ageNum)) {
        errors.age = "Age must be a numeric value";
      } else if (ageNum <= 0) {
        errors.age = "Age must be a positive number";
      } else if (ageNum > 50) {
        errors.age = "Age must be 50 or less";
      }

      const gradeNum = Number(signupData.grade);
      if (!signupData.grade?.trim()) {
        errors.grade = "Grade is compulsory";
      } else if (isNaN(gradeNum)) {
        errors.grade = "Grade must be a numeric value";
      } else if (gradeNum <= 0) {
        errors.grade = "Grade must be a positive number";
      } else if (gradeNum > 12) {
        errors.grade = "Grade must be 12 or less";
      }

      if (!signupData.school_board?.trim()) errors.school_board = "Board is compulsory";
    } else if (signupData.role === "parent") {
      if (!signupData.phone?.trim()) {
        errors.phone = "Phone is compulsory";
      } else if (!/^\d{10}$/.test(signupData.phone.trim())) {
        errors.phone = "Phone must be a 10-digit number";
      }
    } else if (signupData.role === "partner") {
      if (!signupData.organization?.trim()) errors.organization = "Organization is compulsory";
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

    try {
      const token = await signIn(loginData);
      
      // Persist auth state
      localStorage.setItem("gened_auth_token", token.access_token);
      localStorage.setItem("gened_user_profile", JSON.stringify(token));
      
      const normalizedRole = token.role?.toLowerCase() ?? "student";
      const role =
        normalizedRole === "student" ||
        normalizedRole === "partner" ||
        normalizedRole === "parent"
          ? normalizedRole
          : ("student" as const);
      
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
          grade: token.grade,
          school_board: token.school_board,
        });
      } else if (role === "parent") {
        useParentStore.getState().setParentProfile({
          user_id: token.user_id || "",
          username: token.username || "",
          email: token.email || "",
          role: token.role || "parent",
        });
      }

      router.push(`/${role}`);
    } catch (error) {
      let rawMsg = error instanceof Error ? error.message : "Unable to complete signin.";
      console.error("Detailed Signin Error:", rawMsg);

      const lowMsg = rawMsg.toLowerCase();
      const mappedErrors: Record<string, string> = {};
      
      if (lowMsg.includes("password")) {
        mappedErrors.password = "The password you entered is incorrect.";
      } else if (lowMsg.includes("username") || lowMsg.includes("user") || lowMsg.includes("credentials") || lowMsg.includes("invalid")) {
        mappedErrors.username = "Invalid username or password.";
      } else {
        mappedErrors.username = "Sign-in failed. Please try again later.";
      }
      setSigninErrors(mappedErrors);
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

    try {
      if (googleSignUpToken) {
        const { googleSignUp } = await import("../authService");
        await googleSignUp(googleSignUpToken, signupData);
      } else {
        await signUp(signupData);
      }
      
      // Clear any previous signin errors when coming from a successful signup
      setSigninErrors({});
      
      // Force user to sign in manually per requirements
      setSignupSuccessMessage("Account created successfully! Please sign in to access your dashboard.");
      setLoginData((prev) => ({ ...prev, username: googleSignUpToken ? "" : signupData.username, password: "" }));
      setSignupData(initialSignUpData);
      setGoogleSignUpToken(null);
      setIsSignUp(false);
    } catch (error) {
      let rawMsg = error instanceof Error ? error.message : "Unable to complete signup.";
      console.error("Detailed Signup Error:", rawMsg);

      const lowMsg = rawMsg.toLowerCase();
      const mappedErrors: Record<string, string> = {};
      
      if (lowMsg.includes("email already used") || lowMsg.includes("email")) {
        mappedErrors.email = "This email address is already in use.";
      } else if (lowMsg.includes("username")) {
        mappedErrors.username = "This username is already taken.";
      } else if (lowMsg.includes("token") || lowMsg.includes("google")) {
        mappedErrors.root = "Google authentication failed. Please try again or use standard registration.";
      } else {
        mappedErrors.root = "Registration failed. Please check your information and try again.";
      }
      setSignupErrors(mappedErrors);
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
    
    // Clear error for this field when user starts typing
    if (signinErrors[name]) {
      setSigninErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSignupChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setSignupData((current) => ({ ...current, [name]: value }));
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
                      ? "Forge your scholarly identity"
                      : "Please sign in to your archive"}
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
                        
                        const normalizedRole = res.role?.toLowerCase() ?? "student";
                        const role =
                          normalizedRole === "student" ||
                          normalizedRole === "partner" ||
                          normalizedRole === "parent"
                            ? normalizedRole
                            : ("student" as const);
                        
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
                            grade: res.grade,
                            school_board: res.school_board,
                          });
                        } else if (role === "parent") {
                          useParentStore.getState().setParentProfile({
                            user_id: res.user_id || "",
                            username: res.username || "",
                            email: res.email || "",
                            role: res.role || "parent",
                          });
                        }

                        router.push(`/${role}`);
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