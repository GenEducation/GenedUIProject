"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

interface SignUpData {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role: "student" | "parent" | "partner";
  age?: string;
  grade?: string;
  school_board?: string;
  phone?: string;
  organization?: string;
  website?: string;
}

interface SignUpProps {
  signupData: SignUpData;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchToSignin: () => void;
  isSubmitting: boolean;
  errors: Record<string, string>;
  onGoogleSuccess: (token: string) => void;
}

// Shared input class builder
const inputCls = (hasError: boolean) =>
  `w-full rounded-xl border ${
    hasError
      ? "border-rose-400 bg-rose-50/30"
      : "border-[#042e5c]/15 bg-white/70"
  } px-5 py-3.5 text-sm text-[#0E1F2B] transition-all duration-200 placeholder:text-[#0E1F2B]/25 hover:border-[#059F6D]/40 focus:border-[#059F6D] focus:outline-none focus:ring-2 focus:ring-[#059F6D]/15`;

const labelCls =
  "block text-[9px] font-bold uppercase tracking-[0.28em] text-[#042e5c]/45 mb-2.5 pl-0.5";

const errorCls =
  "text-rose-500 text-[10px] font-semibold mt-1.5 ml-0.5 italic animate-in fade-in slide-in-from-top-1";

export function SignUp({
  signupData,
  onChange,
  onSubmit,
  onSwitchToSignin,
  isSubmitting,
  errors,
  onGoogleSuccess,
}: SignUpProps) {
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const isSignupEnabled = process.env.NEXT_PUBLIC_ENABLE_SIGNUP !== "false";

  // ── Signup disabled state ──────────────────────────────────────────────────
  if (!isSignupEnabled) {
    return (
      <div className="rounded-2xl border border-[#042e5c]/10 bg-white/80 backdrop-blur-xl p-8 sm:p-10 shadow-[0_8px_40px_rgba(4,46,92,0.07)] text-center py-20 flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-[#059F6D]/8 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-10 h-10 text-[#059F6D]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-extrabold text-[#042e5c] mb-4 font-serif">
          <em>Registration</em> Restricted
        </h3>
        <p className="text-[#2D3E51]/60 text-sm font-medium leading-relaxed max-w-xs mb-10">
          This page is not for public access currently. Please contact us at{" "}
          <a
            href="mailto:support@geneducation.ai"
            className="text-[#059F6D] font-bold hover:underline"
          >
            support@geneducation.ai
          </a>
        </p>
        <button
          type="button"
          onClick={onSwitchToSignin}
          className="group flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white border border-[#042e5c]/12 text-[#042e5c] text-sm font-bold shadow-sm transition-all hover:border-[#059F6D]/30 hover:text-[#059F6D] active:scale-[0.98]"
        >
          <svg
            className="w-4 h-4 transition-transform group-hover:-translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Login
        </button>
      </div>
    );
  }

  // ── Full signup form ───────────────────────────────────────────────────────
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-8 rounded-2xl border border-[#042e5c]/10 bg-white/80 backdrop-blur-xl p-8 sm:p-10 shadow-[0_8px_40px_rgba(4,46,92,0.07)]"
    >
      <div className="space-y-5">
        {!googleToken && (
          <>
            <div className="flex justify-center w-full">
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  if (credentialResponse.credential) {
                    setGoogleToken(credentialResponse.credential);
                    onGoogleSuccess(credentialResponse.credential);
                  }
                }}
                onError={() => {
                  console.error("Google Sign-up Failed");
                }}
                width="320"
                theme="outline"
                text="signup_with"
                shape="rectangular"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-400 font-medium uppercase tracking-widest">Or continue with</span>
              </div>
            </div>
          </>
        )}

        {googleToken && (
          <div className="p-4 bg-[#059F6D]/8 border border-[#059F6D]/20 rounded-xl mb-4">
            <p className="text-sm font-semibold text-[#047a54] text-center">
              Google Authentication successful! Please complete your profile below.
            </p>
          </div>
        )}

        {/* Username */}
        {!googleToken && (
          <div>
            <label className={labelCls}>Username</label>
            <input
              name="username"
              value={signupData.username}
              onChange={onChange}
              type="text"
              placeholder="Your name"
              className={inputCls(!!errors.username)}
            />
            {errors.username && <p className={errorCls}>{errors.username}</p>}
          </div>
        )}

        {/* Role selector */}
        <div>
          <label className={labelCls}>Role</label>
          <select
            name="role"
            value={signupData.role}
            onChange={onChange}
            className="w-full rounded-xl border border-[#042e5c]/15 bg-white/70 px-5 py-3.5 text-sm text-[#0E1F2B] transition-all duration-200 outline-none hover:border-[#059F6D]/40 focus:border-[#059F6D] focus:ring-2 focus:ring-[#059F6D]/15"
          >
            <option value="student">Student</option>
            <option value="parent">Parent</option>
            <option value="partner">Partner</option>
          </select>
        </div>

        {/* Student-specific fields */}
        {signupData.role === "student" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Age</label>
                <input
                  name="age"
                  value={signupData.age || ""}
                  onChange={onChange}
                  type="number"
                  placeholder="e.g. 14"
                  className={inputCls(!!errors.age)}
                />
                {errors.age && <p className={errorCls}>{errors.age}</p>}
              </div>
              <div>
                <label className={labelCls}>Grade</label>
                <input
                  name="grade"
                  value={signupData.grade || ""}
                  onChange={onChange}
                  type="number"
                  placeholder="e.g. 8"
                  className={inputCls(!!errors.grade)}
                />
                {errors.grade && <p className={errorCls}>{errors.grade}</p>}
              </div>
            </div>

            <div>
              <label className={labelCls}>School Board</label>
              <input
                name="school_board"
                value={signupData.school_board || ""}
                onChange={onChange}
                type="text"
                placeholder="e.g. CBSE, State Board"
                className={inputCls(!!errors.school_board)}
              />
              {errors.school_board && (
                <p className={errorCls}>{errors.school_board}</p>
              )}
            </div>
          </>
        )}

        {/* Parent-specific fields */}
        {signupData.role === "parent" && (
          <div>
            <label className={labelCls}>Phone Number</label>
            <input
              name="phone"
              value={signupData.phone || ""}
              onChange={onChange}
              type="tel"
              placeholder="e.g. +1 234 567 8900"
              className={inputCls(!!errors.phone)}
            />
            {errors.phone && <p className={errorCls}>{errors.phone}</p>}
          </div>
        )}

        {/* Partner-specific fields */}
        {signupData.role === "partner" && (
          <>
            <div>
              <label className={labelCls}>Organization</label>
              <input
                name="organization"
                value={signupData.organization || ""}
                onChange={onChange}
                type="text"
                placeholder="e.g. ABC School"
                className={inputCls(!!errors.organization)}
              />
              {errors.organization && (
                <p className={errorCls}>{errors.organization}</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Website (Optional)</label>
              <input
                name="website"
                value={signupData.website || ""}
                onChange={onChange}
                type="url"
                placeholder="e.g. https://example.com"
                className={inputCls(false)}
              />
            </div>
          </>
        )}

        {/* Email */}
        {!googleToken && (
          <div>
            <label className={labelCls}>Email Address</label>
            <input
              name="email"
              value={signupData.email}
              onChange={onChange}
              type="email"
              placeholder="scholar@gened.edu"
              className={inputCls(!!errors.email)}
            />
            {errors.email && <p className={errorCls}>{errors.email}</p>}
          </div>
        )}

        {/* Password */}
        {!googleToken && (
          <div>
            <label className={labelCls}>Password</label>
            <input
              name="password"
              value={signupData.password}
              onChange={onChange}
              type="password"
              placeholder="••••••••"
              className={`${inputCls(!!errors.password)} font-mono tracking-widest`}
            />
            {errors.password && <p className={errorCls}>{errors.password}</p>}
          </div>
        )}

        {/* Confirm Password */}
        {!googleToken && (
          <div>
            <label className={labelCls}>Confirm Password</label>
            <input
              name="confirmPassword"
              value={signupData.confirmPassword || ""}
              onChange={onChange}
              type="password"
              placeholder="••••••••"
              className={`${inputCls(!!errors.confirmPassword)} font-mono tracking-widest`}
            />
            {errors.confirmPassword && (
              <p className={errorCls}>{errors.confirmPassword}</p>
            )}
          </div>
        )}
      </div>

      {/* Root error */}
      {errors.root && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 animate-in fade-in slide-in-from-top-2">
          {errors.root}
        </div>
      )}

      <div className="space-y-6 pt-2">
        {/* Liquid Emerald submit button — matches SignIn */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="group relative w-full overflow-hidden rounded-xl bg-[#059F6D] py-4 text-sm font-bold text-white transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100 shadow-lg shadow-[#059F6D]/20 hover:shadow-xl hover:shadow-[#059F6D]/40"
        >
          <span className="relative z-10">
            {isSubmitting ? "Forging credentials…" : "Create Account"}
          </span>
        </button>

        <div className="text-center text-sm font-medium text-[#2D3E51]/60">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignin}
            className="font-bold text-[#059F6D] hover:text-[#047a54] hover:underline transition-colors"
          >
            Log in
          </button>
        </div>
      </div>
    </form>
  );
}
