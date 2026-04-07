"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { SignIn } from "./SignIn";
import { SignUp } from "./SignUp";
import { signIn, signUp, SignUpFields } from "../authService";

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
    email: "",
    password: "",
  });
  const [signupData, setSignupData] = useState<SignUpFields>(initialSignUpData);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [signinError, setSigninError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handlePrototypeLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSigninError("");
    setIsSigningIn(true);

    try {
      const token = await signIn(loginData);
      const normalizedRole = token.role?.toLowerCase() ?? "student";
      const role =
        normalizedRole === "student" ||
        normalizedRole === "partner" ||
        normalizedRole === "parent"
          ? normalizedRole
          : ("student" as const);
      onLogin(role);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to complete signin.";
      setSigninError(message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handlePartnerLogin = () => {
    onLogin("partner");
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignupError("");
    setIsSubmitting(true);

    try {
      const token = await signUp(signupData);
      const normalizedRole = token.role?.toLowerCase() ?? signupData.role;
      const role =
        normalizedRole === "student" ||
        normalizedRole === "parent" ||
        normalizedRole === "partner"
          ? normalizedRole
          : signupData.role;
      onLogin(role);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to complete signup.";
      setSignupError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSignUp = () => {
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
      <header className="flex items-center justify-between px-8 py-6 lg:px-16 lg:py-8">
        <div className="flex items-center gap-3">
          <img src="/Logo.svg" alt="GenEd" className="h-6 w-auto" />
        </div>

        <button
          onClick={handlePartnerLogin}
          className="rounded-full border border-[#2D5540]/15 bg-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-[#2D5540] shadow-sm transition-all hover:bg-[#f3f8f2] hover:shadow-md active:scale-95"
        >
          Partner Portal
        </button>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex items-center justify-center px-6 pb-12 lg:px-16">
        <div className="w-full max-w-7xl rounded-[3rem] bg-white shadow-[0_40px_100px_rgba(45,85,64,0.08)] overflow-hidden grid grid-cols-1 lg:grid-cols-2 border border-[#2D5540]/5">
          <section className="relative bg-[#F2F2E9] p-10 lg:p-14 flex flex-col justify-between gap-10 min-h-[650px] overflow-hidden">
            {/* Subtle decorative background element */}
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#2D5540]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-8 relative z-10 flex flex-col items-center lg:items-start">
              <div className="flex justify-center lg:justify-start w-full">
                <div
                  className="rounded-full bg-white/95 p-4 shadow-xl shadow-[#0E1F2B]/10 ring-1 ring-[#2D5540]/10"
                  style={{ animation: "faviconRotate 3s ease-in-out infinite" }}
                >
                  <img
                    src="/favicon1.jpg"
                    alt="GenEd favicon"
                    className="h-28 w-28 rounded-full object-cover"
                  />
                </div>
              </div>

              <div className="space-y-4 relative z-10 mx-auto lg:mx-0 text-left max-w-md">
                <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0E1F2B] leading-[1.05]">
                  <span className="block">Step into</span>
                  <span className="block">your Scholarly</span>
                  <span className="block bg-gradient-to-r from-[#2D5540] via-[#50B4A8] to-[#4EB6BF] text-transparent bg-clip-text">
                    Sanctuary
                  </span>
                </h1>
                <p className="mt-3 text-lg font-semibold leading-relaxed text-[#2D3E51]/82 text-center lg:text-left">
                  An AI powered teacher with both voice and chat assistant.
                </p>
              </div>
            </div>
          </section>

          <section className="p-8 sm:p-10 lg:p-14 flex items-center justify-center bg-white relative">
            {/* Subtle decorative background element */}
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#2D5540]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
              <div className="mb-10 text-center lg:text-left">
                <h2 className="text-3xl lg:text-4xl font-extrabold text-[#0E1F2B] tracking-tight">
                  {isSignUp ? "Create account" : "Welcome back"}
                </h2>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.25em] text-[#2D5540]/60">
                  {isSignUp
                    ? "Forge your scholarly identity"
                    : "Please sign in to your archive"}
                </p>
              </div>

              {isSignUp ? (
                <SignUp
                  signupData={signupData}
                  onChange={handleSignupChange}
                  onSubmit={handleSignUp}
                  onSwitchToSignin={toggleSignUp}
                  isSubmitting={isSubmitting}
                  error={signupError}
                />
              ) : (
                <SignIn
                  loginData={loginData}
                  onChange={handleLoginChange}
                  onSubmit={handlePrototypeLogin}
                  onSwitchToSignup={toggleSignUp}
                  isSigningIn={isSigningIn}
                  error={signinError}
                />
              )}
            </div>
          </section>
        </div>
      </div>

      {/* FEATURES SECTION */}
      <section className="bg-[#F2F2E9] px-6 py-16 lg:px-16 lg:py-24 border-t border-[#2D5540]/5">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#2D5540]">
              The Framework
            </p>
            <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-[#0E1F2B]">
              Services built for modern learning ecosystems
            </h2>
          </div>

          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-md">
                <div className="absolute inset-0 bg-[#2D5540] rounded-[3rem] rotate-3 opacity-10 blur-sm transform transition-transform group-hover:rotate-6"></div>
                <img
                  src="/robo.png"
                  alt="Ecosystem architecture"
                  className="relative w-full rounded-[3rem] object-cover shadow-2xl shadow-[#0E1F2B]/10 border-4 border-white"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  title: "Adaptive learning",
                  desc: "Personalized paths that adjust to each student’s unique pace and mastery.",
                },
                {
                  title: "Partner onboarding",
                  desc: "Fast curriculum ingestion, version control, and workflow automation.",
                },
                {
                  title: "Progress visibility",
                  desc: "Real-time dashboards for students, parents, and educators to monitor growth.",
                },
                {
                  title: "Insight analytics",
                  desc: "Actionable learning data and heatmaps designed to reveal opportunities.",
                },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="group rounded-[2rem] border border-[#2D5540]/10 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-[#2D5540]/5 hover:border-[#2D5540]/20"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#F2F2E9] mb-5 flex items-center justify-center text-[#2D5540] group-hover:scale-110 transition-transform">
                    <div className="w-4 h-4 bg-[#2D5540] rounded-sm opacity-80" />
                  </div>
                  <h3 className="text-base font-bold text-[#0E1F2B]">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#2D3E51]/70 font-medium">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes faviconRotate {
          0%,
          100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-15deg);
          }
          75% {
            transform: rotate(15deg);
          }
        }
      `}</style>

      {/* FOOTER */}
      <footer className="bg-[#0E1F2B] text-white py-10 px-8 lg:px-16">
        <div className="mx-auto max-w-7xl flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#2D5540] flex items-center justify-center">
              <span className="font-extrabold text-xs">G</span>
            </div>
            <p className="text-xs font-bold tracking-widest text-white/50 uppercase">
              © 2026 GENED. ALL RIGHTS RESERVED.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-bold tracking-wider text-white/50 uppercase">
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Help
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
