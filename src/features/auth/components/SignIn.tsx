"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { GoogleAuthButton } from "./GoogleAuthButton";

interface SignInProps {
  loginData: {
    username: string;
    password: string;
  };
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchToSignup: () => void;
  isSigningIn: boolean;
  errors: Record<string, string>;
  onGoogleSuccess: (token: string) => void;
}

export function SignIn({
  loginData,
  onChange,
  onSubmit,
  onSwitchToSignup,
  isSigningIn,
  errors,
  onGoogleSuccess,
}: SignInProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Username field */}
      <div>
        <label className="block text-[9px] font-bold uppercase tracking-[0.28em] text-[#042e5c]/45 mb-2 pl-0.5">
          Username
        </label>
        <input
          name="username"
          value={loginData.username}
          onChange={onChange}
          type="text"
          placeholder="Enter your username"
          className={`w-full rounded-xl border ${
            errors.username
              ? "border-rose-400 bg-rose-50/30"
              : "border-[#042e5c]/15 bg-white/70"
          } px-5 py-3.5 text-sm text-[#0E1F2B] transition-all duration-200 placeholder:text-[#0E1F2B]/25 hover:border-[#059F6D]/40 focus:border-[#059F6D] focus:outline-none focus:ring-2 focus:ring-[#059F6D]/15`}
        />
        {errors.username && (
          <p className="text-rose-500 text-[10px] font-semibold mt-1.5 ml-0.5 italic animate-in fade-in slide-in-from-top-1">
            {errors.username}
          </p>
        )}
      </div>

      {/* Password field */}
      <div>
        <div className="flex items-center justify-between mb-2 pr-1">
          <label className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#042e5c]/45">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-[10px] font-semibold text-[#059F6D] hover:text-[#047a54] hover:underline transition-colors tracking-wide"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            name="password"
            value={loginData.password}
            onChange={onChange}
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            className={`w-full rounded-xl border ${
              errors.password
                ? "border-rose-400 bg-rose-50/30"
                : "border-[#042e5c]/15 bg-white/70"
            } px-5 py-3.5 text-sm text-[#0E1F2B] transition-all duration-200 placeholder:text-[#0E1F2B]/25 hover:border-[#059F6D]/40 focus:border-[#059F6D] focus:outline-none focus:ring-2 focus:ring-[#059F6D]/15`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#042e5c]/30 hover:text-[#059F6D] transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-rose-500 text-[10px] font-semibold mt-1.5 ml-0.5 italic animate-in fade-in slide-in-from-top-1">
            {errors.password}
          </p>
        )}
      </div>

      {/* Remember session */}
      <div className="flex items-center gap-3 pl-0.5">
        <input
          id="remember"
          type="checkbox"
          className="h-4 w-4 rounded border-[#042e5c]/20 accent-[#059F6D] focus:ring-[#059F6D]/60 cursor-pointer transition-all"
        />
        <label
          htmlFor="remember"
          className="text-sm font-medium text-[#2D3E51]/60 cursor-pointer select-none"
        >
          Remember this session
        </label>
      </div>

      {/* Root error */}
      {errors.root ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-5 py-3.5 text-sm font-medium text-rose-700 animate-in fade-in slide-in-from-top-2">
          {errors.root}
        </div>
      ) : null}

      {/* Liquid Emerald CTA button */}
      <button
        type="submit"
        disabled={isSigningIn}
        className="group relative w-full overflow-hidden rounded-xl bg-[#059F6D] py-3.5 text-sm font-bold text-white transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100 shadow-lg shadow-[#059F6D]/20 hover:shadow-xl hover:shadow-[#059F6D]/40"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isSigningIn ? "Signing in…" : "Continue to GenEd"}
        </span>
      </button>

      {/* Divider — no opaque fill, the card surface is translucent */}
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[#042e5c]/10" />
        <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#042e5c]/35">
          or
        </span>
        <span className="h-px flex-1 bg-[#042e5c]/10" />
      </div>

      <GoogleAuthButton onSuccess={onGoogleSuccess} />

      <div className="text-center text-sm font-medium text-[#2D3E51]/60">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="font-bold text-[#059F6D] hover:text-[#047a54] hover:underline transition-colors"
        >
          Sign up
        </button>
      </div>
    </form>
  );
}
