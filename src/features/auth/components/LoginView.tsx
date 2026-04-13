"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { SignIn } from "./SignIn";
import { SignUp } from "./SignUp";
import { AuthHeader } from "./AuthHeader";
import { AuthHero } from "./AuthHero";
import { AuthFeatures } from "./AuthFeatures";
import { AuthFooter } from "./AuthFooter";
import { signIn, signUp, SignUpFields } from "../authService";
import { useStudentStore } from "@/features/student/store/useStudentStore";

interface LoginViewProps {
  onLogin: (role: "student" | "parent" | "partner") => void;
}

const initialSignUpData: SignUpFields = {
  username: "",
  email: "",
  password: "",
  role: "student",
  age: "",
  grade: "",
  school_board: "",
  partner_id: "",
  phone: "",
  organization: "",
  website: "",
};

export function LoginView({ onLogin }: LoginViewProps) {
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

  const validateSignIn = () => {
    const errors: Record<string, string> = {};
    if (!loginData.username.trim()) errors.username = "Username is compulsory";
    if (!loginData.password.trim()) errors.password = "Password is compulsory";
    return errors;
  };

  const validateSignUp = () => {
    const errors: Record<string, string> = {};
    if (!signupData.username.trim()) errors.username = "Username is compulsory";
    if (!signupData.email.trim()) errors.email = "Email is compulsory";
    if (!signupData.password.trim()) errors.password = "Password is compulsory";

    if (signupData.role === "student") {
      if (!signupData.age?.trim()) errors.age = "Age is compulsory";
      if (!signupData.grade?.trim()) errors.grade = "Grade is compulsory";
      if (!signupData.school_board?.trim()) errors.school_board = "Board is compulsory";
    } else if (signupData.role === "parent") {
      if (!signupData.phone?.trim()) errors.phone = "Phone is compulsory";
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
      // Persist user_id for partner API calls
      if (token.user_id) {
        localStorage.setItem("gened_partner_id", token.user_id);
      }
      const normalizedRole = token.role?.toLowerCase() ?? "student";
      const role =
        normalizedRole === "student" ||
        normalizedRole === "partner" ||
        normalizedRole === "parent"
          ? normalizedRole
          : ("student" as const);

      // Persist student profile into the student store
      if (role === "student") {
        useStudentStore.getState().setStudentProfile({
          user_id: token.user_id,
          username: token.username,
          email: token.email,
          role: token.role,
          grade: token.grade,
          school_board: token.school_board,
        });
      }

      onLogin(role);
    } catch (error) {
      let msg = error instanceof Error ? error.message : "Unable to complete signin.";
      
      // Try to parse the error message if it's JSON from the backend
      try {
        const parsed = JSON.parse(msg);
        if (parsed.detail) {
          msg = typeof parsed.detail === "string" ? parsed.detail : JSON.stringify(parsed.detail);
        }
      } catch (e) {
        // Not a JSON string, keep original message
      }

      const lowMsg = msg.toLowerCase();
      const mappedErrors: Record<string, string> = {};
      
      if (lowMsg.includes("password")) {
        mappedErrors.password = msg;
      } else if (lowMsg.includes("username") || lowMsg.includes("user") || lowMsg.includes("credentials") || lowMsg.includes("invalid")) {
        mappedErrors.username = msg;
      } else {
        mappedErrors.username = msg;
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
      await signUp(signupData);
      
      // Force user to sign in manually per requirements
      setSignupSuccessMessage("Account created successfully! Please sign in to access your dashboard.");
      setLoginData((prev) => ({ ...prev, username: signupData.username, password: "" }));
      setSignupData(initialSignUpData);
      setIsSignUp(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unable to complete signup.";
      const lowMsg = msg.toLowerCase();

      const mappedErrors: Record<string, string> = {};
      if (lowMsg.includes("email already used") || lowMsg.includes("email")) {
        mappedErrors.email = msg;
      } else if (lowMsg.includes("username")) {
        mappedErrors.username = msg;
      } else {
        mappedErrors.root = "Please try again later";
      }
      setSignupErrors(mappedErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSignUp = () => {
      setSignupSuccessMessage("");
      setIsSignUp((current) => !current);
  };

  const handleLoginChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setLoginData((current) => ({ ...current, [name]: value }));
  };

  const handleSignupChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setSignupData((current) => ({ ...current, [name]: value }));
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#F7F6F1] text-[#0E1F2B] font-sans selection:bg-[#2D5540]/20 selection:text-[#0E1F2B]">
      <AuthHeader />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex items-center justify-center px-6 pb-12 lg:px-16">
        <div className="w-full max-w-7xl rounded-[3rem] bg-white shadow-[0_40px_100px_rgba(45,85,64,0.08)] overflow-hidden grid grid-cols-1 lg:grid-cols-2 border border-[#2D5540]/5">
          <AuthHero />

          <section className="p-8 sm:p-10 lg:p-14 flex items-center justify-center bg-white relative">
            {/* Subtle decorative background element */}
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#2D5540]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
              <div className="mb-10 text-center lg:text-left">
                <h2 className="text-3xl lg:text-4xl font-extrabold text-[#042e5c] tracking-tight">
                  {isSignUp ? "Create account" : "Welcome back"}
                </h2>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.25em] text-[#042e5c]/60">
                  {isSignUp
                    ? "Forge your scholarly identity"
                    : "Please sign in to your archive"}
                </p>
                {signupSuccessMessage && !isSignUp && (
                  <div className="mt-6 p-4 bg-[#bce4cc]/30 border border-[#2d6a4a]/20 rounded-2xl animate-fade-in">
                    <p className="text-sm font-bold text-[#2d6a4a] text-center tracking-tight">
                      {signupSuccessMessage}
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
                />
              ) : (
                <SignIn
                  loginData={loginData}
                  onChange={handleLoginChange}
                  onSubmit={handlePrototypeLogin}
                  onSwitchToSignup={toggleSignUp}
                  isSigningIn={isSigningIn}
                  errors={signinErrors}
                />
              )}
            </div>
          </section>
        </div>
      </div>
      <AuthFeatures />
      <AuthFooter />
    </div>
  );
}